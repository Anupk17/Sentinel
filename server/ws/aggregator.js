// /server/ws/aggregator.js

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']

// ─── Per-asset state ─────────────────────────────────────────────────────────
const state = {}
SYMBOLS.forEach(s => {
  state[s] = {
    markPrice: 0,
    fundingRate: 0,
    fundingHistory: [],        // last 56 readings for z-score
    liqEvents: [],             // rolling 60s window
    klineCache: [],            // last 60 closed candles
    currentCandle: null,       // live updating candle
    oiHistory: [],             // last 6 OI readings
    takerBuyVolume: 0,         // 30s rolling
    takerSellVolume: 0,        // 30s rolling
    lastTradeFlush: Date.now()
  }
})

// ─── Handlers called by binance.js streams ───────────────────────────────────

function onMarkPrice({ symbol, markPrice, fundingRate }) {
  if (!state[symbol]) return
  const s = state[symbol]
  s.markPrice = markPrice
  s.fundingRate = fundingRate

  // Update funding history (max 56 entries — 56 × 8h = ~19 days)
  const now = Date.now()
  s.fundingHistory.push({ rate: fundingRate, time: now })
  if (s.fundingHistory.length > 56) s.fundingHistory.shift()

  // Update current candle high/low/close in real-time
  if (s.currentCandle) {
    s.currentCandle.high = Math.max(s.currentCandle.high, markPrice)
    s.currentCandle.low = Math.min(s.currentCandle.low, markPrice)
    s.currentCandle.close = markPrice
  } else {
    // Initialize current candle
    const minuteTime = Math.floor(now / 60000) * 60
    s.currentCandle = {
      time: minuteTime,
      open: markPrice,
      high: markPrice,
      low: markPrice,
      close: markPrice
    }
  }

  // console.log(`[PRICE] ${symbol}: $${markPrice.toFixed(2)} | Funding: ${(fundingRate*100).toFixed(4)}%`)
}

function onKline({ symbol, time, open, high, low, close, volume, isFinal }) {
  if (!state[symbol]) return
  const s = state[symbol]

  // Update current candle with official kline data
  s.currentCandle = { time, open, high, low, close }

  if (isFinal) {
    // Candle closed — add to cache
    s.klineCache.push({ time, open, high, low, close, volume })
    if (s.klineCache.length > 120) s.klineCache.shift()  // keep 2 hours
    // Reset current candle
    s.currentCandle = null
    console.log(`[KLINE] ${symbol} candle closed: $${close.toFixed(2)}`)
  }
}

function onAggTrade({ symbol, price, qty, isBuyerMaker }) {
  if (!state[symbol]) return
  const s = state[symbol]
  const usdVol = price * qty

  if (isBuyerMaker) {
    // Seller is taker → sell volume
    s.takerSellVolume += usdVol
  } else {
    // Buyer is taker → buy volume
    s.takerBuyVolume += usdVol
  }

  // NOTE: No simulated liquidations here — liq data comes exclusively from the
  // real Binance forceOrder stream (onForceOrder). Simulating from aggTrade
  // caused extremely noisy / unrealistic liq values updating every second.

  // Flush every 30 seconds to compute order flow imbalance
  if (Date.now() - s.lastTradeFlush > 30000) {
    const total = s.takerBuyVolume + s.takerSellVolume
    s.orderFlowImbalance = total > 0 ? (s.takerBuyVolume / total) * 100 : 50
    s.takerBuyVolume = 0
    s.takerSellVolume = 0
    s.lastTradeFlush = Date.now()
  }
}

function onForceOrder({ symbol, side, price, qty, usdValue, timestamp }) {
  // Only track known symbols
  const sym = SYMBOLS.find(s => s === symbol)
  if (!sym) return

  const event = { symbol, side, price, qty, usdValue, timestamp }
  state[sym].liqEvents.push(event)

  // Remove events older than 60 seconds
  const cutoff = Date.now() - 60000
  state[sym].liqEvents = state[sym].liqEvents.filter(e => e.timestamp > cutoff)

  console.log(`[LIQ] ${symbol} ${side} ${qty.toFixed(3)} @ $${price.toFixed(2)} = $${(usdValue/1000).toFixed(1)}k`)
}

// ─── Compute metrics for a symbol ────────────────────────────────────────────

function computeMetrics(symbol) {
  const s = state[symbol]
  if (!s) return null

  // Liquidation metrics (60s window)
  const liqCount60s = s.liqEvents.length
  const liqUSD60s = s.liqEvents.reduce((sum, e) => sum + e.usdValue, 0)

  // Price change (vs 5 min ago)
  const priceChangePct = computePriceChange(s)

  // Funding rate z-score
  const fundingRateZScore = computeZScore(s.fundingHistory.map(f => f.rate), s.fundingRate)

  // OI delta
  const oiChangePct = computeOIDelta(s)

  // Order flow imbalance (default 50% if no trades yet)
  const orderFlowImbalance = s.orderFlowImbalance ?? 50

  // Long/short ratio (default 1.0 if not fetched yet)
  const longShortRatio = s.longShortRatio ?? 1.0

  // FCSS formula (weighted sum, 0-100)
  const FCSS = computeFCSS({
    liqCount60s, priceChangePct, fundingRateZScore,
    oiChangePct, orderFlowImbalance
  })

  return {
    markPrice: s.markPrice,
    fundingRate: s.fundingRate,
    fundingRateZScore,
    liqCount60s,
    liqUSD60s,
    priceChangePct,
    oiChangePct,
    orderFlowImbalance,
    longShortRatio,
    FCSS,
    currentCandle: s.currentCandle,
    klineCacheLength: s.klineCache.length
  }
}

function computePriceChange(s) {
  if (s.klineCache.length < 5) return 0
  const current = s.markPrice || s.klineCache.at(-1)?.close || 0
  const fiveMin = s.klineCache.at(-5)?.open || current
  if (!fiveMin || fiveMin === 0) return 0
  return ((current - fiveMin) / fiveMin) * 100
}

function computeZScore(history, current) {
  if (history.length < 10) return 0
  const mean = history.reduce((a, b) => a + b, 0) / history.length
  const variance = history.reduce((a, b) => a + (b - mean) ** 2, 0) / history.length
  const std = Math.sqrt(variance)
  if (std === 0) return 0
  return (current - mean) / std
}

function computeOIDelta(s) {
  if (s.oiHistory.length < 2) return 0
  const latest = s.oiHistory.at(-1)
  const prev = s.oiHistory.at(-6) || s.oiHistory[0]
  if (!prev || prev === 0) return 0
  return ((latest - prev) / prev) * 100
}

function computeFCSS({ liqCount60s, priceChangePct, fundingRateZScore, oiChangePct, orderFlowImbalance }) {
  const score =
    Math.min(35, Math.abs(priceChangePct) * 8) +
    Math.min(25, (liqCount60s / 100) * 25) +
    Math.min(20, Math.abs(fundingRateZScore) / 3 * 20) +
    Math.min(10, Math.abs(Math.min(0, oiChangePct)) * 4) +
    Math.min(10, Math.abs(orderFlowImbalance - 50) / 50 * 10)
  return Math.round(Math.min(100, Math.max(0, score)))
}

// ─── OI polling (called from REST poller) ───────────────────────────────────
function updateOI(symbol, oiValue) {
  if (!state[symbol]) return
  state[symbol].oiHistory.push(oiValue)
  if (state[symbol].oiHistory.length > 12) state[symbol].oiHistory.shift()
}

function updateLongShortRatio(symbol, ratio) {
  if (!state[symbol]) return
  state[symbol].longShortRatio = ratio
}

// ─── Getters ─────────────────────────────────────────────────────────────────
function getKlineCache(symbol) {
  return state[symbol]?.klineCache || []
}

function getAllMetrics() {
  const result = {}
  SYMBOLS.forEach(s => { result[s] = computeMetrics(s) })
  return result
}

module.exports = {
  onMarkPrice,
  onKline,
  onAggTrade,
  onForceOrder,
  updateOI,
  updateLongShortRatio,
  getKlineCache,
  getAllMetrics,
  state
}

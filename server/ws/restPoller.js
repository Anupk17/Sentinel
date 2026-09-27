const fetch = require('node-fetch')
const aggregator = require('./aggregator')

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']
const BASE = 'https://fapi.binance.com'

async function fetchOI(symbol) {
  try {
    const r = await fetch(`${BASE}/fapi/v1/openInterest?symbol=${symbol}`)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const d = await r.json()
    const oi = parseFloat(d.openInterest)
    aggregator.updateOI(symbol, oi)
    // console.log(`[OI] ${symbol}: ${oi.toFixed(0)}`)
  } catch (e) {
    console.error(`[OI] Failed for ${symbol}:`, e.message)
  }
}

async function fetchLongShortRatio(symbol) {
  try {
    const url = `${BASE}/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=5m&limit=1`
    const r = await fetch(url)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const d = await r.json()
    if (d && d[0]) {
      const ratio = parseFloat(d[0].longShortRatio)
      aggregator.updateLongShortRatio(symbol, ratio)
      // console.log(`[L/S] ${symbol}: ${ratio.toFixed(4)}`)
    }
  } catch (e) {
    console.error(`[L/S] Failed for ${symbol}:`, e.message)
  }
}

async function fetchFundingHistory(symbol) {
  try {
    const url = `${BASE}/fapi/v1/fundingRate?symbol=${symbol}&limit=56`
    const r = await fetch(url)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const d = await r.json()
    if (d && d.length > 0 && aggregator.state[symbol]) {
      aggregator.state[symbol].fundingHistory = d.map(f => ({
        rate: parseFloat(f.fundingRate),
        time: f.fundingTime
      }))
      // console.log(`[FUNDING] ${symbol}: loaded ${d.length} historical rates`)
    }
  } catch (e) {
    console.error(`[FUNDING HISTORY] Failed for ${symbol}:`, e.message)
  }
}

// ─── Start all pollers ───────────────────────────────────────────────────────
function start() {
  // Fetch funding history once on startup for all symbols
  SYMBOLS.forEach(s => fetchFundingHistory(s))

  // Poll OI every 30 seconds
  const oiInterval = setInterval(() => {
    SYMBOLS.forEach(s => fetchOI(s))
  }, 30000)

  // Poll L/S ratio every 30 seconds
  const lsInterval = setInterval(() => {
    SYMBOLS.forEach(s => fetchLongShortRatio(s))
  }, 30000)

  // Initial fetch immediately
  SYMBOLS.forEach(s => { fetchOI(s); fetchLongShortRatio(s) })

  console.log('[REST POLLER] Started — OI + L/S polling every 30s')
  return { oiInterval, lsInterval }
}

module.exports = { start }

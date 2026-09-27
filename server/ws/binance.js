// /server/ws/binance.js
const WebSocket = require('ws')
const EventEmitter = require('events')

const emitter = new EventEmitter()
emitter.setMaxListeners(50)

// ─── Connection state ───────────────────────────────────────────────────────
const connectionStatus = {
  markPrice: false,
  kline: false,
  aggTrade: false,
  forceOrder: false
}

// ─── Reconnection helper ────────────────────────────────────────────────────
function createReconnectingWS(url, name, onMessage) {
  let ws = null
  let retryDelay = 1000
  let alive = true

  function connect() {
    console.log(`[WS] Connecting to ${name}: ${url}`)
    ws = new WebSocket(url, {
      handshakeTimeout: 10000,
      followRedirects: true
    })

    ws.on('open', () => {
      console.log(`[WS] ✓ Connected: ${name}`)
      connectionStatus[name] = true
      retryDelay = 1000
      emitter.emit('connection_status', { name, connected: true })
    })

    ws.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString())
        onMessage(parsed)
      } catch (e) {
        console.error(`[WS] Parse error on ${name}:`, e.message)
      }
    })

    ws.on('error', (err) => {
      console.error(`[WS] Error on ${name}:`, err.message)
      connectionStatus[name] = false
      emitter.emit('connection_status', { name, connected: false })
    })

    ws.on('close', (code, reason) => {
      console.warn(`[WS] Closed ${name}: code=${code} reason=${reason.toString()}`)
      connectionStatus[name] = false
      emitter.emit('connection_status', { name, connected: false })
      if (alive) {
        console.log(`[WS] Reconnecting ${name} in ${retryDelay}ms`)
        setTimeout(connect, retryDelay)
        retryDelay = Math.min(retryDelay * 2, 30000)
      }
    })

    // Send pong on ping to keep connection alive
    ws.on('ping', () => {
      ws.pong()
      console.log(`[WS] Pong sent to ${name}`)
    })
  }

  connect()
  return { stop: () => { alive = false; ws?.close() } }
}

// ─── Stream 1: Mark Price for BTC, ETH, SOL (combined stream) ──────────────
// NOTE: Using the combined stream format with /stream?streams=
function startMarkPriceStream(onData) {
  const streams = [
    'btcusdt@ticker',
    'ethusdt@ticker',
    'solusdt@ticker'
  ].join('/')

  const url = `wss://stream.binance.com:9443/stream?streams=${streams}`

  return createReconnectingWS(url, 'markPrice', (msg) => {
    // Spot ticker wraps data
    const data = msg.data || msg
    if (data && data.e === '24hrTicker') {
      onData({
        symbol: data.s,
        markPrice: parseFloat(data.c),
        indexPrice: parseFloat(data.c),
        fundingRate: 0,
        nextFundingTime: 0,
        timestamp: data.E
      })
    }
  })
}

// ─── Stream 2: Klines 1m for BTC, ETH, SOL ─────────────────────────────────
function startKlineStream(onData) {
  const streams = [
    'btcusdt@kline_1s',
    'ethusdt@kline_1s',
    'solusdt@kline_1s'
  ].join('/')
  const url = `wss://stream.binance.com:9443/stream?streams=${streams}`

  return createReconnectingWS(url, 'kline', (msg) => {
    const data = msg.data || msg
    if (data && data.e === 'kline') {
      const k = data.k
      onData({
        symbol: data.s,
        time: Math.floor(k.t / 1000),
        open: parseFloat(k.o),
        high: parseFloat(k.h),
        low: parseFloat(k.l),
        close: parseFloat(k.c),
        volume: parseFloat(k.v),
        isFinal: k.x
      })
    }
  })
}

// ─── Stream 3: Agg Trades for order flow (BTC only for now) ─────────────────
function startAggTradeStream(onData) {
  const streams = [
    'btcusdt@aggTrade',
    'ethusdt@aggTrade',
    'solusdt@aggTrade'
  ].join('/')
  const url = `wss://stream.binance.com:9443/stream?streams=${streams}`

  return createReconnectingWS(url, 'aggTrade', (msg) => {
    const data = msg.data || msg
    if (data && data.e === 'aggTrade') {
      onData({
        symbol: data.s,
        price: parseFloat(data.p),
        qty: parseFloat(data.q),
        isBuyerMaker: data.m,  // true = seller, false = buyer
        timestamp: data.T
      })
    }
  })
}

// ─── Stream 4: Force Orders (liquidations) — all symbols ────────────────────
function startForceOrderStream(onData) {
  // forceOrder@arr is a special stream — use singular /ws/ endpoint
  const url = 'wss://fstream.binance.com/ws/!forceOrder@arr'

  return createReconnectingWS(url, 'forceOrder', (msg) => {
    // forceOrder stream sends: { e: "forceOrder", o: { s, S, p, q, ... } }
    if (msg.e === 'forceOrder' && msg.o) {
      const o = msg.o
      const price = parseFloat(o.p)
      const qty = parseFloat(o.q)
      const usdValue = price * qty
      onData({
        symbol: o.s,
        side: o.S,        // "BUY" (short liq) or "SELL" (long liq)
        price: price,
        qty: qty,
        usdValue: usdValue,
        timestamp: o.T || Date.now()
      })
    }
  })
}

module.exports = {
  emitter,
  connectionStatus,
  startMarkPriceStream,
  startKlineStream,
  startAggTradeStream,
  startForceOrderStream
}

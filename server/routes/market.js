const express = require('express');
const router = express.Router();
const aggregator = require('../ws/aggregator');

// GET /api/market/klines?symbol=BTCUSDT&limit=60
router.get('/klines', (req, res) => {
  const symbol = (req.query.symbol || 'BTCUSDT').toUpperCase()
  const limit = Math.min(120, parseInt(req.query.limit) || 60)
  const cache = aggregator.getKlineCache(symbol)
  const klines = cache.slice(-limit)
  
  // console.log(`[API] /klines ${symbol}: returning ${klines.length} candles`)
  
  if (klines.length === 0) {
    return res.json({
      symbol,
      candles: [],
      message: 'No candles cached yet. Waiting for WebSocket data.'
    })
  }
  
  res.json({ symbol, candles: klines })
})

// GET /api/market/history?symbol=BTCUSDT
router.get('/history', async (req, res) => {
  const symbol = (req.query.symbol || 'BTCUSDT').toUpperCase();
  const limit = Math.min(1000, parseInt(req.query.limit) || 120);
  const interval = req.query.interval || '1s';
  
  try {
    const fetch = (await import('node-fetch')).default;
    const url = interval === '1s'
      ? `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1s&limit=${limit}`
      : `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      return res.status(500).json({ error: 'Binance API error', details: data });
    }
    
    const candles = data.map(k => ({
      time: Math.floor(k[0] / 1000), // Open time in seconds
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5])
    }));
    
    // Also seed the aggregator cache if it's empty to bootstrap it quickly
    const cache = aggregator.getKlineCache(symbol);
    if (cache.length === 0) {
      cache.push(...candles);
    }
    
    res.json({ symbol, candles });
  } catch (error) {
    console.error('[API] /history fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch historical data' });
  }
})

// GET /api/market/price?symbol=BTCUSDT
router.get('/price', (req, res) => {
  const symbol = (req.query.symbol || 'BTCUSDT').toUpperCase()
  const s = aggregator.state[symbol]
  res.json({
    symbol,
    markPrice: s?.markPrice || 0,
    fundingRate: s?.fundingRate || 0,
    timestamp: Date.now()
  })
})

module.exports = router;

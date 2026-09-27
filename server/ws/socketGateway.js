const { Server } = require('socket.io');
let io;

function initSocketGateway(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.join('ops');

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });

    socket.on('sim:pause', () => {
      console.log('[WS] Client triggered sim:pause');
      const { getActiveEngine } = require('../routes/simulation');
      const engine = getActiveEngine();
      if (engine) engine.pause();
    });

    socket.on('sim:resume', () => {
      console.log('[WS] Client triggered sim:resume');
      const { getActiveEngine } = require('../routes/simulation');
      const engine = getActiveEngine();
      if (engine) engine.resume();
    });

    socket.on('sim:speed', (s) => {
      console.log('[WS] Client set sim:speed to:', s);
      const { getActiveEngine } = require('../routes/simulation');
      const engine = getActiveEngine();
      if (engine) {
        engine.setSpeed(s);
      } else {
        console.warn('[WS] sim:speed received but activeEngine is null');
      }
    });

    socket.on('sim:reset', () => {
      console.log('[WS] Client triggered sim:reset');
      const { getActiveEngine } = require('../routes/simulation');
      const engine = getActiveEngine();
      if (engine) engine.reset();
    });
  });

  const aggregator = require('./aggregator');
  const mlInference = require('../ml/inference');
  const binance = require('./binance');

  // Broadcast liquidations directly from binance stream if needed, or rely on aggregator.
  // Actually, we can listen to binance.emitter if needed.
  binance.emitter.on('liquidation', (liq) => {
    // Normalise: client store expects liq.value, binance stream sends liq.usdValue
    const normalised = {
      ...liq,
      value:    liq.usdValue || liq.value || 0,
      quantity: liq.qty      || liq.quantity || 0,
    };
    io.to('ops').emit('liquidation', normalised);
  });

  binance.emitter.on('kline', (kline) => {
    io.to('ops').emit('kline_btc', kline);
    io.to('ops').emit('kline', kline);
  });

  // Track FCSS calm duration for auto-suggest incident close
  let calmSince = null;

  // startMetricsLoop
  setInterval(async () => {
    const metrics = aggregator.getAllMetrics()

    // Evaluate thresholds with new metrics
    const thresholdEngine = require('../alerts/thresholdEngine');
    thresholdEngine.evaluateThresholds({ assets: metrics });

    // Run ML inference on BTC metrics (primary asset)
    let mlResults = {}
    try {
      mlResults = await mlInference.runAllAssets(metrics)
    } catch (e) {
      console.error('[ML] Inference error:', e.message)
    }

    // Only emit if we have real data (not all zeros)
    const hasRealData = Object.values(metrics).some(m => m && m.markPrice > 0)
    if (!hasRealData) {
      // console.warn('[GATEWAY] No real market data yet — skipping emit')
      return
    }

    const payload = {
      ts: Date.now(),
      assets: metrics,
      sentiment: require('../signals/sentiment').getSentiment(),
      supportTickets: require('../signals/supportTickets').computeTickets({ assets: metrics }),
      ml: {
        BTCUSDT: mlResults.BTCUSDT,
        ETHUSDT: mlResults.ETHUSDT,
        SOLUSDT: mlResults.SOLUSDT,
        primary: mlResults.BTCUSDT
      }
    }

    io.to('ops').emit('metrics', payload)

    // FCSS calm auto-suggest: if FCSS < 31 for 5+ minutes, suggest closing open incident
    const btcFCSS = metrics.BTCUSDT?.FCSS || 0;
    const ethFCSS = metrics.ETHUSDT?.FCSS || 0;
    const solFCSS = metrics.SOLUSDT?.FCSS || 0;
    const maxFCSS = Math.max(btcFCSS, ethFCSS, solFCSS);
    if (maxFCSS < 31) {
      if (!calmSince) calmSince = Date.now();
      if (Date.now() - calmSince > 300000) {
        io.to('ops').emit('suggest_incident_close', {
          reason: 'FCSS has been CALM for 5+ minutes',
          fcss: maxFCSS
        });
      }
    } else {
      calmSince = null;
    }

    // Also emit price_tick for instant price updates
    Object.entries(metrics).forEach(([symbol, m]) => {
      if (m && m.markPrice > 0) {
        io.to('ops').emit('price_tick', {
          symbol,
          markPrice: m.markPrice,
          FCSS: m.FCSS
        })
      }
    })

  }, 1000)
}

function broadcastAlert(alert) {
  if (io) {
    io.to('ops').emit('alert', alert);
  }

  // Ping Telegram
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID && alert.source !== 'SIMULATION') {
    const icon = alert.severity === 'CRITICAL' ? '🚨' : '⚠️';
    fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: `${icon} <b>${alert.title}</b>\n\n${alert.body}${alert.assetLabel ? `\nAsset: ${alert.assetLabel}` : ''}`,
        parse_mode: 'HTML'
      })
    }).catch(err => console.error('[TELEGRAM] Error sending alert:', err.message));
  }
}

function getIO() {
  return io;
}

module.exports = {
  initSocketGateway,
  broadcastAlert,
  getIO
};

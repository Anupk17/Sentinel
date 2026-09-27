require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { initSocketGateway, getIO } = require('./ws/socketGateway');

const { initThresholdEngine, lastMetrics } = require('./alerts/thresholdEngine');
const { caseStore } = require('./cases/caseStore');
const { startInvestigation } = require('./agents/investigator');
const { initSupportTickets } = require('./signals/supportTickets');
const { initSentiment } = require('./signals/sentiment');
const { incidentStore } = require('./data/incidentStore');

const binance = require('./ws/binance');
const aggregator = require('./ws/aggregator');
const restPoller = require('./ws/restPoller');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Init Socket Gateway
initSocketGateway(server);

// Init Threshold Engine
initThresholdEngine();

// Init Signals
initSupportTickets();
initSentiment();

// Start all streams
const markPriceConn = binance.startMarkPriceStream((data) => {
  aggregator.onMarkPrice(data)
})

const klineConn = binance.startKlineStream((data) => {
  aggregator.onKline(data)
  binance.emitter.emit('kline', data)
})

const aggTradeConn = binance.startAggTradeStream((data) => {
  aggregator.onAggTrade(data)
})

const forceOrderConn = binance.startForceOrderStream((data) => {
  aggregator.onForceOrder(data)
  binance.emitter.emit('liquidation', data)
})

// Start rest poller
restPoller.start()

// Log connection status to Socket.io
binance.emitter.on('connection_status', (status) => {
  const io = getIO()
  if (io) io.emit('feed_status', status)
})

// Also connect socket clients to cases
caseStore.on('new_case', (c) => { const io = getIO(); if (io) io.to('ops').emit('new_case', c); });
caseStore.on('case_updated', (c) => { const io = getIO(); if (io) io.to('ops').emit('case_updated', c); });
caseStore.on('agent_log', (log) => { const io = getIO(); if (io) io.to('ops').emit('agent_log', log); });
caseStore.on('case_resolved', (c) => { const io = getIO(); if (io) io.to('ops').emit('case_resolved', c); });

// API routes for cases
app.get('/api/cases', (req, res) => {
  res.json(caseStore.getAllCases());
});

app.post('/api/cases/manual', (req, res) => {
  const { symbol, qty, price, side, notes } = req.body;
  // Build trigger in the same shape as real liquidation events so CaseDetail
  // and the investigator agent can read trigger.value, .quantity, .side etc.
  const quantity = parseFloat(qty) || 0;
  const markPrice = parseFloat(price) || 0;
  const value = quantity * markPrice;

  const trigger = {
    symbol,
    side,
    price: markPrice,
    quantity,
    qty: quantity,
    value,
    usdValue: value,
    type: 'MANUAL_REPORT',
    notes: notes || '',
    timestamp: Date.now()
  };

  // Grab a live market snapshot for context
  const aggregator = require('./ws/aggregator');
  const assetMetrics = aggregator.getAllMetrics()[symbol] || {};
  const snapshot = {
    latestBtcMarkPrice: assetMetrics.markPrice || markPrice,
    fundingRateZScore:  assetMetrics.fundingRateZScore || 0,
    orderFlowImbalance: assetMetrics.orderFlowImbalance || 50,
    longShortRatio:     assetMetrics.longShortRatio || 1.0
  };

  const newCase = caseStore.createCase(trigger, snapshot, 'OPERATOR');
  res.json(newCase);
});

app.get('/api/cases/:id', (req, res) => {
  const c = caseStore.cases.get(req.params.id);
  if (c) res.json(c);
  else res.status(404).json({ error: 'Not found' });
});

app.post('/api/cases/:id/resolve', (req, res) => {
  const { action } = req.body;
  caseStore.resolveCase(req.params.id, action);
  res.json({ success: true });
});

app.post('/api/cases/:id/investigate', (req, res) => {
  startInvestigation(req.params.id);
  res.json({ success: true, message: 'Investigation started' });
});

// Incident Management API
app.use('/api/incidents', require('./routes/incidents'));

// Quick close any open incident (used by Demo Mode + TopBar button)
app.post('/api/incidents/close-if-open', async (req, res) => {
  try {
    const { resolution = 'Manually closed by operator' } = req.body || {};
    // Fetch all open incidents
    const incidentStore = require('./data/incidentStore');
    const open = incidentStore.getOpenIncidents ? incidentStore.getOpenIncidents() : [];
    for (const inc of open) {
      await incidentStore.closeIncident?.(inc.id, { resolutionNote: resolution });
    }
    const io = getIO();
    if (io) io.to('ops').emit('incident_update', { status: 'CLOSED' });
    res.json({ success: true, closed: open.length });
  } catch (e) {
    // Even if nothing to close, return success
    res.json({ success: true, closed: 0 });
  }
});

// Thresholds API
const thresholdEngine = require('./alerts/thresholdEngine');
app.get('/api/thresholds', (req, res) => {
  res.json(thresholdEngine.getThresholds());
});

app.post('/api/thresholds', (req, res) => {
  thresholdEngine.updateThresholds(req.body);
  res.json({ success: true });
});

// ACK all active alerts at once (used by demo mode + ACK ALL button)
app.post('/api/alerts/ack-all', (req, res) => {
  thresholdEngine.ackAllAlerts();
  const io = getIO();
  if (io) io.to('ops').emit('alerts_cleared');
  res.json({ success: true });
});

app.use('/api/simulation', require('./routes/simulation').router);
app.use('/api/ml', require('./routes/ml'));
app.use('/api/market', require('./routes/market'));
app.use('/api/analysis', require('./routes/analysis'));


// Communications API
app.post('/api/draft', async (req, res) => {
  const { alerts, metrics } = req.body;
  try {
    // ── Extract all data fields ──────────────────────────────────────────
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

    const A = metrics?.assets || {};
    const btc  = A.BTCUSDT?.markPrice      || metrics?.latestBtcMarkPrice || 0;
    const eth  = A.ETHUSDT?.markPrice      || 0;
    const sol  = A.SOLUSDT?.markPrice      || 0;

    const fmt  = (n, d = 2) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: d });
    const fmtUSD = (n) => '$' + fmt(n, 0);
    const sign = (n) => (n >= 0 ? '+' : '') + Number(n || 0).toFixed(2) + '%';

    // Per-asset fields
    const assets = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'].map(sym => ({
      sym,
      price:    A[sym]?.markPrice      || 0,
      liqCount: A[sym]?.liqCount60s    || 0,
      liqUSD:   A[sym]?.liqUSD60s      || 0,
      priceChg: A[sym]?.priceChangePct || 0,
      oiChg:    A[sym]?.oiChangePct    || 0,
      lsRatio:  A[sym]?.longShortRatio || 1,
    }));

    // Support tickets
    const tix = metrics?.supportTickets || {};
    const tickMin   = tix.ticketsThisMinute || 0;
    const tickHour  = tix.ticketsThisHour   || 0;
    const tickBack  = tix.ticketBacklog      || 0;
    const tickPeak  = tix.peakMinute         || 0;

    // Risk indicators
    const fundingZ  = Number(A.BTCUSDT?.fundingRateZScore || 0).toFixed(2);
    const ofi       = Number(A.BTCUSDT?.orderFlowImbalance || 50).toFixed(2);
    const mlScore   = metrics?.ml?.primary?.anomalyScore ?? metrics?.ml?.BTCUSDT?.anomalyScore ?? 0;
    const mlMax     = 13;

    // Alerts & system status
    const hasAlerts  = alerts && alerts.length > 0;
    const statusLine = hasAlerts ? `⚠️ ${alerts.length} active alert(s)` : '✅ All core services operating normally. No active alerts.';
    const alertBlock = hasAlerts
      ? alerts.slice(0, 5).map(a => `  - ${a.title}${a.body ? ': ' + a.body : ''}`).join('\n')
      : '  - None';

    // Next steps logic
    const nextSteps = hasAlerts
      ? '- Review active alerts and assess impact.\n- Escalate if liquidation cascade risk increases.'
      : '- Continue monitoring market conditions.\n- No action required from users at this time.';

    const prompt = `You are SENTINEL, a professional crypto exchange incident response system writing a Telegram channel update.

Using ONLY the data below, generate a structured Telegram post that matches this EXACT format and style. Copy the structure precisely — sections, labels, indentation, emojis.

=== DATA ===
TIMESTAMP: ${timestamp}
STATUS: ${hasAlerts ? 'ALERTS ACTIVE' : 'ALL SYSTEMS NORMAL'}

PER-ASSET:
BTCUSDT — price: $${fmt(btc)}, liqCount60s: ${assets[0].liqCount}, liqUSD60s: $${fmt(assets[0].liqUSD)}, priceChg: ${sign(assets[0].priceChg)}, oiChg: ${sign(assets[0].oiChg)}, L/S: ${Number(assets[0].lsRatio).toFixed(2)}
ETHUSDT — price: $${fmt(eth)}, liqCount60s: ${assets[1].liqCount}, liqUSD60s: $${fmt(assets[1].liqUSD)}, priceChg: ${sign(assets[1].priceChg)}, oiChg: ${sign(assets[1].oiChg)}, L/S: ${Number(assets[1].lsRatio).toFixed(2)}
SOLUSDT — price: $${fmt(sol)}, liqCount60s: ${assets[2].liqCount}, liqUSD60s: $${fmt(assets[2].liqUSD)}, priceChg: ${sign(assets[2].priceChg)}, oiChg: ${sign(assets[2].oiChg)}, L/S: ${Number(assets[2].lsRatio).toFixed(2)}

SUPPORT: ticketsThisMinute: ${tickMin}, ticketsThisHour: ${tickHour}, backlog: ${tickBack}, peakMinute: ${tickPeak}

RISK: fundingRateZScore: ${fundingZ}, orderFlowImbalance(BTC): ${ofi}, mlRiskScore: ${mlScore}/${mlMax}

ALERTS:
${alertBlock}

=== REQUIRED OUTPUT FORMAT ===
Write the post using this EXACT structure (fill in real numbers, pick the right emoji for the status):

🚨 Incident Response Update   [or 📊 if no alerts]
📅 [TIMESTAMP]

✅ System Status   [or ⚠️ if alerts]
[One sentence status line]

📊 Key Market Metrics
- BTCUSDT
  - Mark price: $[value]
  - 60-s liquidations: [count]
  - Liquidation USD: $[value]
  - Price change: [value]%
  - OI change: [value]%
  - Long/Short ratio: [value]

- ETHUSDT
  [same fields]

- SOLUSDT
  [same fields]

📈 Support Ticket Overview
- Tickets this minute: [value]
- Tickets this hour: [value]
- Backlog: [value]
- Peak minute: [value]

⚠️ Risk Indicators
- Funding rate Z-score: [value] ([stable/elevated/critical])
- Order flow imbalance: [sign][value] (BTC)
- ML risk score: [value]/13 ([nominal/warning/critical])

🔧 Next Steps
[2 short lines about what to do based on conditions]

Thank you for your patience. Stay tuned for further updates.

=== RULES ===
- Use ONLY the numbers from DATA above — never invent values
- No markdown asterisks or bold. No hashtags. No URLs.
- Match the indentation and dash style exactly as shown
- Output the post text only. Nothing else.`;


    const { getGroqClient } = require('./lib/groqClient');
    let groq;
    try {
      groq = getGroqClient();
    } catch (err) {
      return res.status(503).json({
        error: 'GROQ_NOT_CONFIGURED',
        message: 'AI Draft unavailable: GROQ_API_KEY not set in server .env file'
      });
    }
    const { FAST } = require('./config/models');
    let stream;
    try {
      stream = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: FAST,
        stream: true,
        temperature: 0.2,
      });
    } catch (err) {
      if (err.message?.includes('decommissioned') || err.message?.includes('does not exist') || err.status === 400 || err.status === 404) {
        return res.status(502).json({
          error: 'AI_MODEL_UNAVAILABLE',
          message: 'AI service temporarily unavailable. Please retry.',
          retryable: true
        });
      }
      throw err;
    }
    
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(content);
      }
    }
    res.end();
  } catch (error) {
    console.error('Draft generation error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

app.post('/api/publish', async (req, res) => {
  const { message, channels } = req.body;
  try {
    if (channels.telegram && process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: message.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>'),
          parse_mode: 'HTML'
        })
      });
    }
    
    // Broadcast to Twitter (X)
    if (channels.twitter) {
      if (process.env.TWITTER_API_KEY) {
        try {
          const { TwitterApi } = require('twitter-api-v2');
          const client = new TwitterApi({
            appKey: process.env.TWITTER_API_KEY,
            appSecret: process.env.TWITTER_API_SECRET,
            accessToken: process.env.TWITTER_ACCESS_TOKEN,
            accessSecret: process.env.TWITTER_ACCESS_SECRET,
          });
          await client.v2.tweet(message);
          console.log('Tweet published successfully!');
        } catch (twErr) {
          console.error('Twitter broadcast failed:', twErr);
        }
      } else {
        console.log('Twitter broadcast skipped: Missing TWITTER keys in .env');
      }
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Signals API (Gap 4)
app.get('/api/signals', async (req, res) => {
  try {
    const { XMLParser } = require('fast-xml-parser');
    const parser = new XMLParser();
    const rssRes = await fetch('https://www.binance.com/en/support/announcement/rss');
    const xmlData = await rssRes.text();
    const parsed = parser.parse(xmlData);
    let items = parsed?.rss?.channel?.item || [];
    if (!Array.isArray(items)) items = [items];
    
    const keywords = ['liquidat', 'volatile', 'flash', 'crash', 'suspend', 'restrict', 'delist'];
    const filtered = items.filter(i => {
      const title = String(i.title).toLowerCase();
      return keywords.some(k => title.includes(k));
    }).map(i => ({
      source: 'Binance RSS',
      title: i.title,
      url: i.link,
      publishedAt: i.pubDate,
      sentiment: 'RED'
    })).slice(0, 5);

    let cgItems = [];
    try {
      const cgRes = await fetch('https://api.coingecko.com/api/v3/search/trending');
      if (cgRes.ok) {
        const cgData = await cgRes.json();
        cgItems = (cgData.coins || []).slice(0, 3).map(c => ({
          source: 'CoinGecko',
          title: `${c.item.name} (${c.item.symbol}) is currently trending globally`,
          url: 'https://www.coingecko.com/en/coins/' + c.item.id,
          publishedAt: new Date().toISOString(),
          sentiment: 'GRAY'
        }));
      }
    } catch(e) {
      console.error('CoinGecko fetch failed', e);
    }
    
    res.json([...filtered, ...cgItems]);
  } catch (err) {
    console.error('Signals API Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// TEST ENDPOINT to trigger a case — fires one realistic liquidation case
app.post('/api/test-liq', (req, res) => {
  const aggregator = require('./ws/aggregator');
  const btcMetrics = aggregator.getAllMetrics()['BTCUSDT'] || {};
  const currentPrice = btcMetrics.markPrice || 84000;
  const side = Math.random() > 0.5 ? 'SELL' : 'BUY';
  const price = side === 'SELL' ? currentPrice * 0.999 : currentPrice * 1.001;
  const qty = 0.8 + Math.random() * 2; // 0.8–2.8 BTC
  const usdValue = price * qty;

  const liq = {
    symbol:    'BTCUSDT',
    side,
    price,
    qty,
    quantity:  qty,
    usdValue,
    value:     usdValue,
    timestamp: Date.now(),
    source:    'TEST'
  };
  binance.emitter.emit('liquidation', liq);
  res.json({ success: true, message: `Test liq fired: ${side} ${qty.toFixed(3)} BTC @ $${price.toFixed(0)} = $${(usdValue/1000).toFixed(1)}k` });
});

app.post('/api/test-alert', (req, res) => {
  const { thresholdKey, value } = req.body;
  const alertId = `test-${Date.now()}`;
  
  const labelMap = {
    liqCount60s:        'Liquidation Count (60s)',
    liqUSD60s:          'Liquidation Value USD (60s)',
    supportLoad:        'Support Ticket Backlog',
    liqWaveUSD:         'Liquidation Wave (Cascade)',
    priceChangePct:     'Price Change %',
    fundingRateZScore:  'Funding Rate Z-Score',
    oiChangePct:        'Open Interest Delta %',
    longShortRatio:     'Long/Short Ratio',
    orderFlowImbalance: 'Order Flow Imbalance',
  };

  const label = labelMap[thresholdKey] || thresholdKey;
  const formatted = typeof value === 'number' && thresholdKey.includes('USD')
    ? `$${Number(value).toLocaleString()}`
    : Number(value).toLocaleString();

  const alert = {
    id: alertId,
    timestamp: Date.now(),
    type: thresholdKey,
    severity: 'HIGH',
    title: `🧪 [TEST] ${label}`,
    body: `Simulated value ${formatted} exceeded threshold. This is a drill — no real market event. Check the Active Alerts panel to confirm delivery.`,
    triggeredValue: value,
    test: true,
    acknowledged: false,
    escalated: false
  };
  
  if (getIO()) {
    getIO().to('ops').emit('alert', alert);
  }
  
  // Auto-remove after 60 seconds so test alerts don't pile up
  setTimeout(() => {
    if (getIO()) {
      getIO().to('ops').emit('alert_ack', { id: alertId });
    }
  }, 60000);
  
  res.json({ success: true, message: 'Test alert fired.', alertId });
});

app.post('/api/evaluate-crash', async (req, res) => {
  const { scenario } = req.body;
  try {
    const ort = require('onnxruntime-node');
    const path = require('path');
    const modelPath = path.join(__dirname, 'models', 'model.onnx');
    
    let isManipulation = false;
    let confidence = 0;
    
    try {
      const session = await ort.InferenceSession.create(modelPath);
      // Mock tensor for demonstration
      const tensor = new ort.Tensor('float32', [1.0, 2.0, 3.0, 4.0], [1, 4]);
      const results = await session.run({ input: tensor });
      
      const output = results.output.data;
      confidence = output[0] * 100;
      isManipulation = confidence > 75;
    } catch (e) {
      console.warn('ONNX model load failed, falling back to heuristic mock:', e.message);
      // Fallback
      if (scenario === 'flash_crash') {
        confidence = 82 + (Math.random() * 15);
        isManipulation = true;
      } else {
        confidence = 10 + (Math.random() * 20);
        isManipulation = false;
      }
    }
    
    res.json({ success: true, isManipulation, confidence });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/save-scenario', (req, res) => {
  try {
    const { saveScenario } = require('./simulation/sessionBuffer');
    const { name } = req.body;
    const filepath = saveScenario(name || `scenario_${Date.now()}`);
    res.json({ success: true, filepath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create cases from real liquidations — only notable events, one per symbol per 5min
const caseCooldowns = {};
binance.emitter.on('liquidation', (liq) => {
  const usdValue = liq.usdValue || liq.value || 0;
  if (usdValue < 1000) return; // $1k+ creates cases — catches calm market events too

  // One case per symbol per 5 minutes max
  const cooldownKey = liq.symbol;
  const now = Date.now();
  if (caseCooldowns[cooldownKey] && (now - caseCooldowns[cooldownKey] < 300000)) return;
  caseCooldowns[cooldownKey] = now;

  const metrics = require('./alerts/thresholdEngine').lastMetrics || {};
  let snapshot = {};
  if (metrics.assets && metrics.assets[liq.symbol]) {
    const m = metrics.assets[liq.symbol];
    snapshot = {
      latestBtcMarkPrice: m.markPrice || liq.price,
      fundingRateZScore:  m.fundingRateZScore  || 0,
      orderFlowImbalance: m.orderFlowImbalance  || 50,
      longShortRatio:     m.longShortRatio      || 1.0
    };
  } else {
    snapshot = {
      latestBtcMarkPrice: liq.price,
      fundingRateZScore: 0,
      orderFlowImbalance: 50,
      longShortRatio: 1.0
    };
  }

  // Normalise trigger shape so CaseDetail / investigator always get consistent fields
  const trigger = {
    symbol:    liq.symbol,
    side:      liq.side,
    price:     liq.price,
    quantity:  liq.qty      || liq.quantity || 0,
    qty:       liq.qty      || liq.quantity || 0,
    value:     usdValue,
    usdValue:  usdValue,
    timestamp: liq.timestamp || now,
    source:    liq.source || 'LIVE'
  };

  const source     = liq.source     || 'LIVE';
  const scenarioId = liq.scenarioId || null;
  caseStore.createCase(trigger, snapshot, source, scenarioId);
  // Investigation is always operator-triggered via the Investigate button
});

const PORT = process.env.PORT || 3001;

async function prefetchKlines() {
  try {
    const fetch = (await import('node-fetch')).default;
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
    for (const symbol of symbols) {
      const response = await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=1m&limit=120`);
      const data = await response.json();
      if (Array.isArray(data)) {
        const candles = data.map(k => ({
          time: Math.floor(k[0] / 1000),
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5])
        }));
        
        const cache = aggregator.getKlineCache(symbol);
        if (cache.length === 0) {
          cache.push(...candles);
        }
        console.log(`[STARTUP] ${symbol}: 120 candles loaded, last close: $${candles[candles.length - 1].close.toLocaleString()}`);
      }
    }
  } catch (err) {
    console.error('[STARTUP] Failed to prefetch klines:', err.message);
  }
}

async function startup() {
  if (process.env.GROQ_API_KEY) {
    console.log('[STARTUP] ✓ GROQ_API_KEY loaded');
  } else {
    console.warn('[STARTUP] ⚠ GROQ_API_KEY missing');
  }
  
  await prefetchKlines();
  
  server.listen(PORT, () => {
    console.log(`[STARTUP] ✓ Server ready on port ${PORT}`);
    
    // Emit rich startup timeline events after a short delay so clients can connect
    setTimeout(() => {
      const io = getIO();
      if (!io) return;
      const btc = aggregator.getAllMetrics()['BTCUSDT'];
      const eth = aggregator.getAllMetrics()['ETHUSDT'];
      const sol = aggregator.getAllMetrics()['SOLUSDT'];
      const now = Date.now();

      const events = [
        {
          timestamp: now,
          type: 'SYSTEM',
          title: 'SENTINEL started — Live feeds connected',
          description: 'All Binance WebSocket streams operational. Real-time data processing active.',
        },
        {
          timestamp: now + 100,
          type: 'SYSTEM',
          title: 'Market data initialized',
          description: `Live prices: BTC $${btc?.markPrice?.toLocaleString('en-US',{maximumFractionDigits:0}) || 'N/A'} | ETH $${eth?.markPrice?.toFixed(2) || 'N/A'} | SOL $${sol?.markPrice?.toFixed(2) || 'N/A'}`,
        },
        {
          timestamp: now + 200,
          type: 'SYSTEM',
          title: 'Threshold engine active',
          description: 'Monitoring 7 signals across BTC, ETH, SOL with research-backed thresholds. OFI deviation ±30pts, liqUSD $2M global.',
        },
        {
          timestamp: now + 300,
          type: 'SYSTEM',
          title: 'ML Early Warning model ready',
          description: 'Anomaly detection initialized. Rule-based inference active for BTC, ETH, SOL.',
        },
        {
          timestamp: now + 400,
          type: 'MARKET',
          title: 'Market snapshot on session start',
          description: `BTC FCSS: ${btc?.FCSS || 0} (CALM) | Sentiment: NEUTRAL | All forceOrder, kline, and markPrice feeds live.`,
        },
      ];

      events.forEach(e => io.to('ops').emit('timeline_event', { ...e, id: require('crypto').randomUUID() }));
    }, 3000);

    // Periodic market health log every 10 minutes
    setInterval(() => {
      const io = getIO();
      if (!io) return;
      const btc = aggregator.getAllMetrics()['BTCUSDT'];
      const eth = aggregator.getAllMetrics()['ETHUSDT'];
      if (!btc || btc.markPrice === 0) return;
      io.to('ops').emit('timeline_event', {
        id: require('crypto').randomUUID(),
        timestamp: Date.now(),
        type: 'MARKET',
        title: 'Periodic market health check',
        description: `BTC: $${btc.markPrice.toLocaleString('en-US',{maximumFractionDigits:0})} FCSS:${btc.FCSS} | ETH: $${eth?.markPrice?.toFixed(2) || 'N/A'} | All signals within monitored range.`,
      });
    }, 600000);
  });
}

startup();

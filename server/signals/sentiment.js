const fetch = require('node-fetch');

let currentScore = 50;
let currentLabel = "NEUTRAL";
let recentHeadlines = [];
let trendingAssets = [];
let lastUpdated = Date.now();

// Keep track of previously processed IDs to avoid duplicate headlines
const processedArticleIds = new Set();

async function pollCoinGecko() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/search/trending');
    const data = await res.json();
    if (data && data.coins) {
      trendingAssets = data.coins.map(c => c.item.symbol.toUpperCase());
    }
  } catch (e) {
    console.error('Sentiment: CoinGecko poll failed', e);
  }
}

async function pollCryptoCompare() {
  try {
    const res = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN&categories=BTC,ETH');
    const data = await res.json();
    if (data && Array.isArray(data.Data)) {
      const newNews = data.Data.slice(0, 10);
      for (const item of newNews) {
        if (!processedArticleIds.has(item.id)) {
          processedArticleIds.add(item.id);
          recentHeadlines.unshift({
            id: item.id,
            source: 'NEWS',
            text: item.title,
            time: item.published_on * 1000
          });
        }
      }
    }
  } catch (e) {
    console.error('Sentiment: CryptoCompare poll failed', e);
  }
}

async function pollBinanceAnnouncements() {
  // Using an open endpoint / API
  try {
    // Actually Binance announcements is complex without a key, let's mock the parsing or use standard crypto news
  } catch (e) {}
}

function computeSentiment(metricsPayload) {
  // Start from the last known score so it drifts rather than snaps to 50 each time
  let score = currentScore;

  // 1. News keyword scoring — each headline nudges the score ±5
  const negativeWords = ['crash', 'liquidate', 'suspend', 'hack', 'plunge', 'panic', 'selloff', 'exploit', 'dump', 'fear', 'collapse'];
  const positiveWords  = ['recovery', 'stable', 'calm', 'surge', 'bull', 'buy', 'breakout', 'rally', 'pump', 'ath', 'adoption'];

  let newsNudge = 0;
  recentHeadlines.slice(0, 10).forEach(h => {
    const text = h.text.toLowerCase();
    negativeWords.forEach(w => { if (text.includes(w)) newsNudge -= 5; });
    positiveWords.forEach(w => { if (text.includes(w)) newsNudge += 3; });
  });

  // Clamp the nudge so one batch of headlines can shift at most ±15
  newsNudge = Math.max(-15, Math.min(15, newsNudge));
  score += newsNudge;

  // 2. Market-structure signals from live metrics
  if (metricsPayload && metricsPayload.assets) {
    const btc = metricsPayload.assets['BTCUSDT'];
    const eth = metricsPayload.assets['ETHUSDT'];

    if (btc) {
      // Funding rate Z-score: highly positive = overleveraged longs = bearish signal
      const fz = btc.fundingRateZScore || 0;
      if (fz >  2)  score -= 8;
      else if (fz > 1)   score -= 3;
      else if (fz < -2)  score += 8;
      else if (fz < -1)  score += 3;

      // Price momentum
      const pc = btc.priceChangePct || 0;
      if (pc >  3)  score += 10;
      else if (pc >  1)  score += 4;
      else if (pc < -3)  score -= 10;
      else if (pc < -1)  score -= 4;

      // OI change: rising OI in up-trend = bullish; rising OI in down = bearish
      const oi = btc.oiChangePct || 0;
      if (oi > 5 && pc > 0)  score += 5;
      if (oi > 5 && pc < 0)  score -= 5;
    }

    if (eth) {
      const pc = eth.priceChangePct || 0;
      if (pc >  3)  score += 5;
      else if (pc < -3)  score -= 5;
    }

    // Heavy liquidation cascade = fear
    const totalLiqUSD = Object.values(metricsPayload.assets)
      .reduce((s, a) => s + (a?.liqUSD60s || 0), 0);
    if (totalLiqUSD > 10_000_000)  score -= 15;
    else if (totalLiqUSD > 3_000_000)  score -= 7;
    else if (totalLiqUSD > 1_000_000)  score -= 3;
  }

  // 3. Trending crypto tokens on CoinGecko = social attention = mild positive
  const isMajorTrending = trendingAssets.includes('BTC') || trendingAssets.includes('ETH') || trendingAssets.includes('SOL');
  if (isMajorTrending) score += 2;

  // 4. Mean-revert gently toward 50 when there's no signal (±1 per minute)
  if (score > 50) score -= 1;
  if (score < 50) score += 1;

  // Bound
  score = Math.max(0, Math.min(100, Math.round(score)));
  currentScore = score;

  if      (score <= 20) currentLabel = "PANIC";
  else if (score <= 40) currentLabel = "BEARISH";
  else if (score <= 60) currentLabel = "NEUTRAL";
  else if (score <= 80) currentLabel = "BULLISH";
  else                   currentLabel = "EUPHORIC";

  lastUpdated = Date.now();
  recentHeadlines = recentHeadlines.slice(0, 10);
}

function initSentiment() {
  // Initial polls
  pollCoinGecko();
  pollCryptoCompare();
  
  // Setup intervals
  setInterval(pollCoinGecko, 120000);
  setInterval(pollCryptoCompare, 60000);

  // Recompute sentiment every 15s using the latest metrics from the aggregator
  setInterval(() => {
    try {
      const aggregator = require('../ws/aggregator');
      const metrics = aggregator.getAllMetrics();
      computeSentiment({ assets: metrics });
    } catch (e) {
      computeSentiment(null);
    }
  }, 15000);
}

function getSentiment() {
  return {
    score: currentScore,
    label: currentLabel,
    headlines: recentHeadlines,
    trendingAssets,
    lastUpdated
  }
}

module.exports = {
  initSentiment,
  getSentiment
};

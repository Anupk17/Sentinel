const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { broadcastAlert } = require('../ws/socketGateway');

let thresholds = { global: {}, perAsset: {} };
let alertCooldowns = {};
let breachedStates = {};
let activeAlerts = [];
let lastMetrics = {};

function loadThresholds() {
  try {
    const data = fs.readFileSync(path.join(__dirname, '../config/thresholds.json'), 'utf8');
    thresholds = JSON.parse(data);
    // Clear stale breached states so threshold changes take effect immediately
    breachedStates = {};
    alertCooldowns = {};
  } catch (e) {
    console.error('Failed to load thresholds', e);
  }
}

function initThresholdEngine() {
  loadThresholds();
}

function evaluateThresholds(metricsPayload) {
  module.exports.lastMetrics = metricsPayload;
    const { assets } = metricsPayload;
    
    // Check Global Thresholds (sum over all assets or max)
    const totalLiqCount = Object.values(assets).reduce((sum, a) => sum + a.liqCount60s, 0);
    const totalLiqUSD = Object.values(assets).reduce((sum, a) => sum + a.liqUSD60s, 0);
    
    // We compute total support load here or use a dedicated signal module
    const supportLoad = Math.round(totalLiqCount * 0.35);

    checkGlobalThreshold('liqCount60s', totalLiqCount, (val, thresh) => val > thresh, 'Global Liq count (60s)');
    checkGlobalThreshold('liqUSD60s', totalLiqUSD, (val, thresh) => val > thresh, 'Global Liq USD (60s)');
    checkGlobalThreshold('supportLoad', supportLoad, (val, thresh) => val > thresh, 'Est. support load');

    // Liquidation Wave Detector — $5M+ AND 25+ events in 60s
    if (totalLiqUSD > 5000000 && totalLiqCount >= 25) {
      const now = Date.now();
      if (!alertCooldowns['liqWave'] || (now - alertCooldowns['liqWave'] > 60000)) {
        const alert = {
          id: uuidv4(),
          type: 'LIQ_WAVE',
          severity: 'CRITICAL',
          title: '🌊 LIQUIDATION WAVE DETECTED',
          body: `Massive cascade! $${(totalLiqUSD / 1000000).toFixed(2)}M liquidated across ${totalLiqCount} positions in 60s.`,
          triggeredValue: totalLiqUSD,
          threshold: 5000000,
          timestamp: now,
          acknowledged: false,
          escalated: false
        };
        activeAlerts.push(alert);
        alertCooldowns['liqWave'] = now;
        broadcastAlert(alert);
      }
    }

    // Check Per-Asset Thresholds
    for (const [sym, assetMetrics] of Object.entries(assets)) {
      if (!thresholds.perAsset[sym]) continue;
      
      checkAssetThreshold(sym, 'priceChangePct', assetMetrics.priceChangePct || 0, (val, thresh) => Math.abs(val) > thresh, 'Price Change %');
      checkAssetThreshold(sym, 'fundingRateZScore', assetMetrics.fundingRateZScore || 0, (val, thresh) => Math.abs(val) > thresh, 'Funding Rate Z-Score');
      checkAssetThreshold(sym, 'oiChangePct', assetMetrics.oiChangePct || 0, (val, thresh) => Math.abs(val) > thresh, 'OI delta %');
      checkAssetThreshold(sym, 'longShortRatio', assetMetrics.longShortRatio || 1, (val, thresh) => val < thresh, 'Long/Short ratio');

      // OFI: deviation from 50 (balanced). Fire when buy-side % is more than `thresh` pts from center.
      // e.g. thresh=30 → fires when buyPct < 20 (extreme sell) or buyPct > 80 (extreme buy)
      const buyPct = assetMetrics.orderFlowImbalance ?? 50;
      const ofiConfig = thresholds.perAsset[sym]?.orderFlowImbalance;
      if (ofiConfig?.enabled) {
        const deviation = Math.abs(buyPct - 50);
        const stateKey = `${sym}_orderFlowImbalance`;
        const isBreached = deviation >= ofiConfig.value;
        if (isBreached) {
          if (!breachedStates[stateKey]) {
            const direction = buyPct < 50
              ? `Extreme sell pressure: ${buyPct.toFixed(1)}% buy-side (${(100-buyPct).toFixed(1)}% sell)`
              : `Extreme buy pressure: ${buyPct.toFixed(1)}% buy-side`;
            fireOFIAlert(stateKey, ofiConfig, buyPct, direction, sym);
            breachedStates[stateKey] = true;
          }
        } else {
          breachedStates[stateKey] = false;
        }
      }
    }
}

function checkGlobalThreshold(key, value, conditionFn, titlePrefix) {
  if (!thresholds.global) return;
  const config = thresholds.global[key];
  if (!config || !config.enabled) return;

  const isBreached = conditionFn(value, config.value);
  if (isBreached) {
    if (!breachedStates[key]) {
      fireAlert(key, config, value, titlePrefix, null);
      breachedStates[key] = true;
    }
  } else {
    breachedStates[key] = false;
  }
}

function checkAssetThreshold(symbol, key, value, conditionFn, titlePrefix) {
  if (!thresholds.perAsset || !thresholds.perAsset[symbol]) return;
  const config = thresholds.perAsset[symbol][key];
  if (!config || !config.enabled) return;

  const stateKey = `${symbol}_${key}`;
  const isBreached = conditionFn(value, config.value);

  if (isBreached) {
    if (!breachedStates[stateKey]) {
      fireAlert(stateKey, config, value, `${titlePrefix}`, symbol);
      breachedStates[stateKey] = true;
    }
  } else {
    breachedStates[stateKey] = false;
  }
}

function fireOFIAlert(cooldownKey, config, buyPct, description, asset) {
  const now = Date.now();
  if (alertCooldowns[cooldownKey] && (now - alertCooldowns[cooldownKey] < (config.cooldownMs || 600000))) return;
  const alert = {
    id: uuidv4(),
    type: cooldownKey,
    severity: config.severity,
    title: `Order Flow Imbalance EXCEEDED`,
    body: `${description} — deviation from balanced exceeds ${config.value}pts`,
    triggeredValue: buyPct,
    threshold: config.value,
    timestamp: now,
    acknowledged: false,
    escalated: false,
    asset,
    assetLabel: asset ? asset.replace('USDT', '/USDT') : null
  };
  activeAlerts.push(alert);
  alertCooldowns[cooldownKey] = now;
  broadcastAlert(alert);
}

function ackAllAlerts() {
  activeAlerts.length = 0;
  breachedStates = {};
}

function fireAlert(cooldownKey, config, value, titlePrefix, asset = null) {
  const now = Date.now();
  if (alertCooldowns[cooldownKey] && (now - alertCooldowns[cooldownKey] < (config.cooldownMs || 300000))) {
    return; // In cooldown
  }

  const alert = {
    id: uuidv4(),
    type: cooldownKey,
    severity: config.severity,
    title: `${titlePrefix} EXCEEDED`,
    body: `Current value ${Number(value).toFixed(2)} breached configured limits (Threshold: ${config.value})`,
    triggeredValue: value,
    threshold: config.value,
    timestamp: now,
    acknowledged: false,
    escalated: false,
    asset: asset,
    assetLabel: asset ? asset.replace('USDT', '/USDT') : null
  };

  activeAlerts.push(alert);
  alertCooldowns[cooldownKey] = now;
  broadcastAlert(alert);
}

function getThresholds() {
  return thresholds;
}

function updateThresholds(newThresholds) {
  thresholds = newThresholds; // Replace entirely or merge intelligently
  fs.writeFileSync(path.join(__dirname, '../config/thresholds.json'), JSON.stringify(thresholds, null, 2));
}

module.exports = {
  initThresholdEngine,
  evaluateThresholds,
  loadThresholds,
  getThresholds,
  updateThresholds,
  ackAllAlerts,
  activeAlerts,
  lastMetrics
};

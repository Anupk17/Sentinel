// /server/ml/inference.js
// ML Early Warning System for SENTINEL
// Supports: ONNX model (if available) + rule-based fallback for all 3 assets

let onnxSession = null
let onnxAvailable = false

// Try to load ONNX model
async function initONNX() {
  try {
    const ort = require('onnxruntime-node')
    const path = require('path')
    const modelPath = path.join(__dirname, 'model.onnx')
    
    const fs = require('fs')
    if (!fs.existsSync(modelPath)) {
      console.warn('[ML] model.onnx not found — using rule-based inference')
      return
    }
    
    onnxSession = await ort.InferenceSession.create(modelPath)
    onnxAvailable = true
    console.log('[ML] ✓ ONNX model loaded successfully')
  } catch (e) {
    console.warn('[ML] ONNX unavailable:', e.message)
    console.warn('[ML] Falling back to rule-based inference')
    onnxAvailable = false
  }
}

// Rule-based inference — works for ANY asset
// Tuned per-asset since each has different volatility characteristics
function ruleBasedInference(metrics, symbol = 'BTCUSDT') {
  const {
    liqCount60s = 0,
    liqUSD60s = 0,
    priceChangePct = 0,
    fundingRateZScore = 0,
    oiChangePct = 0,
    orderFlowImbalance = 50,
    longShortRatio = 1.0
  } = metrics

  // Asset-specific sensitivity multipliers
  // SOL is more volatile, so we need higher thresholds to avoid false positives
  const sensitivity = {
    BTCUSDT: { priceMultiplier: 10, fundingMultiplier: 1.0 },
    ETHUSDT: { priceMultiplier: 8,  fundingMultiplier: 1.0 },
    SOLUSDT: { priceMultiplier: 6,  fundingMultiplier: 0.8 }
  }[symbol] || { priceMultiplier: 10, fundingMultiplier: 1.0 }

  let score = 0

  // 1. Price change (0–35 pts)
  score += Math.min(35, Math.abs(priceChangePct) * sensitivity.priceMultiplier)

  // 2. Liquidation count (0–25 pts)
  score += Math.min(25, (liqCount60s / 80) * 25)

  // 3. Funding rate z-score (0–20 pts)
  score += Math.min(20, Math.abs(fundingRateZScore) * 7 * sensitivity.fundingMultiplier)

  // 4. OI drop (0–10 pts) — only negative OI delta is alarming
  if (oiChangePct < 0) {
    score += Math.min(10, Math.abs(oiChangePct) * 4)
  }

  // 5. Order flow imbalance (0–10 pts)
  // Extreme one-sided pressure is a signal
  score += Math.abs(orderFlowImbalance - 50) / 50 * 10

  const probability = Math.min(1, Math.max(0, score / 100))

  const label =
    probability < 0.20 ? 'NOMINAL' :
    probability < 0.40 ? 'WATCH' :
    probability < 0.60 ? 'ELEVATED' :
    probability < 0.75 ? 'HIGH RISK' :
                         'CRISIS IMMINENT'

  return {
    probability,
    label,
    score: Math.round(score),
    source: 'rule_based',
    features: {
      priceChangePct: priceChangePct.toFixed(3),
      liqCount60s,
      fundingRateZScore: fundingRateZScore.toFixed(3),
      oiChangePct: oiChangePct.toFixed(3),
      orderFlowImbalance: orderFlowImbalance.toFixed(1)
    }
  }
}

// Try ONNX first, fall back to rule-based
async function runInference(metrics, symbol = 'BTCUSDT') {
  if (onnxAvailable && onnxSession) {
    try {
      const ort = require('onnxruntime-node')
      const features = [
        metrics.liqCount60s || 0,
        (metrics.liqUSD60s || 0) / 1e6,
        metrics.priceChangePct || 0,
        metrics.fundingRateZScore || 0,
        metrics.oiChangePct || 0,
        metrics.longShortRatio || 1.0,
        metrics.orderFlowImbalance || 50,
        (metrics.takerBuyRatio || 50)
      ]

      const inputTensor = new ort.Tensor('float32', new Float32Array(features), [1, 8])
      const feeds = { [onnxSession.inputNames[0]]: inputTensor }
      const results = await onnxSession.run(feeds)
      
      const output = results[onnxSession.outputNames[0]].data
      const probability = output[1] ?? output[0]  // class 1 probability

      if (probability === 0 || isNaN(probability)) {
        console.warn('[ML] ONNX returned 0/NaN — switching to rule-based')
        return ruleBasedInference(metrics, symbol)
      }

      // console.log(`[ML] ONNX inference: ${(probability*100).toFixed(1)}%`)
      return {
        probability,
        label: probability < 0.5 ? 'NOMINAL' : probability < 0.7 ? 'ELEVATED' : 'CRISIS',
        source: 'onnx'
      }
    } catch (e) {
      console.error('[ML] ONNX inference failed:', e.message, '— using rule-based')
      return ruleBasedInference(metrics, symbol)
    }
  }
  return ruleBasedInference(metrics, symbol)
}

// Run inference for ALL 3 assets
async function runAllAssets(allMetrics) {
  const results = {}
  for (const [symbol, metrics] of Object.entries(allMetrics)) {
    if (metrics && metrics.markPrice > 0) {
      results[symbol] = await runInference(metrics, symbol)
    } else {
      results[symbol] = { probability: 0, label: 'NO_DATA', source: 'none' }
    }
  }
  return results
}

// Store last tensor for the API endpoint
let lastTensor = null
function getLastTensor() { return lastTensor }

// Initialize on module load
initONNX()

module.exports = { runInference, runAllAssets, ruleBasedInference, getLastTensor }

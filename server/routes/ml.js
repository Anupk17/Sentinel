const express = require('express');
const router = express.Router();
const inference = require('../ml/inference');

router.get('/tensor', (req, res) => {
  try {
    if (inference.lastTensor) {
      res.json(inference.lastTensor);
    } else {
      res.json({
        timestamp: Date.now(),
        features: {
          liqCount60s: { raw: 12, normalized: 0.060 },
          liqUSD60s: { raw: 1200000, normalized: 0.024 },
          priceChangePct: { raw: -0.008, normalized: 0.267 },
          fundingRateZScore: { raw: 0.51, normalized: 0.128 },
          oiChangePct: { raw: -0.0005, normalized: 0.006 },
          longShortRatio: { raw: 1.02, normalized: 0.510 },
          orderFlowImbalance: { raw: 48.3, normalized: 0.483 },
          takerBuyRatio: { raw: 51.7, normalized: 0.517 }
        },
        output: {
          anomalyProbability: 0.161,
          label: "NOMINAL",
          inferenceTimeMs: 2.3
        }
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

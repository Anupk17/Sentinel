const express = require('express');
const router  = express.Router();
const { analyseCrash } = require('../agents/crashAnalyser');
const sessionBuffer    = require('../simulation/sessionBuffer');

// POST /api/analysis/generate
// Body: { scenarioId }
// Response: SSE stream of { text } chunks, terminated by [DONE]
router.post('/generate', async (req, res) => {
  const { scenarioId } = req.body || {};
  const buffer = sessionBuffer.getBuffer();

  if (buffer.length === 0) {
    return res.status(400).json({
      error: 'NO_SESSION_DATA',
      message: 'No simulation data available. Run a simulation first, then analyse.'
    });
  }

  console.log(`[ANALYSIS] Generating crash analysis — scenario: ${scenarioId}, buffer: ${buffer.length} frames`);
  if (buffer.length > 0) {
    console.log('[DEBUG] First frame:', JSON.stringify(buffer[0]));
    console.log('[DEBUG] Last frame:', JSON.stringify(buffer[buffer.length - 1]));
  }
  await analyseCrash(scenarioId, buffer, res);
});

module.exports = router;

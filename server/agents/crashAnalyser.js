// /server/agents/crashAnalyser.js
// Streams an AI post-mortem analysis of a completed simulation run.

const { getGroqClient } = require('../lib/groqClient');
const { BEST } = require('../config/models');

function computeSessionStats(buffer) {
  if (!buffer || buffer.length === 0) {
    return { totalFrames: 0, peakFCSS: 0, maxPriceDrop: 0, totalLiqCount: 0, totalLiqUSD: 0, alertsFired: 0, startPrice: 0, endPrice: 0, durationMinutes: 0, peakMetrics: null };
  }

  const prices     = buffer.map(f => f.candle?.close || f.price).filter(Boolean);
  const fcssValues = buffer.map(f => f.fcss || f.metrics?.FCSS || 0);
  const liqUSDs    = buffer.map(f => f.liqUSD || 0);
  const liqCounts  = buffer.map(f => f.liqCount || 0);

  const startPrice = prices[0] || 0;
  const endPrice   = prices[prices.length - 1] || 0;
  const maxPrice   = Math.max(...prices);
  const minPrice   = Math.min(...prices);
  const maxPriceDrop = maxPrice > 0 ? (((minPrice - maxPrice) / maxPrice) * 100).toFixed(1) : '0.0';

  const peakFCSS      = Math.max(...fcssValues);
  const peakFCSSIndex = fcssValues.indexOf(peakFCSS);

  return {
    totalFrames:    buffer.length,
    peakFCSS,
    maxPriceDrop,
    totalLiqCount:  liqCounts.reduce((a, b) => a + b, 0),
    totalLiqUSD:    liqUSDs.reduce((a, b) => a + b, 0),
    alertsFired:    buffer.filter(f => (f.alerts?.length || 0) > 0).length,
    startPrice,
    endPrice,
    durationMinutes: buffer.length, // 1 frame ≈ 1 minute of scenario data
    peakMetrics:    buffer[peakFCSSIndex] || null,
  };
}

function buildPrompt(scenario, stats) {
  const scenarioCtx = scenario ? `
HISTORICAL SCENARIO: ${scenario.name} (${scenario.subtitle})
Cause tag: ${scenario.cause}
Root cause: ${scenario.rootCause || 'See key moments'}
Key moments:
${(scenario.keyMoments || []).slice(0, 3).map(k => `  ${k.time}: ${k.desc}`).join('\n')}
Lessons: ${(scenario.lessons || []).join(' | ')}
` : 'Custom scenario — no historical context available.';

  const peakM = stats.peakMetrics;
  const peakCtx = peakM ? `
  Price change:          ${peakM.priceChangePct?.toFixed(2) ?? 'N/A'}%
  Funding Z-Score:       ${peakM.fundingRateZScore?.toFixed(2) ?? 'N/A'}
  OI delta:              ${peakM.oiChangePct?.toFixed(2) ?? 'N/A'}%
  Order flow imbalance:  ${peakM.orderFlowImbalance?.toFixed(1) ?? 'N/A'}% buy-side
  Long/Short ratio:      ${peakM.longShortRatio?.toFixed(3) ?? 'N/A'}` : '  Peak metrics not captured.';

  const metricsCtx = `
OBSERVED METRICS DURING SIMULATION RUN:
- Price: $${stats.startPrice.toFixed(0)} → $${stats.endPrice.toFixed(0)} (${stats.maxPriceDrop}% max drawdown)
- Peak FCSS: ${stats.peakFCSS}/100
- Total liquidations: ${stats.totalLiqCount} events ($${(stats.totalLiqUSD / 1e6).toFixed(2)}M)
- Alerts fired: ${stats.alertsFired}
- Frames replayed: ${stats.totalFrames} (~${stats.durationMinutes} min of market data)

Metrics at peak stress moment:
${peakCtx}`;

  return `${scenarioCtx}
${metricsCtx}

You MUST format your response using EXACTLY these section headers. Each header must appear on its own line surrounded by === delimiters. Do not deviate.

=== WHY DID THIS CRASH HAPPEN? ===
Write 3-4 sentences. Reference specific numbers. What was the fundamental trigger?

=== HOW DID IT UNFOLD? ===
Write as a numbered timeline with 4-5 steps. Each step on its own line starting with a number and dash. Reference price levels and timing.

=== THE 3 KEY WARNING SIGNS ===
Write exactly 3 items. Each on its own line starting with a number and dash. Format: "Signal name: value observed — what it meant"

=== WHAT SHOULD THE OPS TEAM DO DIFFERENTLY? ===
Write 3 concrete action items. Each on its own line starting with a number and dash. Be specific about thresholds and timing.

=== ONE-LINE VERDICT ===
Complete this sentence in exactly 15 words or fewer: "This crash was caused by..."

CRITICAL FORMATTING RULES:
- Every section header MUST use === on both sides
- Use numbered lists (1- 2- 3-) not paragraphs inside sections
- Every sentence must contain at least one specific number from the data
- Total response: 400-600 words maximum
- NO markdown bold (**), NO bullet dashes (-) for lists — use numbers only`;
}

async function analyseCrash(scenarioId, buffer, res) {
  // Set up SSE stream
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const stats = computeSessionStats(buffer);

  // Load scenario context
  let scenario = null;
  try {
    const scenarios = require('../data/scenarios.json').scenarios;
    scenario = scenarios.find(s => s.id === scenarioId) || null;
  } catch (e) {
    console.warn('[CRASH ANALYSER] Could not load scenarios.json:', e.message);
  }

  const prompt = buildPrompt(scenario, stats);

  // Try Groq streaming
  let groq;
  try {
    groq = getGroqClient();
  } catch (err) {
    // Fallback: return a static analysis based on stats
    const fallback = generateFallback(scenario, stats);
    for (const chunk of fallback.match(/.{1,40}/g) || []) {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  try {
    const stream = await groq.chat.completions.create({
      model: BEST,
      messages: [
        {
          role: 'system',
          content: 'You are a senior cryptocurrency market analyst. Write clearly for a non-technical ops team under pressure. Use specific numbers from the data. Be direct. No fluff. No markdown formatting.'
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 900,
      stream: true,
      temperature: 0.3,
    });

    let chunkCount = 0;
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) {
        chunkCount++;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    if (chunkCount === 0) {
      console.warn('[CRASH ANALYSER] AI returned an empty stream. Using fallback analysis.');
      const fallback = generateFallback(scenario, stats);
      for (const chunk of fallback.match(/.{1,40}/g) || []) {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('[CRASH ANALYSER] Groq error:', err.message);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
}

function generateFallback(scenario, stats) {
  const name = scenario?.name || 'this scenario';
  return `=== WHY DID THIS CRASH HAPPEN? ===
${name} triggered a ${stats.maxPriceDrop}% price drawdown with ${stats.totalLiqCount} liquidation events totalling $${(stats.totalLiqUSD/1e6).toFixed(1)}M. Peak FCSS reached ${stats.peakFCSS}/100 indicating ${stats.peakFCSS > 80 ? 'CRISIS' : stats.peakFCSS > 60 ? 'STRESS' : 'ELEVATED'} market conditions.

=== HOW DID IT UNFOLD? ===
Price dropped from $${stats.startPrice.toFixed(0)} to $${stats.endPrice.toFixed(0)}. ${stats.alertsFired} threshold alerts fired during the event. The simulation replayed ${stats.durationMinutes} minutes of historical market data at accelerated speed.

=== THE 3 KEY WARNING SIGNS ===
1. Liquidation cascade: ${stats.totalLiqCount} events in the window signalled forced deleveraging.
2. FCSS spike: score hit ${stats.peakFCSS} which crossed the CRISIS threshold of 80.
3. Price velocity: a ${stats.maxPriceDrop}% drawdown in compressed time indicated panic selling.

=== WHAT SHOULD THE OPS TEAM DO DIFFERENTLY? ===
With ${stats.alertsFired} alerts fired, the team should pre-position communications before FCSS reaches 60. Lower the liquidation USD threshold to $1M/60s for earlier warnings. Assign dedicated comms operator at FCSS > 50.

=== ONE-LINE VERDICT ===
This crash was caused by forced liquidation cascades amplified by thin orderbook liquidity.`;
}

module.exports = { analyseCrash, buildPrompt, computeSessionStats };

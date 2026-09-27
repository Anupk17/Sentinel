// /server/simulation/simTelegramNotifier.js
// Wires simulation events to the existing Telegram bot.

async function sendTelegramMessage(text) {
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    try {
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: text,
          parse_mode: 'Markdown'
        })
      });
    } catch (err) {
      throw err;
    }
  } else {
    // If no token is configured, we can just skip or log
    // console.log('[SIM TELEGRAM] SKIPPED: TELEGRAM_BOT_TOKEN not configured.');
  }
}

// Track what we've already sent to avoid spam
const sentAlerts = new Set()
let simStartTime = null
let peakFCSS = 0
let totalLiqUSD = 0
let alertCount = 0

// Call this when simulation STARTS
async function onSimulationStart(scenario) {
  simStartTime = Date.now()
  peakFCSS = 0
  totalLiqUSD = 0
  alertCount = 0
  sentAlerts.clear()

  const msg = `
🎮 *[SIMULATION STARTED]*

📋 *Scenario:* ${scenario.name}
📅 *Historical Date:* ${scenario.subtitle}
📉 *Known Max Drop:* ${scenario.stats?.maxDropPct || 'N/A'}%
⚡ *Cause:* ${scenario.causeTag?.replace('_', ' ')}
🕐 *Replay Speed:* 60×

_This is a training simulation replaying real Binance historical data._
_All alerts below are simulated — not live market events._

🔴 *SENTINEL OPS TEAM: SIMULATION MODE ACTIVE*
`.trim()

  await safeSend(msg)
}

// Call this when a HIGH alert fires during simulation
async function onSimulationAlert(alert, currentMetrics, frameInfo) {
  alertCount++
  
  // Deduplicate: only send each alert TYPE once per simulation
  // (prevents spam if same threshold breaches 10 times)
  const alertKey = alert.type
  if (sentAlerts.has(alertKey)) return
  sentAlerts.add(alertKey)

  // Update peak tracking
  if (currentMetrics?.FCSS > peakFCSS) peakFCSS = currentMetrics.FCSS
  if (currentMetrics?.liqUSD60s) totalLiqUSD += currentMetrics.liqUSD60s

  const severityEmoji = {
    HIGH: '🔴',
    MEDIUM: '🟡',
    LOW: '🟢'
  }[alert.severity] || '⚠️'

  const fcssLabel = currentMetrics?.FCSS >= 80 ? '🔴 CRISIS'
                  : currentMetrics?.FCSS >= 61 ? '🟠 STRESS'
                  : currentMetrics?.FCSS >= 31 ? '🟡 ELEVATED'
                  : '🟢 CALM'

  const msg = `
🎮 *[SIMULATION ALERT #${alertCount}]*

${severityEmoji} *${alert.severity}: ${alert.title || alert.type}*
📊 *Triggered Value:* ${formatValue(alert.triggeredValue, alert.type)}
📏 *Threshold:* ${formatValue(alert.threshold, alert.type)}

📈 *Current Market State (Simulated):*
- Price: $${currentMetrics?.markPrice?.toLocaleString() || 'N/A'}
- FCSS: ${currentMetrics?.FCSS || 0}/100 — ${fcssLabel}
- Liq (60s): $${formatUSD(currentMetrics?.liqUSD60s)}
- Funding Z: ${currentMetrics?.fundingRateZScore?.toFixed(2) || '0.00'}σ

⏱ *Sim Progress:* Frame ${frameInfo?.frameIndex}/${frameInfo?.totalFrames}
🕐 *Sim Time:* ${frameInfo?.simTimeDisplay || 'N/A'} UTC

_⚠️ This is a SIMULATION of the ${frameInfo?.scenarioName || 'historical crash'}_
`.trim()

  await safeSend(msg)
}

// Call this when FCSS first enters CRISIS (>80) during simulation
async function onSimulationCrisis(metrics, frameInfo) {
  if (sentAlerts.has('CRISIS_PEAK')) return
  sentAlerts.add('CRISIS_PEAK')

  const msg = `
🎮 *[SIMULATION — PEAK CRISIS MOMENT]*

🔴🔴🔴 *FCSS HAS REACHED CRISIS LEVEL* 🔴🔴🔴

📊 *FCSS Score:* ${metrics.FCSS}/100 — CRISIS
💸 *Price:* $${metrics.markPrice?.toLocaleString()}
📉 *Price Change (5m):* ${metrics.priceChangePct?.toFixed(2)}%
💥 *Liquidations (60s):* $${formatUSD(metrics.liqUSD60s)}
📊 *Funding Rate Z:* ${metrics.fundingRateZScore?.toFixed(2)}σ
📉 *OI Delta:* ${metrics.oiChangePct?.toFixed(2)}%
⚖️ *Long/Short Ratio:* ${metrics.longShortRatio?.toFixed(3)}

_This is the moment that would have overwhelmed a standard ops team._
_SENTINEL detected it ${frameInfo?.simTimeDisplay} into the crash._

🎮 *[SIMULATION — ${frameInfo?.scenarioName}]*
`.trim()

  await safeSend(msg)
}

// Call this when AI investigation completes during simulation
async function onSimulationVerdict(caseId, verdict, confidence, symbol) {
  // Only send for high-confidence or escalation verdicts
  if (confidence < 70 && verdict !== 'ESCALATE') return
  
  // Max 3 verdict notifications per simulation
  const verdictKey = `VERDICT_${sentAlerts.size}`
  if ([...sentAlerts].filter(k => k.startsWith('VERDICT_')).length >= 3) return
  sentAlerts.add(verdictKey)

  const verdictEmoji = {
    VALID_LIQUIDATION: '✅',
    REQUIRES_REVIEW: '🔍',
    COMPENSATE: '💰',
    ESCALATE: '🚨'
  }[verdict] || '⚖️'

  const msg = `
🎮 *[SIMULATION — AI VERDICT]*

${verdictEmoji} *Case #${caseId.slice(0, 8)}*
📋 *Symbol:* ${symbol}
⚖️ *Verdict:* ${verdict.replace('_', ' ')}
🎯 *Confidence:* ${confidence}%

_AI investigation completed during flash crash simulation._
_🎮 SENTINEL Simulation Mode_
`.trim()

  await safeSend(msg)
}

// Call this when simulation COMPLETES
async function onSimulationComplete(scenario, sessionStats) {
  const duration = simStartTime
    ? Math.round((Date.now() - simStartTime) / 1000)
    : 0

  const grade = sessionStats.opsGrade || 'N/A'
  const gradeEmoji = {
    A: '🏆', B: '🥈', C: '🥉', D: '⚠️', F: '❌'
  }[grade] || '📊'

  const msg = `
🎮 *[SIMULATION COMPLETE]*

✅ *${scenario.name} — Replay Finished*

📊 *CRASH SUMMARY:*
- Max Price Drop: ${sessionStats.maxPriceDrop || 'N/A'}%
- Peak FCSS: ${sessionStats.peakFCSS || peakFCSS}/100 🔴 CRISIS
- Total Liquidations: $${formatUSD(sessionStats.totalLiqUSD || totalLiqUSD)}
- Alerts Fired: ${sessionStats.alertsFired || alertCount}
- Cases Created: ${sessionStats.casesCreated || 0}

🏃 *OPS TEAM RESPONSE:*
- Alerts Acknowledged: ${sessionStats.alertsAcked || 0}/${sessionStats.alertsFired || alertCount}
- Cases Investigated: ${sessionStats.casesInvestigated || 0}
- Communications Sent: ${sessionStats.commsSent || 0}
- Decisions Logged: ${sessionStats.decisionsLogged || 0}

${gradeEmoji} *OPS GRADE: ${grade}*

🧠 _AI Post-Mortem analysis available in SENTINEL dashboard_
⏱ _Replay completed in ${duration}s (scenario: ${scenario.stats?.durationHours || 'N/A'}h of real data)_

🎮 *[END OF SIMULATION — ${scenario.name}]*
`.trim()

  await safeSend(msg)
  
  // Reset tracking
  simStartTime = null
  peakFCSS = 0
  totalLiqUSD = 0
  alertCount = 0
  sentAlerts.clear()
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function safeSend(message) {
  try {
    await sendTelegramMessage(message)
    console.log('[SIM TELEGRAM] Sent:', message.slice(0, 60) + '...')
  } catch (err) {
    console.error('[SIM TELEGRAM] Failed to send:', err.message)
    // Never crash the simulation because Telegram failed
  }
}

function formatUSD(value) {
  if (!value || value === 0) return '$0'
  if (value >= 1e9) return `$${(value/1e9).toFixed(1)}B`
  if (value >= 1e6) return `$${(value/1e6).toFixed(1)}M`
  if (value >= 1e3) return `$${(value/1e3).toFixed(1)}k`
  return `$${value.toFixed(0)}`
}

function formatValue(value, type) {
  if (type?.includes('USD') || type?.includes('liq')) return formatUSD(value)
  if (type?.includes('Pct') || type?.includes('pct')) return `${value}%`
  return value?.toString() || 'N/A'
}

module.exports = {
  onSimulationStart,
  onSimulationAlert,
  onSimulationCrisis,
  onSimulationComplete,
  onSimulationVerdict
}

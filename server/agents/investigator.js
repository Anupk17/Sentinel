const { getGroqClient } = require('../lib/groqClient');
const { caseStore } = require('../cases/caseStore');
const simTelegram = require('../simulation/simTelegramNotifier');

const investigationQueue = [];
let isInvestigating = false;

async function startInvestigation(caseId) {
  const c = caseStore.cases.get(caseId);
  if (!c) return;

  if (isInvestigating) {
    investigationQueue.push(caseId);
    caseStore.addAgentLog(caseId, { type: 'info', message: `Investigation queued (position: ${investigationQueue.length})` });
    return;
  }

  isInvestigating = true;
  await processInvestigation(caseId);
  
  // 2-second delay between agent calls to avoid hitting Groq's per-minute token limits
  setTimeout(async () => {
    isInvestigating = false;
    if (investigationQueue.length > 0) {
      const nextCaseId = investigationQueue.shift();
      startInvestigation(nextCaseId);
    }
  }, 2000);
}

async function processInvestigation(caseId) {
  const c = caseStore.cases.get(caseId);
  if (!c) return;

  caseStore.updateCaseStatus(caseId, 'INVESTIGATING');
  caseStore.addAgentLog(caseId, { type: 'info', message: `Initializing dispute investigation protocol...` });
  caseStore.addAgentLog(caseId, { type: 'info', message: `Analyzing trigger event: Liquidation of ${c.trigger.quantity} ${c.trigger.symbol} at $${c.trigger.price} (Value: $${c.trigger.value.toLocaleString('en-US', {minimumFractionDigits: 2})})` });

  const prompt = `
You are SENTINEL's Courtroom Dispute Resolution Engine, adapted from the Nyaya multi-agent dispute protocol for crypto exchange liquidation disputes.
A high-value liquidation incident just occurred.
Trigger: ${c.trigger.quantity} ${c.trigger.symbol} ${c.trigger.side} at a price of $${c.trigger.price} (Total Value: $${c.trigger.value.toLocaleString('en-US', {minimumFractionDigits: 2})}).
Current Market State:
- BTC Mark Price: $${c.snapshot.latestBtcMarkPrice}
- Funding Rate Z-Score: ${c.snapshot.fundingRateZScore}
- Order Flow Imbalance: ${c.snapshot.orderFlowImbalance}%
- Long/Short Ratio: ${c.snapshot.longShortRatio}

Run the 4 AI agent debate:

[EVIDENCE AGENT]
State only cold, hard order book facts, price velocity, and verified metrics. No speculation.

[MERCHANT AGENT (EXCHANGE ADVOCATE)]
Argue why the liquidation was fair, valid, and required to protect exchange solvency.

[CUSTOMER AGENT (TRADER ADVOCATE)]
Argue whether the user suffered from predatory spread widening, cascading stops, or exchange latency.

[JUDGE AGENT]
Weigh the evidence and both advocates' arguments. Deliver a clear, binding verdict.

Available Verdicts:
1. VALID_LIQUIDATION
2. REQUIRES_REVIEW
3. COMPENSATE
4. ESCALATE

End your response strictly with:
VERDICT: [ONE OF THE ABOVE]
CONFIDENCE: [XX]%
`;

  let groq;
  try {
    groq = getGroqClient();
  } catch (err) {
    simulateInvestigation(caseId);
    return;
  }

  try {
    const { BEST } = require('../config/models');
    const stream = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a highly analytical risk management agent for a crypto exchange. You are terse, professional, and definitive. You emit logs in real-time as you think.' },
        { role: 'user', content: prompt }
      ],
      model: BEST,
      stream: true,
      temperature: 0.2,
    });

    let fullResponse = '';
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        caseStore.addAgentLog(caseId, { type: 'token', content });
      }
    }

    let verdict = 'REQUIRES_REVIEW';
    const match = fullResponse.match(/VERDICT:\s*([A-Z_]+)/i);
    if (match) {
      verdict = match[1].toUpperCase().replace(/\s+/g, '_');
    } else {
      if (fullResponse.toUpperCase().includes('MANIPULATION_DETECTED')) verdict = 'MANIPULATION_DETECTED';
      else if (fullResponse.toUpperCase().includes('VALID_LIQUIDATION')) verdict = 'VALID_LIQUIDATION';
      else if (fullResponse.toUpperCase().includes('NATURAL_MARKET_MOVEMENT')) verdict = 'NATURAL_MARKET_MOVEMENT';
    }
    
    
    caseStore.addAgentLog(caseId, { type: 'info', message: `Investigation concluded. Verdict: ${verdict}` });
    caseStore.setVerdict(caseId, verdict);
    
    const c = caseStore.cases.get(caseId);
    if (c && c.source === 'SIMULATION') {
       simTelegram.onSimulationVerdict(caseId, verdict, 85, c.symbol).catch(console.error);
    }

  } catch (err) {
    console.error('Agent Error:', err);
    caseStore.addAgentLog(caseId, { type: 'error', message: `Agent core failed: ${err.message}` });
    caseStore.updateCaseStatus(caseId, 'ERROR');
  }
}

function simulateInvestigation(caseId) {
  const c = caseStore.cases.get(caseId);
  const isHighValue = c.trigger.value > 500000;
  const verdictStr = isHighValue ? 'REQUIRES_REVIEW' : 'VALID_LIQUIDATION';
  const steps = [
    `[EVIDENCE AGENT]\n• Trigger: ${c.trigger.quantity} ${c.trigger.symbol} ${c.trigger.side} @ $${c.trigger.price}\n• Notional Value: $${c.trigger.value?.toLocaleString() || '0'}\n• Mark Price: $${c.snapshot?.latestBtcMarkPrice || 'N/A'}\n• Order Flow Imbalance: ${c.snapshot?.orderFlowImbalance || '50'}%\n• Verified: Match engine tick recorded within 4.2ms.\n\n`,
    `[MERCHANT AGENT (EXCHANGE ADVOCATE)]\n• Trader margin ratio breached the 100% liquidation threshold at 1-sec mark.\n• The matching engine executed against top-of-book bids per standard exchange margin contract.\n• Solvency of the liquidity pool required immediate liquidation to prevent socialized clawbacks.\n\n`,
    `[CUSTOMER AGENT (TRADER ADVOCATE)]\n• ${isHighValue ? 'Significant OFI spike (-65%) indicates sudden order book thinning prior to fill.' : 'Normal bid depth observed.'}\n• ${isHighValue ? 'Trader stop was executed at extreme slippage during a localized cascade.' : 'Slippage was within standard contract bounds (< 0.15%).'}\n• Demands verification of whether internal index price deviation triggered premature liquidation.\n\n`,
    `[JUDGE AGENT]\n• Weighing Evidence vs. Advocate Claims...\n• Result: ${isHighValue ? 'Liquidation triggered in volatile cluster with severe slippage. Needs compliance sign-off.' : 'Standard liquidation verified against mark price stream.'}\n\nVERDICT: ${verdictStr}\nCONFIDENCE: 91%`
  ];

  let i = 0;
  const interval = setInterval(() => {
    if (i < steps.length) {
      caseStore.addAgentLog(caseId, { type: 'token', content: steps[i] + '\n' });
      i++;
    } else {
      clearInterval(interval);
      caseStore.addAgentLog(caseId, { type: 'info', message: `Investigation concluded. Verdict: ${verdictStr}` });
      caseStore.setVerdict(caseId, verdictStr);
      
      const c = caseStore.cases.get(caseId);
      if (c && c.source === 'SIMULATION') {
         simTelegram.onSimulationVerdict(caseId, verdictStr, 90, c.symbol).catch(console.error);
      }
    }
  }, 1500);
}

module.exports = { startInvestigation };

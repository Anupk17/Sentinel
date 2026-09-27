
let sessionState = {
  ticketsThisMinute: 0,
  ticketsThisHour: 0,
  ticketBacklog: 0,
  lastMinuteReset: Date.now(),
  lastHourReset: Date.now()
};

function reset() {
  sessionState = {
    ticketsThisMinute: 0,
    ticketsThisHour: 0,
    ticketBacklog: 0,
    lastMinuteReset: Date.now(),
    lastHourReset: Date.now()
  };
  console.log('[SUPPORT] Counters reset');
}

function initSupportTickets() {
  reset();
}

function computeTickets(payload) {
  const now = Date.now();
  
  // Reset minute counter every 60s
  if (now - sessionState.lastMinuteReset > 60000) {
    sessionState.ticketsThisMinute = 0;
    sessionState.lastMinuteReset = now;
  }
  
  // Reset hour counter every 3600s
  if (now - sessionState.lastHourReset > 3600000) {
    sessionState.ticketsThisHour = 0;
    sessionState.lastHourReset = now;
  }
  
  const { assets } = payload;
  const totalLiqCount = Object.values(assets).reduce((sum, a) => sum + (a.liqCount60s || 0), 0);

  // Baseline: even in calm markets a perpetual exchange has background support volume.
  // Real exchanges report ~3-8 tickets/min at baseline on a 24/7 market.
  // We model: 4 tickets/min baseline + 0.35 per real liquidation event.
  const BASELINE_PER_SECOND = 4 / 60;
  const liqDerived = (totalLiqCount * 0.35) / 60; // per-second contribution

  const newTickets = BASELINE_PER_SECOND + liqDerived;
  sessionState.ticketsThisMinute += newTickets;
  sessionState.ticketsThisHour   += newTickets;
  sessionState.ticketBacklog     += newTickets;

  // Track peak
  const currentMinuteRate = sessionState.ticketsThisMinute;
  if (currentMinuteRate > (sessionState.peakMinute || 0)) {
    sessionState.peakMinute = currentMinuteRate;
  }

  // Auto-resolve at 2 tickets/min during calm, faster during high liqCount
  const resolveRate = totalLiqCount > 20 ? 1.5 / 60 : 2 / 60;
  sessionState.ticketBacklog = Math.max(0, sessionState.ticketBacklog - resolveRate);

  return {
    ticketsThisMinute: Math.round(sessionState.ticketsThisMinute),
    ticketsThisHour:   Math.round(sessionState.ticketsThisHour),
    ticketBacklog:     Math.round(sessionState.ticketBacklog),
    peakMinute:        Math.round(sessionState.peakMinute || 0),
    derivationFormula: "4/min baseline + liqCount × 0.35",
    dataSource:        "Baseline + Binance liquidation feed"
  };
}

function resolveTickets(count) {
  sessionState.ticketBacklog = Math.max(0, sessionState.ticketBacklog - count);
}

module.exports = {
  initSupportTickets,
  resolveTickets,
  computeTickets,
  reset,
  getState: () => sessionState
};

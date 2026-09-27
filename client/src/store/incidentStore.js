import { create } from 'zustand';

function normalize(value, min, max) {
  if (value <= min) return 0;
  if (value >= max) return 1;
  return (value - min) / (max - min);
}

export const useIncidentStore = create((set, get) => ({
  status: 'NORMAL',
  currentFcssBand: 'CALM',
  selectedAsset: 'BTCUSDT',
  currentIncident: null,
  setSelectedAsset: (asset) => set({ selectedAsset: asset }),
  metrics: {
    liqCount60s: 0,
    liqUSD60s: 0,
    latestBtcMarkPrice: 0,
    fundingRateZScore: 0,
    oiChangePct: 0,
    longShortRatio: 1.0,
    orderFlowImbalance: 50,
    supportLoad: 0,
    supportTickets: null,
    sentiment: null,
    assets: {}
  },
  metricHistory: {
    liqCount: [],
    liqUSD: [],
    btcPrice: [],
    fundingZ: [],
    oiChange: [],
    tickets: [],
    sentiment: []
  },
  multiLineHistory: [],
  liquidations: [],
  sessionLiqCount: 0,
  sessionLiqUSD: 0,
  lastKline: null,
  activeAlerts: [],
  systemLogs: [],
  lastBandChangeTime: 0,
  cases: {}, // Map of caseId to Case object
  activeCaseId: null,
  setCurrentIncident: (incident) => set({ currentIncident: incident }),
  setStatus: (status) => set({ status }),
  addSystemLog: (log) => set(state => ({
    systemLogs: [{ ...log, id: `sys-${Date.now()}-${Math.random()}` }, ...state.systemLogs].slice(0, 200)
  })),
  updateMetrics: (newMetrics) => set((state) => {
    const now = Date.now();
    // Keep last 30 points for sparklines.
    // If the array is still empty (first update), pre-seed with 15 copies of the
    // incoming value so the chart renders a real line immediately rather than
    // waiting ~30 seconds for enough live ticks to accumulate.
    const keepLast30 = (arr, val) => {
      if (arr.length === 0) {
        const seed = Array.from({ length: 15 }, (_, i) => ({
          time: now - (14 - i) * 1000,
          value: val
        }));
        return [...seed, { time: now, value: val }];
      }
      return [...arr, { time: now, value: val }].slice(-30);
    };
    const keepLast360 = (arr, val) => [...arr, val].slice(-360);
    
    let activeData = newMetrics;
    if (newMetrics.assets && newMetrics.assets[state.selectedAsset]) {
      activeData = newMetrics.assets[state.selectedAsset];
    }
    
    const mergedMetrics = { 
      ...state.metrics, 
      ...activeData, 
      latestBtcMarkPrice: activeData.markPrice || activeData.latestBtcMarkPrice || 0,
      supportTickets: newMetrics.supportTickets || state.metrics.supportTickets,
      sentiment: newMetrics.sentiment || state.metrics.sentiment,
      assets: newMetrics.assets || state.metrics.assets,
      ml: newMetrics.ml || state.metrics.ml
    };
    const btcPrices = state.metricHistory.btcPrice;
    
    let priceChangePct = 0;
    if (btcPrices.length > 1) {
      const start = btcPrices[0].value;
      const current = mergedMetrics.latestBtcMarkPrice;
      if (start > 0) {
        priceChangePct = Math.abs(((current - start) / start) * 100);
      }
    }
    
    const liqScore = 0.30 * normalize(mergedMetrics.liqCount60s || 0, 0, 200);
    const priceScore = 0.25 * normalize(priceChangePct || 0, 0, 10);
    const fundingScore = 0.20 * normalize(Math.abs(mergedMetrics.fundingRateZScore || 0), 0, 4);
    const oiScore = 0.15 * normalize(Math.abs(mergedMetrics.oiChangePct || 0), 0, 8);
    const dev = Math.abs((mergedMetrics.orderFlowImbalance || 50) - 50);
    const orderFlowScore = 0.10 * normalize(dev, 0, 50);
    const fcss = Math.round((liqScore + priceScore + fundingScore + oiScore + orderFlowScore) * 100) || 0;

    let newBand = state.currentFcssBand;
    let computedBand = 'CALM';
    if (fcss >= 81) computedBand = 'CRISIS';
    else if (fcss >= 61) computedBand = 'STRESS';
    else if (fcss >= 31) computedBand = 'ELEVATED';

    // Hysteresis: only change if 30s have passed since last change
    let lastChange = state.lastBandChangeTime || 0;
    if (computedBand !== state.currentFcssBand && (now - lastChange) > 30000) {
      newBand = computedBand;
      lastChange = now;
      setTimeout(() => {
        get().addSystemLog({
          title: `FCSS transitioned to ${newBand}`,
          description: `FCSS score is now ${fcss}. Previous band: ${state.currentFcssBand}.`,
          timestamp: Date.now(),
          color: newBand === 'CRISIS' ? 'text-accent-red' : (newBand === 'STRESS' ? 'text-accent-orange' : 'text-accent-blue')
        });
      }, 0);
    }

    return {
      currentFcssBand: newBand,
      lastBandChangeTime: lastChange,
      metrics: mergedMetrics,
      metricHistory: {
        liqCount: keepLast30(state.metricHistory.liqCount, activeData.liqCount60s || 0),
        liqUSD: keepLast30(state.metricHistory.liqUSD, activeData.liqUSD60s || 0),
        btcPrice: keepLast30(state.metricHistory.btcPrice, activeData.markPrice || activeData.latestBtcMarkPrice || 0),
        fundingZ: keepLast30(state.metricHistory.fundingZ, activeData.fundingRateZScore || 0),
        oiChange: keepLast30(state.metricHistory.oiChange, activeData.oiChangePct || 0),
        tickets: keepLast30(state.metricHistory.tickets, mergedMetrics.supportTickets?.ticketBacklog || 0),
        sentiment: keepLast30(state.metricHistory.sentiment, mergedMetrics.sentiment?.score || 50),
      },
      multiLineHistory: keepLast360(state.multiLineHistory, {
        time: now,
        liqCount60s: mergedMetrics.liqCount60s || 0,
        supportLoad: mergedMetrics.supportTickets?.ticketBacklog || 0,
        fcss
      })
    };
  }),
  addLiquidation: (liq) => set((state) => ({
    liquidations: [...state.liquidations, liq].slice(-1000), // Keep last 1000 for 15m window
    sessionLiqCount: state.sessionLiqCount + 1,
    sessionLiqUSD: state.sessionLiqUSD + liq.value
  })),
  updateKline: (kline) => set((state) => ({
    lastKline: kline,
    lastKlines: {
      ...(state.lastKlines || {}),
      [kline.symbol]: kline
    }
  })),
  addAlert: (alert) => set((state) => {
    // avoid duplicates if same id exists
    if (state.activeAlerts.find(a => a.id === alert.id)) return state;
    return { activeAlerts: [alert, ...state.activeAlerts].slice(0, 50) };
  }),
  removeAlert: (id) => set((state) => ({
    activeAlerts: state.activeAlerts.filter(a => a.id !== id)
  })),
  clearAllAlerts: () => set({ activeAlerts: [] }),
  // Cases
  setActiveCaseId: (id) => set({ activeCaseId: id }),
  addOrUpdateCase: (newCase) => set((state) => ({
    cases: { ...state.cases, [newCase.id]: newCase }
  })),
  addAgentLog: ({ caseId, log }) => set((state) => {
    const c = state.cases[caseId];
    if (!c) return state;
    return {
      cases: {
        ...state.cases,
        [caseId]: {
          ...c,
          agentLogs: [...(c.agentLogs || []), log]
        }
      }
    };
  })
}));

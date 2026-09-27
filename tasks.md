# SENTINEL - Build Tracker

## Phase 1 — Live Data Foundation
- [x] 1. Set up `/server` with Express + Socket.io.
- [x] 2. Implement `binance.js`: connect `!forceOrder@arr` + `!markPrice@arr@1s` + `btcusdt@kline_1m` + `btcusdt@aggTrade`.
- [x] 3. Implement `aggregator.js`: compute all 8 metrics every 5s.
- [x] 4. Implement `thresholdEngine.js` with default thresholds.
- [x] 5. Implement `socketGateway.js`: broadcast events to clients.
- [x] 6. Set up REST polls (open interest, funding history, long/short ratio, taker volume, news).
- [ ] 7. Verify: connect a raw Socket.io client and see real data.

## Phase 2 — Client Shell + Dashboard
- [x] 8. Set up `/client` with React + Vite + Tailwind + design tokens.
- [x] 9. Build Sidebar + TopBar (layout shell).
- [x] 10. Build KPICard with sparkline (zustand + Socket.io).
- [x] 11. Build PriceChart with lightweight-charts + liquidation markers.
- [x] 12. Build FCSSGauge (Recharts RadialBar).
- [x] 13. Build AlertsPanel (consuming Socket.io "alert" events).
- [x] 14. Build NewsFeed (polling cryptocurrency.cv).
- [x] 15. Build LiqHeatmap (custom SVG).

## Phase 3 — Dispute Investigation
- [x] 16. Port Nyaya agents to `/server/agents/` with new system prompts.
- [x] 17. Implement `caseStore.js`: auto-create cases from forceOrder > $10k.
- [x] 18. Build CaseQueue + CaseDetail + AgentStream components.
- [x] 19. Connect SSE pipeline from server to CaseDetail.
- [x] 20. Build VerdictCard with approve/override flow.
- [x] 21. Integrate memory/agent layer (Groq LLM streaming).

## Phase 4 — Alerts, Comms, Timeline
- [x] 22. Build Alerts screen: threshold config + alert management.
- [x] 23. Build Communications screen: templates + composer + AI assist.
- [x] 24. Build Timeline screen: event log + decision quality panel.
- [x] 25. Build PlaybookDrawer (global).
- [x] 26. Implement export: incident report download.

## Phase 5 — ML + Differentiators
- [x] 27. Train model in Colab (can do in parallel).
- [x] 28. Place `model.onnx` in `/server/ml/`.
- [x] 29. Implement `inference.js`.
- [x] 30. Add "ML Early Warning" badge to Dashboard.
- [x] 31. Implement Focus Mode (FCSS > 70).
- [x] 32. Implement Liquidation Wave Detector.
- [x] 33. Implement Audit-Ready Case Dossier export.
- [x] 34. Final polish: animations, loading states, tooltips.

## Phase 6 — Simulation Engine & ML Replay (Completed)
- [x] 35. Create `scenarios.json` with 5 historically accurate crash dossiers (FTX, Luna, COVID, China Ban, Leverage Flush).
- [x] 36. Build `SimulationEngine.js` backend to mock and stream frames dynamically.
- [x] 37. Complete `Simulation.jsx` frontend 3-column layout (Chart, Library, ML Evaluator).
- [x] 38. Integrate `lightweight-charts` with real-time socket updates for Candles and FCSS anomaly index.
- [x] 39. Refactor `inference.js` to store an 8-feature ML Tensor state.
- [x] 40. Implement "View Full Feature Tensor" dialog box with visual impact bars and real-time normalized inputs.
- [x] 41. Fix edge cases (Flex shrink overlapping, PriceScale bounding, ResizeObserver animation lag, ML panel toggle).

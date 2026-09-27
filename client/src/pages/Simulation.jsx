import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Save, Upload, Activity, FileText, CheckCircle, AlertTriangle, X, ChevronDown, ChevronUp, RotateCcw, BarChart2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from 'recharts';
import { createChart, CrosshairMode, LineStyle } from 'lightweight-charts';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../hooks/useSocket';
import CrashAnalyser from '../components/simulation/CrashAnalyser';

export default function Simulation() {
  const socket = useSocket();
  const [scenarios, setScenarios] = useState([]);
  const [activeScenario, setActiveScenario] = useState(null);
  
  // Left Panel State
  const chartContainerRef = useRef(null);
  const chartInstance = useRef(null);
  const candleSeries = useRef(null);
  const fcssSeries = useRef(null);
  const markersByTime = useRef({});
  const [simState, setSimState] = useState('idle'); // idle, loading, running, completed
  const [loadingStep, setLoadingStep] = useState(null);
  const [stats, setStats] = useState({ frame: 0, totalFrames: 720, speed: 1, time: '', price: null, fcss: null, liqs: 0, liqUSD: 0 });
  const [isPaused, setIsPaused] = useState(false);
  const [simSummary, setSimSummary] = useState(null);
  
  // Right Panel State — 'ml' or 'analysis'
  const [rightPanel, setRightPanel] = useState('ml');
  const [completedScenarioId, setCompletedScenarioId] = useState(null);
  const [mlData, setMlData] = useState(null);
  const [mlHistory, setMlHistory] = useState([]);
  const [showTensorModal, setShowTensorModal] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);
  const [isMlEvaluatorOpen, setIsMlEvaluatorOpen] = useState(false);

  // Right panel toggle: 'ml' | 'analysis'
  useEffect(() => {
    fetch('http://localhost:3001/api/simulation/scenarios')
      .then(r => r.json())
      .then(data => setScenarios(data.scenarios || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    socket.on('sim:loading_step', (data) => {
      setSimState('loading');
      setLoadingStep(data.label);
    });
    
    socket.on('sim:ready', (data) => {
      setSimState('running');
      setStats(s => ({ ...s, totalFrames: data.totalFrames, frame: 0 }));
      initChart();
    });
    
    socket.on('sim:frame', (frame) => {
      setStats(s => ({
        ...s,
        frame: frame.index,
        time: new Date(frame.timestamp).toISOString().substr(11, 5) + ' UTC',
        price: frame.candle.close,
        fcss: frame.fcss,
        liqs: frame.liqCount,
        liqUSD: frame.liqUSD
      }));
      
      if (candleSeries.current && fcssSeries.current) {
        const time = Math.floor(frame.timestamp / 1000);
        candleSeries.current.update({
          time,
          open: frame.candle.open,
          high: frame.candle.high,
          low: frame.candle.low,
          close: frame.candle.close
        });
        fcssSeries.current.update({ time, value: frame.fcss });

        // Keep chart advancing in real-time as candles update
        if (chartInstance.current) {
          chartInstance.current.timeScale().scrollToRealTime();
        }
        
        if (frame.liqCount > 0) {
          const timeKey = Math.floor(frame.timestamp / 60000) * 60;
          if (!markersByTime.current[timeKey]) {
            markersByTime.current[timeKey] = { count: 0, totalUSD: 0 };
          }
          markersByTime.current[timeKey].count += 1;
          markersByTime.current[timeKey].totalUSD += frame.liqUSD;
          
          const markers = Object.entries(markersByTime.current).map(([t, data]) => ({
            time: parseInt(t),
            position: 'belowBar',
            color: '#FF3B6B',
            shape: data.totalUSD > 2000000 ? 'arrowUp' : 'circle',
            size: data.totalUSD > 5000000 ? 3 : data.totalUSD > 1000000 ? 2 : 1,
            text: `${data.count > 1 ? data.count + '× ' : ''}$${(data.totalUSD/1e6).toFixed(1)}M`
          }));
          candleSeries.current.setMarkers(markers);
        }
      }
    });

    socket.on('sim:alert_fired', (data) => {
      if (candleSeries.current) {
        const markers = candleSeries.current.markers() || [];
        markers.push({
          time: Math.floor(data.time / 1000), position: 'aboveBar', color: '#FFB020', shape: 'arrowDown', size: 2, text: '⚠ ALERT'
        });
        candleSeries.current.setMarkers(markers);
      }
    });

    socket.on('sim:completed', (data) => {
      setSimState('completed');
      setSimSummary(data);
      // Use ref to avoid stale closure — activeScenario state is null in this effect
      const scenarioId = activeScenarioRef.current?.id || data.scenarioId || null;
      setCompletedScenarioId(scenarioId);
      setIsMlEvaluatorOpen(true);
      setRightPanel('analysis');
    });

    socket.on('ml_prediction', (tensor) => {
      setMlData(tensor);
      setMlHistory(prev => {
        const next = [...prev, { time: new Date(tensor.timestamp).toLocaleTimeString(), prob: tensor.output.anomalyProbability * 100 }];
        return next.slice(-60);
      });
    });

    return () => {
      socket.off('sim:loading_step');
      socket.off('sim:ready');
      socket.off('sim:frame');
      socket.off('sim:completed');
      socket.off('sim:alert_fired');
      socket.off('ml_prediction');
    };
  }, [socket]);

  const initChart = () => {
    if (chartInstance.current) {
      if (chartInstance.current.resizeObserver) {
        chartInstance.current.resizeObserver.disconnect();
      }
      chartInstance.current.remove();
    }
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: 'solid', color: '#0A0D12' }, textColor: '#7A8899' },
      grid: { vertLines: { color: '#1E2732' }, horzLines: { color: '#1E2732' } },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 10,
        minBarSpacing: 3,
        rightOffset: 10,
        fixLeftEdge: false,
        fixRightEdge: false,
      },
      width: chartContainerRef.current.clientWidth || 800,
      height: chartContainerRef.current.clientHeight || 400
    });
    
    chartInstance.current = chart;
    
    candleSeries.current = chart.addCandlestickSeries({
      upColor: '#00D97E', downColor: '#FF3B6B', borderVisible: false,
      wickUpColor: '#00D97E', wickDownColor: '#FF3B6B',
      title: 'BTCUSDT Perpetual — Simulation',
      priceScaleId: 'left'
    });
    
    fcssSeries.current = chart.addLineSeries({
      color: '#FFB020', lineWidth: 2, priceScaleId: 'right', title: 'FCSS'
    });
    
    chart.priceScale('right').applyOptions({
      visible: true,
      autoScale: false,
      mode: 0,
      scaleMargins: { top: 0.65, bottom: 0 },
    });
    
    chart.priceScale('left').applyOptions({
      visible: true,
      autoScale: true,
      scaleMargins: { top: 0.1, bottom: 0.25 },
    });

    const handleResize = () => {
      if (chartContainerRef.current && chartInstance.current) {
        chartInstance.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);

    // Clean up observer when chart is destroyed
    chartInstance.current.resizeObserver = resizeObserver;
  };

  // We no longer need the isMlEvaluatorOpen useEffect since ResizeObserver handles it


  const activeScenarioRef = useRef(null);

  const loadScenario = (scenario) => {
    markersByTime.current = {};
    setActiveScenario(scenario);
    activeScenarioRef.current = scenario;
    setSimState('idle');
    setMlHistory([]);
    setCompletedScenarioId(null);
    setRightPanel('ml');
    setIsMlEvaluatorOpen(false);
    fetch('http://localhost:3001/api/simulation/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId: scenario.id, speed: stats.speed })
    });
  };

  return (
    <div className="flex gap-4 h-full w-full overflow-hidden text-sm">
      {/* Column 1: Active Session Chart */}
      <div className={`${isMlEvaluatorOpen ? 'w-[38%]' : 'flex-1'} bg-card border border-border rounded-lg flex flex-col overflow-hidden transition-all duration-300`}>
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="text-lg font-bold text-primary flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent-red" />
            Active Session / Recording
          </h2>
        </div>
        
        <div className="flex-1 relative flex flex-col">
          {/* CHART AREA */}
          <div className="flex-1 min-h-[400px] relative bg-[#0A0D12]" ref={chartContainerRef}>
            {simState === 'idle' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center border-2 border-dashed border-[#1E2732] m-4 rounded">
                <p className="text-primary font-bold">Select a scenario and click LOAD & RUN to begin</p>
                <p className="text-secondary text-xs mt-1">The crash will replay here in real time</p>
              </div>
            )}
            {simState === 'loading' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0D12] z-10">
                <div className="w-8 h-8 rounded-full border-2 border-accent-blue border-t-transparent animate-spin mb-4" />
                <p className="text-accent-blue font-mono text-xs">{loadingStep}</p>
              </div>
            )}
            {simState === 'completed' && simSummary && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
                <div className="bg-[#12161C] border border-accent-green p-6 rounded-lg w-3/4 max-w-md shadow-2xl">
                  <h3 className="text-accent-green font-bold text-lg mb-2 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" /> SIMULATION COMPLETE
                  </h3>
                  <div className="text-xs text-secondary space-y-1 mb-6 font-mono">
                    <p>Scenario: {simSummary.scenario}</p>
                    <p>Peak FCSS: {simSummary.peakFcss} (CRISIS)</p>
                    <p>Total Liqs: {simSummary.totalLiqs} (${(simSummary.totalLiqUSD/1000000).toFixed(1)}M)</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => loadScenario(activeScenario)} className="flex-1 py-2 bg-[#1E2732] hover:bg-[#2A3644] text-primary rounded font-bold text-xs uppercase flex justify-center items-center gap-1">
                      <RotateCcw className="w-3 h-3" /> Run Again
                    </button>
                    <button
                      onClick={() => { setSimState('idle'); setIsMlEvaluatorOpen(true); setRightPanel('analysis'); }}
                      className="flex-1 py-2 rounded font-bold text-xs uppercase flex justify-center items-center gap-1"
                      style={{ background: '#9B59B6', color: '#fff' }}
                    >
                      <BarChart2 className="w-3 h-3" /> ✦ Analyse Crash
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* STATS BAR */}
          <div className="h-16 bg-[#0F1318] border-t border-b border-border px-4 py-2 flex flex-col justify-center gap-1 font-mono text-xs text-center">
            <div className="text-secondary">
              Sim Time: {stats.time || '--:--'} &nbsp;|&nbsp; Frame: {stats.frame}/{stats.totalFrames} &nbsp;|&nbsp; Speed: {stats.speed}×
            </div>
            <div className="text-primary font-bold">
              Price: {stats.price === null ? "Waiting..." : `$${stats.price.toFixed(2)}`} &nbsp;|&nbsp; 
              <span className={stats.fcss > 70 ? 'text-accent-red' : 'text-accent-cyan'}>
                FCSS: {stats.fcss === null ? "—" : stats.fcss}
              </span> &nbsp;|&nbsp; 
              Liqs: {stats.liqs} (${(stats.liqUSD/1000000).toFixed(1)}M)
            </div>
          </div>
          
          {/* CONTROLS BAR */}
          <div className="p-4 bg-card">
            <div className="flex justify-between items-center mb-3">
              <div className="flex gap-2">
                <button disabled={isPaused || simState!=='running'} onClick={() => { setIsPaused(true); socket.emit('sim:pause'); }} className="px-3 py-1.5 bg-[#1E2732] disabled:opacity-50 text-primary text-xs font-bold rounded flex items-center gap-1 hover:bg-[#2A3644] transition-colors">
                  <Pause className="w-3 h-3" /> PAUSE
                </button>
                <button disabled={!isPaused || simState!=='running'} onClick={() => { setIsPaused(false); socket.emit('sim:resume'); }} className="px-3 py-1.5 bg-[#1E2732] disabled:opacity-50 text-primary text-xs font-bold rounded flex items-center gap-1 hover:bg-[#2A3644] transition-colors">
                  <Play className="w-3 h-3" /> RESUME
                </button>
                <button disabled={simState==='idle'} onClick={() => { if(window.confirm('Reset simulation?')) { setSimState('idle'); markersByTime.current = {}; socket.emit('sim:reset'); if (candleSeries.current) candleSeries.current.setData([]); if (fcssSeries.current) fcssSeries.current.setData([]); } }} className="px-3 py-1.5 bg-[#1E2732] disabled:opacity-50 text-accent-red text-xs font-bold rounded flex items-center gap-1 hover:bg-[#2A3644] transition-colors">
                  <RotateCcw className="w-3 h-3" /> RESET
                </button>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-secondary text-xs mr-1 font-mono">Speed:</span>
                {[1, 5, 10, 30, 60].map(s => (
                  <button key={s} onClick={() => { setStats(prev => ({...prev, speed: s})); socket.emit('sim:speed', s); }} className={`px-2.5 py-1 text-xs rounded font-mono transition-all ${stats.speed === s ? 'bg-accent-cyan text-black font-bold shadow-[0_0_12px_rgba(0,229,255,0.4)]' : 'bg-[#1E2732] text-secondary hover:text-primary hover:bg-[#2A3644]'}`}>
                    {s}×
                  </button>
                ))}
                <div className="h-4 w-[1px] bg-border mx-1" />
                <button
                  onClick={() => chartInstance.current?.timeScale().fitContent()}
                  className="px-2 py-1 bg-[#1E2732] hover:bg-[#2A3644] text-secondary hover:text-primary text-[11px] font-mono rounded"
                  title="Fit all candles in viewport"
                >
                  Fit
                </button>
                <button
                  onClick={() => chartInstance.current?.timeScale().scrollToRealTime()}
                  className="px-2 py-1 bg-[#1E2732] hover:bg-[#2A3644] text-accent-cyan text-[11px] font-mono rounded"
                  title="Auto-scroll to latest candle"
                >
                  Follow
                </button>
              </div>
            </div>
            
            {/* PROGRESS BAR */}
            <div className="w-full h-2 bg-[#0F1318] rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-accent-cyan" 
                style={{ width: `${(stats.frame / stats.totalFrames) * 100 || 0}%` }}
                layout
              />
            </div>
          </div>
        </div>
      </div>

      {/* Column 2: Scenario Library (35%) */}
      <div className={`${isMlEvaluatorOpen ? 'w-[35%]' : 'w-[400px]'} shrink-0 bg-card border border-border rounded-lg flex flex-col overflow-hidden transition-all duration-300`}>
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="text-lg font-bold text-primary flex items-center gap-2">
            <Upload className="w-5 h-5 text-accent-blue" />
            Scenario Library
          </h2>
          <div className="flex items-center gap-2">
            <span className="bg-[#1E2732] text-secondary text-xs px-2 py-1 rounded hidden 2xl:inline-block">{scenarios.length} Scenarios</span>
            <div className="flex gap-1">
              <button
                onClick={() => { setIsMlEvaluatorOpen(true); setRightPanel('ml'); }}
                className={`text-xs font-bold px-3 py-1 rounded transition-colors ${isMlEvaluatorOpen && rightPanel === 'ml' ? 'bg-accent-cyan/20 text-accent-cyan' : 'bg-[#1E2732] text-secondary hover:text-primary'}`}
              >
                SHOW ML
              </button>
              <button
                onClick={() => { setIsMlEvaluatorOpen(true); setRightPanel('analysis'); }}
                className={`text-xs font-bold px-3 py-1 rounded transition-colors ${isMlEvaluatorOpen && rightPanel === 'analysis' ? 'bg-purple-500/20 text-purple-400' : 'bg-[#1E2732] text-secondary hover:text-primary'}`}
              >
                ✦ ANALYSE
              </button>
              {isMlEvaluatorOpen && (
                <button onClick={() => setIsMlEvaluatorOpen(false)} className="text-xs font-bold px-2 py-1 rounded bg-[#1E2732] text-secondary hover:text-primary">✕</button>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {scenarios.map(s => (
            <div key={s.id} className="bg-[#12161C] rounded-lg border border-border overflow-hidden shrink-0">
              <div className="p-4 cursor-pointer hover:bg-[#151A21] transition-colors" onClick={() => setExpandedCard(expandedCard === s.id ? null : s.id)}>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-primary font-bold">{s.name} <span className="text-secondary font-normal ml-2">{s.subtitle}</span></h4>
                  <span className="text-[10px] bg-[#0F1318] px-2 py-1 rounded text-secondary font-mono">{s.stats.sizeMB}</span>
                </div>
                <p className="text-xs text-secondary mb-3 line-clamp-2">{s.shortSummary}</p>
                
                <div className="flex gap-4 text-[10px] font-mono mb-3">
                  <span className="text-accent-red font-bold">DROP: {s.stats.maxDropPct}%</span>
                  <span className="text-secondary">DUR: {s.stats.durationHours}h</span>
                  <span className="text-accent-cyan">LIQ: ${(s.stats.peakLiqUSD/1000000000).toFixed(1)}B</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-[10px] bg-accent-blue bg-opacity-20 text-accent-blue px-2 py-0.5 rounded uppercase font-bold">{s.causeTag}</span>
                  <span className="text-xs text-accent-blue hover:underline flex items-center gap-1">
                    {expandedCard === s.id ? <><ChevronUp className="w-3 h-3" /> COLLAPSE</> : <><ChevronDown className="w-3 h-3" /> VIEW FULL CRASH DOSSIER</>}
                  </span>
                </div>
              </div>
              
              <AnimatePresence>
                {expandedCard === s.id && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-border">
                    <div className="p-4 bg-[#0A0D12] text-xs">
                      <div className="mb-4">
                        <h5 className="text-primary font-bold mb-1">ROOT CAUSE</h5>
                        <p className="text-secondary">{s.rootCause}</p>
                      </div>
                      
                      <div className="mb-4">
                        <h5 className="text-primary font-bold mb-2">CHRONOLOGICAL TIMELINE</h5>
                        <div className="border-l border-[#1E2732] ml-2 pl-4 space-y-4">
                          {s.keyMoments.map((km, i) => (
                            <div key={i} className="relative">
                              <div className="absolute w-2 h-2 bg-accent-blue rounded-full -left-[21px] top-1"></div>
                              <p className="font-mono text-[10px] text-accent-cyan mb-1">{km.time}</p>
                              <p className="text-secondary leading-relaxed">{km.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <h5 className="text-primary font-bold mb-1">WHAT DROVE THE METRICS</h5>
                        <p className="text-secondary whitespace-pre-line">{s.metricsNarrative}</p>
                      </div>
                      
                      <div>
                        <h5 className="text-accent-green font-bold mb-1">LESSONS FOR OPS TEAMS</h5>
                        <ul className="text-secondary space-y-1">
                          {s.lessons.map((l, i) => <li key={i}>{l}</li>)}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="p-3 bg-[#12161C] border-t border-border">
                <button onClick={() => loadScenario(s)} className="w-full py-2 bg-accent-green bg-opacity-20 hover:bg-opacity-30 text-accent-green font-bold text-xs uppercase rounded flex justify-center items-center gap-2 transition-colors">
                  <Play className="w-4 h-4" /> Load & Run {s.name}
                </button>
              </div>
            </div>
          ))}
          
          {/* CUSTOM SCENARIO BUTTON */}
          <div className="p-4 border border-dashed border-[#1E2732] rounded-lg bg-card text-center cursor-pointer hover:border-accent-blue transition-colors">
            <span className="text-secondary font-bold text-xs uppercase">[ + CUSTOM SCENARIO ]</span>
          </div>
        </div>
      </div>

      {/* Column 3: ML Evaluator OR Crash Analyser */}
      {isMlEvaluatorOpen && (
        <div className="w-[27%] shrink-0 bg-card border border-border rounded-lg flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h2 className="text-lg font-bold text-primary flex items-center gap-2">
              {rightPanel === 'ml'
                ? <><FileText className="w-5 h-5 text-accent-cyan" /> ML Evaluator</>
                : <><BarChart2 className="w-5 h-5 text-purple-400" /> Crash Analyser</>}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-secondary">LIVE</span>
              <div className="w-2 h-2 bg-accent-green rounded-full animate-pulse"></div>
            </div>
          </div>

          {/* ── ML Panel ── */}
          {rightPanel === 'ml' && (
            <div className="flex-1 flex flex-col p-4 overflow-y-auto">
              {!mlData ? (
                <div className="flex-1 flex items-center justify-center text-secondary text-xs">Waiting for model inference...</div>
              ) : (
                <>
                  {/* TOP: Current Prediction */}
                  <div className="flex flex-col items-center mb-6">
                    <h3 className={`text-lg font-bold uppercase mb-2 ${mlData.output.label.includes('CRISIS') ? 'text-accent-red' : mlData.output.label.includes('ELEVATED') ? 'text-accent-orange' : 'text-accent-green'}`}>
                      {mlData.output.label}
                    </h3>
                    <div className="relative w-32 h-32 flex items-center justify-center mb-2">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#1E2732" strokeWidth="8" />
                        <circle cx="50" cy="50" r="40" fill="none" stroke={mlData.output.label.includes('CRISIS') ? '#FF3B6B' : mlData.output.label.includes('ELEVATED') ? '#FFB020' : '#00D97E'} strokeWidth="8" strokeDasharray={`${(mlData.output.anomalyProbability * 100 * 2.51)} 251`} />
                      </svg>
                      <div className="absolute text-2xl font-bold text-primary">{(mlData.output.anomalyProbability * 100).toFixed(1)}%</div>
                    </div>
                    <span className="text-[10px] text-secondary font-mono">Model Confidence / Probability</span>
                  </div>

                  {/* MIDDLE: Context Cards */}
                  <div className="grid grid-cols-2 gap-2 mb-6">
                    <div className="bg-[#12161C] p-3 rounded border border-border">
                      <h4 className="text-[10px] text-secondary uppercase font-bold mb-1">Dominant Signal</h4>
                      <p className="text-xs text-primary truncate">
                        {Object.entries(mlData.features).sort((a,b)=>b[1].normalized - a[1].normalized)[0][0]}
                      </p>
                    </div>
                    <div className="bg-[#12161C] p-3 rounded border border-border">
                      <h4 className="text-[10px] text-secondary uppercase font-bold mb-1">Risk Trend</h4>
                      <p className="text-xs text-accent-red">▲ Increasing</p>
                    </div>
                    <div className="bg-[#12161C] p-3 rounded border border-border">
                      <h4 className="text-[10px] text-secondary uppercase font-bold mb-1">Last Spike</h4>
                      <p className="text-xs text-primary truncate">Never this session</p>
                    </div>
                    <div className="bg-[#12161C] p-3 rounded border border-border">
                      <h4 className="text-[10px] text-secondary uppercase font-bold mb-1">Model Status</h4>
                      <p className="text-xs text-accent-green">ONNX loaded ✓</p>
                    </div>
                  </div>

                  {/* BOTTOM: History Chart */}
                  <div className="flex-1 min-h-[120px] mb-4 relative">
                    <h4 className="text-[10px] text-secondary uppercase font-bold mb-2 absolute z-10">Probability History (Last 5m)</h4>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={mlHistory}>
                        <defs>
                          <linearGradient id="colorProb" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FF3B6B" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#00D97E" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="time" hide />
                        <YAxis domain={[0, 100]} hide />
                        <ReferenceLine y={50} stroke="#FFB020" strokeDasharray="3 3" />
                        <ReferenceLine y={70} stroke="#FF3B6B" strokeDasharray="3 3" />
                        <Area type="monotone" dataKey="prob" stroke="#00E5FF" fillOpacity={1} fill="url(#colorProb)" isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <button onClick={() => setShowTensorModal(true)} className="w-full py-3 bg-[#0F1318] border border-border hover:border-accent-blue text-secondary hover:text-accent-blue text-xs font-bold uppercase rounded transition-colors mt-auto">
                    View Full Feature Tensor
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── Crash Analyser Panel ── */}
          {rightPanel === 'analysis' && (
            <div className="flex-1 overflow-hidden">
              <CrashAnalyser scenarioId={completedScenarioId} />
            </div>
          )}
        </div>
      )}
      
      {/* FEATURE TENSOR MODAL */}
      {showTensorModal && mlData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
          <div className="bg-card border border-border p-6 rounded-lg shadow-2xl w-[700px] flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-primary flex items-center gap-2 mb-1">
                  <FileText className="w-6 h-6 text-accent-cyan" /> Feature Tensor — Model Input
                </h3>
                <p className="text-xs text-secondary">These are the exact 8 values fed to the ONNX model right now.</p>
              </div>
              <button onClick={() => setShowTensorModal(false)} className="text-secondary hover:text-primary">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="bg-[#0F1318] rounded-lg border border-[#1E2732] overflow-hidden mb-6">
              <div className="flex justify-between items-center bg-[#151A21] p-3 border-b border-[#1E2732]">
                <span className="text-xs text-secondary font-mono">Last computed: {mlData.output.inferenceTimeMs}ms ago</span>
                <button onClick={() => {}} className="text-[10px] text-accent-cyan font-bold uppercase">[ REFRESH ]</button>
              </div>
              
              <table className="w-full text-left text-xs">
                <thead className="bg-[#12161C] text-secondary uppercase border-b border-[#1E2732]">
                  <tr>
                    <th className="px-4 py-2 font-normal">Feature Name</th>
                    <th className="px-4 py-2 font-normal">Raw Value</th>
                    <th className="px-4 py-2 font-normal">Normalized (0-1)</th>
                    <th className="px-4 py-2 font-normal">Impact</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {Object.entries(mlData.features).map(([key, val]) => {
                    const norm = val.normalized;
                    let color = 'bg-[#3B4856]';
                    let label = 'LOW';
                    if (norm > 0.6) { color = 'bg-accent-red'; label = 'HIGH'; }
                    else if (norm > 0.3) { color = 'bg-accent-orange'; label = 'MED'; }
                    
                    return (
                      <tr key={key} className="border-b border-[#1E2732] last:border-0 hover:bg-[#151A21]">
                        <td className="px-4 py-3 text-primary">{key}</td>
                        <td className="px-4 py-3 text-secondary">{typeof val.raw === 'number' ? val.raw.toPrecision(4) : val.raw}</td>
                        <td className="px-4 py-3 text-accent-cyan">{norm.toFixed(3)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="w-8 text-[10px]">{label}</span>
                            <div className="w-24 h-1.5 bg-[#0A0D12] rounded overflow-hidden">
                              <div className={`h-full ${color}`} style={{ width: `${norm * 100}%` }}></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              <div className="p-3 bg-[#12161C] border-t border-[#1E2732] flex justify-between items-center text-xs font-mono">
                <span className="text-secondary">MODEL OUTPUT: Anomaly Probability = <span className="text-primary font-bold">{(mlData.output.anomalyProbability*100).toFixed(1)}%</span></span>
                <span className={`font-bold ${mlData.output.label.includes('CRISIS') ? 'text-accent-red' : 'text-accent-green'}`}>Label = {mlData.output.label}</span>
              </div>
            </div>
            
            <div className="text-xs text-secondary leading-relaxed p-4 bg-[#12161C] rounded border border-border">
              <strong className="text-primary block mb-1">How the model works:</strong>
              This Random Forest model was trained on 5,000 1-minute samples of BTCUSDT perpetual data. It predicts whether a flash crash (FCSS &gt; 80) will occur in the next 5 minutes. Features are normalized to [0,1] before being passed to the model. The model outputs a probability between 0 and 1. This is not a trading signal — it is an ops early warning system.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

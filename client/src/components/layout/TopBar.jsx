import React, { useState, useEffect, useCallback } from 'react';
import { useIncidentStore } from '../../store/incidentStore';
import { Brain, Bell, Clock, Zap, X, CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

function ClockDisplay() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="flex items-center gap-2 text-secondary">
      <Clock className="w-4 h-4" />
      <span className="text-sm font-mono tabular-nums">{format(time, 'HH:mm:ss')}</span>
    </div>
  );
}

// ── ASSETS ──────────────────────────────────────────────────────────────────
const ASSETS = [
  { label: 'BTC', symbol: 'BTCUSDT' },
  { label: 'ETH', symbol: 'ETHUSDT' },
  { label: 'SOL', symbol: 'SOLUSDT' },
];

export default function TopBar({ title }) {
  const navigate = useNavigate();
  const activeAlerts    = useIncidentStore(state => state.activeAlerts);
  const currentIncident = useIncidentStore(state => state.currentIncident);
  const clearAllAlerts  = useIncidentStore(state => state.clearAllAlerts);
  const mlData          = useIncidentStore(state => state.metrics.ml?.[state.selectedAsset] || state.metrics.ml?.primary);
  const anomalyStatus   = mlData?.label || 'NOMINAL';
  const anomalyProb     = mlData?.probability || 0;
  const selectedAsset   = useIncidentStore(state => state.selectedAsset);
  const setSelectedAsset = useIncidentStore(state => state.setSelectedAsset);

  const hasIncident = !!currentIncident || activeAlerts.length > 0;

  // Demo mode state
  const [demoRunning, setDemoRunning]   = useState(false);
  const [demoToast, setDemoToast]       = useState('');

  // Incident close suggestion toast
  const [suggestClose, setSuggestClose] = useState(false);

  // Quick-close incident modal
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeNote, setCloseNote]           = useState('');

  // Listen for suggest_incident_close from server via store
  useEffect(() => {
    // Poll every 5s for the suggestion flag (set by useSocket.js)
    const check = () => {
      const flag = window.__sentinelSuggestClose;
      if (flag && currentIncident) setSuggestClose(true);
    };
    const t = setInterval(check, 5000);
    return () => clearInterval(t);
  }, [currentIncident]);

  const handleQuickClose = async () => {
    try {
      await fetch('http://localhost:3001/api/incidents/close-if-open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution: closeNote || 'Closed by operator via TopBar' })
      });
      useIncidentStore.getState().setCurrentIncident(null);
    } catch (e) { console.error(e); }
    setShowCloseModal(false);
    setSuggestClose(false);
    window.__sentinelSuggestClose = false;
  };

  const startDemoMode = useCallback(async () => {
    if (demoRunning) return;
    setDemoRunning(true);
    setDemoToast('⚡ Preparing demo — clearing state...');

    // 1. ACK all alerts
    await fetch('http://localhost:3001/api/alerts/ack-all', { method: 'POST' });
    clearAllAlerts();

    // 2. Close any open incident
    await fetch('http://localhost:3001/api/incidents/close-if-open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution: 'Demo mode — clean slate' })
    });
    useIncidentStore.getState().setCurrentIncident(null);

    // 3. Navigate to simulation
    setDemoToast('⚡ DEMO MODE — navigating to simulation...');
    setTimeout(() => {
      navigate('/simulation');
      setDemoToast('⚡ DEMO MODE ACTIVE — Start a scenario to see the full system in action!');
    }, 1000);

    // 4. Auto-clear toast after 30s
    setTimeout(() => {
      setDemoToast('');
      setDemoRunning(false);
    }, 30000);
  }, [demoRunning, clearAllAlerts, navigate]);

  return (
    <>
      <header className="h-14 bg-card border-b border-border flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-semibold text-primary">{title}</h1>

          {/* Asset Selector — all 3 always rendered */}
          <div className="flex bg-[#0F1318] p-1 rounded-md border border-border">
            {ASSETS.map(({ label, symbol }) => (
              <button
                key={symbol}
                onClick={() => setSelectedAsset(symbol)}
                className={clsx(
                  'px-3 py-1 text-xs font-bold rounded transition-colors',
                  selectedAsset === symbol
                    ? 'bg-accent-blue text-background'
                    : 'text-secondary hover:text-primary'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Incident pill — clickable to open close modal */}
          <button
            onClick={() => hasIncident && setShowCloseModal(true)}
            className={clsx(
              'flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all',
              hasIncident
                ? 'bg-accent-red/20 border-accent-red hover:bg-accent-red/30 cursor-pointer'
                : 'bg-elevated border-border cursor-default'
            )}
            title={hasIncident ? 'Click to close incident' : ''}
          >
            <div className={clsx(
              'w-2 h-2 rounded-full',
              hasIncident ? 'bg-accent-red animate-pulse' : 'bg-accent-green'
            )} />
            <span className={clsx(
              'text-xs font-mono font-medium',
              hasIncident ? 'text-accent-red' : 'text-primary'
            )}>
              SYS: {hasIncident ? 'CRITICAL INCIDENT' : 'NOMINAL'}
            </span>
          </button>

          {/* ML pill */}
          <div className={clsx(
            'flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors',
            anomalyStatus === 'HIGH RISK'
              ? 'bg-accent-red/20 border-accent-red text-accent-red'
              : anomalyStatus === 'ELEVATED'
              ? 'bg-accent-orange/20 border-accent-orange text-accent-orange'
              : 'bg-[#12161C] border-border text-accent-blue'
          )}>
            <Brain className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">ML Early Warning: {anomalyStatus}</span>
            <span className="text-xs font-mono opacity-80">{(anomalyProb * 100).toFixed(1)}%</span>
          </div>

          <ClockDisplay />

          <button className="relative p-2 text-secondary hover:text-primary transition-colors">
            <Bell className="w-5 h-5" />
            {activeAlerts.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-accent-red rounded-full" />
            )}
          </button>

          {/* ⚡ Demo Mode button */}
          <button
            onClick={startDemoMode}
            disabled={demoRunning}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase transition-all border',
              demoRunning
                ? 'bg-accent-amber/30 border-accent-amber text-accent-amber animate-pulse cursor-not-allowed'
                : 'bg-accent-amber/10 border-accent-amber/50 text-accent-amber hover:bg-accent-amber/20'
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            {demoRunning ? 'Demo Running...' : 'Demo Mode'}
          </button>
        </div>
      </header>

      {/* Demo toast banner */}
      {demoToast && (
        <div className="w-full bg-accent-amber/20 border-b border-accent-amber/50 px-6 py-2 flex items-center justify-between z-40">
          <span className="text-accent-amber text-xs font-bold font-mono">{demoToast}</span>
          <button onClick={() => { setDemoToast(''); setDemoRunning(false); }} className="text-accent-amber hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Suggest close banner */}
      {suggestClose && currentIncident && (
        <div className="w-full bg-accent-green/10 border-b border-accent-green/40 px-6 py-2 flex items-center justify-between z-40">
          <span className="text-accent-green text-xs font-mono">
            ✓ FCSS calm for 5+ minutes — market conditions normalized.
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCloseModal(true)}
              className="px-3 py-1 text-xs font-bold bg-accent-green/20 text-accent-green border border-accent-green/40 rounded hover:bg-accent-green/30 transition-colors"
            >
              CLOSE INCIDENT
            </button>
            <button onClick={() => setSuggestClose(false)} className="text-secondary hover:text-primary">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Quick-close incident modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl p-6 w-[420px] shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-accent-green flex items-center gap-2">
                <CheckCircle className="w-5 h-5" /> Close Incident
              </h3>
              <button onClick={() => setShowCloseModal(false)} className="text-secondary hover:text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              value={closeNote}
              onChange={e => setCloseNote(e.target.value)}
              placeholder="Resolution summary (optional)..."
              className="w-full bg-[#0F1318] border border-border rounded p-3 text-sm text-primary resize-none h-20 focus:outline-none focus:border-accent-green mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowCloseModal(false)}
                className="flex-1 py-2 border border-border rounded text-secondary text-xs font-bold uppercase hover:text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleQuickClose}
                className="flex-1 py-2 bg-accent-green text-black text-xs font-bold uppercase rounded hover:brightness-110 transition-all"
              >
                ✓ Close Incident
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

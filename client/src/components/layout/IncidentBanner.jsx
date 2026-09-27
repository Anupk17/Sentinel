import React, { useState, useEffect, useMemo } from 'react';
import { useIncidentStore } from '../../store/incidentStore';
import { AlertCircle, Clock, CheckCircle2, ChevronRight, X, Flame, AlertTriangle } from 'lucide-react';

// ── Urgency tiers based on elapsed minutes ───────────────────────────────────
const URGENCY_TIERS = [
  { minMinutes: 0,  maxMinutes: 5,  label: 'ACTIVE',   color: 'text-accent-amber',   border: 'border-accent-amber/50', bg: 'bg-accent-amber/10',  icon: AlertCircle },
  { minMinutes: 5,  maxMinutes: 15, label: 'ELEVATED',  color: 'text-accent-orange',  border: 'border-accent-orange/60', bg: 'bg-accent-orange/10', icon: AlertTriangle },
  { minMinutes: 15, maxMinutes: 30, label: 'HIGH',      color: 'text-accent-red',     border: 'border-accent-red/70',   bg: 'bg-accent-red/10',    icon: Flame },
  { minMinutes: 30, maxMinutes: Infinity, label: 'CRITICAL — ESCALATE NOW', color: 'text-white', border: 'border-accent-red', bg: 'bg-accent-red/20 animate-pulse', icon: Flame },
];

function getUrgency(elapsedMs) {
  const minutes = elapsedMs / 60000;
  return URGENCY_TIERS.find(t => minutes >= t.minMinutes && minutes < t.maxMinutes) || URGENCY_TIERS[0];
}

function formatElapsed(ms) {
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  const pad = n => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function IncidentBanner() {
  const currentIncident = useIncidentStore(state => state.currentIncident);
  const [elapsedMs, setElapsedMs]       = useState(0);
  const [showLogModal, setShowLogModal]   = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [operatorId, setOperatorId]       = useState('OP1');
  const [decisionText, setDecisionText]   = useState('');
  const [rationaleText, setRationaleText] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');

  useEffect(() => {
    if (!currentIncident) { setElapsedMs(0); return; }
    const start = currentIncident.openedAt || currentIncident.createdAt || Date.now();
    const tick = () => setElapsedMs(Date.now() - start);
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [currentIncident]);

  const urgency = useMemo(() => getUrgency(elapsedMs), [elapsedMs]);
  const UrgencyIcon = urgency.icon;

  if (!currentIncident) return null;

  const handleLogDecision = async () => {
    if (!decisionText) return;
    try {
      await fetch(`http://localhost:3001/api/incidents/${currentIncident.id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorId, decision: decisionText, rationale: rationaleText })
      });
      setShowLogModal(false);
      setDecisionText('');
      setRationaleText('');
    } catch (e) { console.error(e); }
  };

  const handleCloseIncident = async () => {
    try {
      await fetch(`http://localhost:3001/api/incidents/${currentIncident.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closedBy: operatorId, resolutionNote })
      });
      useIncidentStore.getState().setCurrentIncident(null);
      setShowCloseModal(false);
      setResolutionNote('');
    } catch (e) { console.error(e); }
  };

  const elapsedMinutes = Math.floor(elapsedMs / 60000);

  return (
    <>
      <div className={`w-full ${urgency.bg} ${urgency.border} border-b px-6 py-2.5 flex items-center justify-between font-mono z-40 relative transition-all duration-1000`}>
        
        {/* Left: incident info */}
        <div className="flex items-center gap-4">
          <UrgencyIcon className={`w-5 h-5 ${urgency.color} ${elapsedMinutes >= 15 ? 'animate-pulse' : ''} shrink-0`} />
          <div>
            <div className={`font-bold uppercase flex items-center gap-2 text-sm ${urgency.color}`}>
              INCIDENT: {currentIncident.id?.split('-')[0].toUpperCase()} — {currentIncident.name}
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${urgency.border} ${urgency.color} opacity-80`}>
                {urgency.label}
              </span>
              {currentIncident.assetFocus && (
                <span className="bg-[#12161C]/50 px-2 py-0.5 rounded text-[10px] text-secondary border border-border">
                  {currentIncident.assetFocus}
                </span>
              )}
            </div>
            <div className="text-[10px] opacity-70 flex gap-4 mt-0.5 text-secondary">
              <span>Severity: {currentIncident.severity}</span>
              <span>Assigned: {currentIncident.assignedOps?.join(' ') || 'OP1 OP2 OP3'}</span>
              {elapsedMinutes >= 5 && (
                <span className={urgency.color}>⚠ Open {elapsedMinutes}m — {elapsedMinutes >= 30 ? 'ESCALATE IMMEDIATELY' : elapsedMinutes >= 15 ? 'needs resolution' : 'monitor closely'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Right: timer + actions */}
        <div className="flex items-center gap-5 shrink-0">
          {/* Live urgency timer */}
          <div className="flex flex-col items-end">
            <div className={`flex items-center gap-2 text-xl font-bold tabular-nums ${urgency.color}`}>
              <Clock className="w-4 h-4 opacity-70" />
              {formatElapsed(elapsedMs)}
            </div>
            <div className="text-[10px] text-secondary opacity-60">time open</div>
          </div>

          {/* SLA progress bar (30min = full) */}
          <div className="w-24 flex flex-col gap-1">
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  elapsedMinutes >= 30 ? 'bg-accent-red' :
                  elapsedMinutes >= 15 ? 'bg-accent-orange' :
                  elapsedMinutes >= 5  ? 'bg-accent-amber' : 'bg-accent-green'
                }`}
                style={{ width: `${Math.min(100, (elapsedMs / (30 * 60000)) * 100)}%` }}
              />
            </div>
            <div className="text-[9px] text-secondary opacity-50 text-right">30m SLA</div>
          </div>

          <div className="flex gap-2 text-xs">
            <button
              onClick={() => setShowLogModal(true)}
              className="px-3 py-1.5 bg-[#12161C]/80 hover:bg-[#1A222C] text-primary rounded border border-border transition-colors font-bold"
            >
              [ LOG DECISION ]
            </button>
            <button
              onClick={() => setShowCloseModal(true)}
              className="px-3 py-1.5 bg-accent-green/20 hover:bg-accent-green/30 text-accent-green rounded border border-accent-green/40 transition-colors font-bold"
            >
              [ CLOSE INCIDENT ]
            </button>
          </div>
        </div>
      </div>

      {/* Log Decision Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-lg p-6 w-[500px] shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-primary">Log Decision to {currentIncident.id?.split('-')[0].toUpperCase()}</h3>
              <button onClick={() => setShowLogModal(false)} className="text-secondary hover:text-primary"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-secondary mb-1 block uppercase">Operator</label>
                <select value={operatorId} onChange={e => setOperatorId(e.target.value)} className="w-full bg-[#12161C] border border-border rounded p-2 text-primary text-sm">
                  <option value="OP1">OP1 (Lead)</option>
                  <option value="OP2">OP2 (Comms)</option>
                  <option value="OP3">OP3 (Analyst)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-secondary mb-1 block uppercase">Decision Made</label>
                <textarea value={decisionText} onChange={e => setDecisionText(e.target.value)}
                  className="w-full bg-[#12161C] border border-border rounded p-2 text-primary text-sm min-h-[80px]"
                  placeholder="e.g. Disabled withdrawals, Issued public notice..." />
              </div>
              <div>
                <label className="text-xs text-secondary mb-1 block uppercase">Rationale (Optional)</label>
                <textarea value={rationaleText} onChange={e => setRationaleText(e.target.value)}
                  className="w-full bg-[#12161C] border border-border rounded p-2 text-primary text-sm min-h-[60px]"
                  placeholder="Why this decision was made..." />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={() => setShowLogModal(false)} className="px-4 py-2 text-secondary hover:text-primary text-sm font-bold">CANCEL</button>
                <button onClick={handleLogDecision} className="px-4 py-2 bg-accent-blue text-black hover:brightness-110 rounded text-sm font-bold uppercase">Save to Log</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Close Incident Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-lg p-6 w-[500px] shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-accent-green flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> Close {currentIncident.id?.split('-')[0].toUpperCase()}
              </h3>
              <button onClick={() => setShowCloseModal(false)} className="text-secondary hover:text-primary"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-secondary mb-1 block uppercase">Closing Operator</label>
                <select value={operatorId} onChange={e => setOperatorId(e.target.value)} className="w-full bg-[#12161C] border border-border rounded p-2 text-primary text-sm">
                  <option value="OP1">OP1 (Lead)</option>
                  <option value="OP2">OP2 (Comms)</option>
                  <option value="OP3">OP3 (Analyst)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-secondary mb-1 block uppercase">Resolution Summary</label>
                <textarea value={resolutionNote} onChange={e => setResolutionNote(e.target.value)}
                  className="w-full bg-[#12161C] border border-border rounded p-2 text-primary text-sm min-h-[100px]"
                  placeholder="Summarize how the incident was resolved..." />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={() => setShowCloseModal(false)} className="px-4 py-2 text-secondary hover:text-primary text-sm font-bold">CANCEL</button>
                <button onClick={handleCloseIncident} className="px-4 py-2 bg-accent-green text-black hover:brightness-110 rounded text-sm font-bold uppercase">Close Incident</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

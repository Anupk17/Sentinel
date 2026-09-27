import React from 'react';
import { useIncidentStore } from '../../store/incidentStore';
import { ShieldAlert, AlertTriangle, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function AlertsPanel() {
  const activeAlerts = useIncidentStore(state => state.activeAlerts);
  const clearAllAlerts = useIncidentStore(state => state.clearAllAlerts);

  const ackAll = async () => {
    await fetch('http://localhost:3001/api/alerts/ack-all', { method: 'POST' });
    clearAllAlerts();
  };
  
  const getIcon = (severity) => {
    if (severity === 'HIGH') return <ShieldAlert className="w-5 h-5 text-accent-red" />;
    if (severity === 'MEDIUM') return <AlertTriangle className="w-5 h-5 text-accent-amber" />;
    return <Info className="w-5 h-5 text-secondary" />;
  };

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border flex justify-between items-center">
        <h2 className="text-sm font-semibold text-primary">
          Active Alerts {activeAlerts.length > 0 && <span className="ml-1 text-accent-red">({activeAlerts.length})</span>}
        </h2>
        <div className="flex items-center gap-3">
          {activeAlerts.length > 0 && (
            <button
              onClick={ackAll}
              className="text-xs font-bold text-accent-amber hover:text-white border border-accent-amber/40 hover:border-accent-amber px-2 py-0.5 rounded transition-colors"
            >
              ACK ALL
            </button>
          )}
          <span className="text-xs text-accent-cyan cursor-pointer hover:underline">View All in Alert Center</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <div className="flex flex-col gap-2">
          <AnimatePresence>
            {activeAlerts.slice(0, 10).map(alert => (
              <motion.div 
                key={alert.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-elevated border border-border rounded p-3 flex flex-col gap-2"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getIcon(alert.severity)}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-primary truncate">{alert.title}</h3>
                    <p className="text-xs text-secondary mt-1">{alert.body}</p>
                  </div>
                  <span className="text-[10px] text-secondary tabular-nums whitespace-nowrap">
                    {formatDistanceToNow(alert.timestamp, { addSuffix: true })}
                  </span>
                </div>
                <div className="flex gap-2 justify-end mt-1">
                  <button 
                    onClick={() => useIncidentStore.getState().removeAlert(alert.id)}
                    className="px-3 py-1 text-xs font-semibold rounded bg-border text-primary hover:bg-border/80 transition-colors"
                  >
                    ACK
                  </button>
                  <button 
                    onClick={() => {
                      useIncidentStore.getState().removeAlert(alert.id);
                      window.location.pathname = '/communications';
                    }}
                    className="px-3 py-1 text-xs font-semibold rounded bg-accent-red/10 text-accent-red hover:bg-accent-red/20 transition-colors"
                  >
                    ESCALATE
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {activeAlerts.length === 0 && (
            <div className="h-full mt-10 flex flex-col items-center justify-center text-secondary opacity-60">
              <div className="relative w-24 h-24 mb-4 rounded-full border border-border/50 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 border border-accent-blue/20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                <div className="absolute inset-2 border border-accent-blue/10 rounded-full" />
                <div className="absolute inset-0 w-1/2 h-1/2 origin-bottom-right bg-gradient-to-tr from-accent-blue/0 via-accent-blue/10 to-accent-blue/40 animate-[spin_4s_linear_infinite]" />
                <ShieldAlert className="w-8 h-8 text-accent-blue relative z-10" />
              </div>
              <p className="font-mono text-sm tracking-wide text-accent-blue">MONITORING 24/7</p>
              <p className="text-xs mt-2 opacity-50">No active alerts. System nominal.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

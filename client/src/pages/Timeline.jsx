import React, { useMemo } from 'react';
import { useIncidentStore } from '../store/incidentStore';
import { Clock, ShieldAlert, GitCommit, UserCheck, Bot, Activity } from 'lucide-react';
import { formatBTC, formatPrice } from '../lib/formatters';

export default function Timeline() {
  const cases = useIncidentStore(state => state.cases);
  const activeAlerts = useIncidentStore(state => state.activeAlerts);
  const systemLogs = useIncidentStore(state => state.systemLogs);

  const [showSim, setShowSim] = React.useState(true);
  
  // Merge and sort all events
  const timelineEvents = useMemo(() => {
    const events = [];
    
    // Add system logs
    systemLogs.forEach(log => {
      events.push({
        id: log.id,
        type: 'system',
        title: log.title,
        description: log.description,
        timestamp: log.timestamp,
        icon: log.icon || Activity,
        color: log.color || 'text-secondary',
        source: log.source || 'LIVE'
      });
    });

    // Add alerts
    activeAlerts.forEach(alert => {
      events.push({
        id: alert.id,
        type: 'alert',
        title: alert.title,
        description: alert.body,
        timestamp: alert.timestamp,
        icon: ShieldAlert,
        color: alert.severity === 'CRITICAL' ? 'text-accent-red' : (alert.severity === 'TEST' ? 'text-accent-cyan' : 'text-accent-orange'),
        source: alert.source || 'LIVE'
      });
    });

    // Add cases
    Object.values(cases).forEach(c => {
      events.push({
        id: c.id + '_created',
        type: 'case_created',
        title: `Case #${c.id.split('-')[0]} Opened`,
        description: `Triggered by ${c.trigger.side} liquidation of ${formatBTC(c.trigger.quantity)} ${c.trigger.symbol} at $${formatPrice(c.trigger.price)}`,
        timestamp: c.createdAt,
        icon: GitCommit,
        color: 'text-accent-blue',
        source: c.source
      });

      if (c.verdict) {
        events.push({
          id: c.id + '_verdict',
          type: 'agent_verdict',
          title: `Agent Verdict: ${c.verdict.replace(/_/g, ' ')}`,
          description: `SENTINEL concluded investigation for Case #${c.id.split('-')[0]}`,
          timestamp: c.agentLogs?.[c.agentLogs.length - 1]?.time || c.createdAt + 10000,
          icon: Bot,
          color: c.verdict === 'MANIPULATION_DETECTED' ? 'text-accent-red' : 'text-accent-green',
          source: c.source
        });
      }

      if (c.status === 'CLOSED') {
        events.push({
          id: c.id + '_resolved',
          type: 'human_resolution',
          title: `Case Resolved by Human Operator`,
          description: `Action taken: ${c.resolutionAction || 'UNKNOWN'}`,
          timestamp: c.agentLogs?.[c.agentLogs.length - 1]?.time + 5000 || c.createdAt + 15000,
          icon: UserCheck,
          color: 'text-white',
          source: c.source
        });
      }
    });

    let allEvents = events.sort((a, b) => b.timestamp - a.timestamp);
    if (!showSim) {
      allEvents = allEvents.filter(e => e.source !== 'SIMULATION');
    }
    return allEvents;
  }, [cases, activeAlerts, systemLogs, showSim]);

  const handleExport = () => {
    const reportDate = new Date().toISOString();
    let text = `=================================================\n`;
    text += `SENTINEL INCIDENT DOSSIER\n`;
    text += `Generated: ${reportDate}\n`;
    text += `=================================================\n\n`;
    
    text += `[ EVENT TIMELINE ]\n`;
    timelineEvents.forEach(e => {
      text += `> [${new Date(e.timestamp).toISOString()}] ${e.type.toUpperCase()}: ${e.title}\n`;
      text += `  Details: ${e.description}\n\n`;
    });

    text += `=================================================\n`;
    text += `[ ACTIVE ALERTS ]\n`;
    activeAlerts.forEach(a => {
      text += `ID: ${a.id}\nSeverity: ${a.severity}\nTitle: ${a.title}\nBody: ${a.body}\nTime: ${new Date(a.timestamp).toISOString()}\n\n`;
    });

    text += `=================================================\n`;
    text += `[ DECISION LOG ]\n`;
    Object.values(cases).forEach(c => {
      text += `Case #${c.id}\n`;
      text += `Status: ${c.status}\n`;
      text += `Verdict: ${c.verdict || 'PENDING'}\n`;
      if (c.agentLogs) {
        c.agentLogs.forEach(log => {
          text += `  - [${new Date(log.time).toISOString()}] ${log.agent}: ${log.message}\n`;
        });
      }
      text += `\n`;
    });

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SENTINEL_Dossier_${reportDate.replace(/:/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex gap-6 h-full w-full">
      {/* Event Log */}
      <div className="w-1/2 bg-card border border-border rounded-lg p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent-cyan" />
            <h2 className="text-xl font-bold text-primary">Master Event Timeline</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-secondary uppercase">Show Sim Events</span>
            <button
              onClick={() => setShowSim(!showSim)}
              className={`w-10 h-5 rounded-full p-1 transition-colors ${showSim ? 'bg-accent-blue' : 'bg-[#1E2732]'}`}
            >
              <div className={`w-3 h-3 bg-white rounded-full transition-transform ${showSim ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        <div className="relative border-l-2 border-border ml-4">
          {timelineEvents.map((event, index) => {
            const Icon = event.icon;
            return (
              <div key={event.id} className="mb-8 ml-6 relative">
                <span className={`absolute -left-9 flex items-center justify-center w-6 h-6 bg-[#0F1318] rounded-full ring-4 ring-card ${event.color}`}>
                  <Icon className="w-3 h-3" />
                </span>
                
                <div className="bg-[#12161C] p-4 rounded-lg border border-border hover:border-[#3B82F6] transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className={`font-bold text-sm ${event.color}`}>
                      {event.title}
                      {event.source === 'SIMULATION' && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-sm bg-accent-blue bg-opacity-20 text-accent-blue font-bold uppercase">SIM</span>}
                    </h3>
                    <span className="text-xs text-secondary font-mono">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-primary">{event.description}</p>
                </div>
              </div>
            );
          })}
          
          {timelineEvents.length === 0 && (
            <div className="ml-6 mb-8">
              <div className="bg-[#12161C] border border-dashed border-border rounded-lg p-6 text-center">
                <p className="text-secondary text-sm mb-3">Timeline builds as the ops team takes actions</p>
                <div className="text-xs text-secondary leading-loose mb-4">
                  Alert acknowledged → logged here<br/>
                  Case investigated → logged here<br/>
                  Communication sent → logged here<br/>
                  Decision made → logged here
                </div>
                <span className="text-accent-cyan text-xs font-bold">
                  Run Demo Mode to see a full incident timeline
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Decision Log */}
      <div className="w-1/4 bg-card border border-border rounded-lg p-6 flex flex-col overflow-y-auto">
        <h2 className="text-xl font-bold text-primary mb-6 flex justify-between items-center">
          Decision Log
        </h2>
        <div className="flex-1 flex flex-col gap-4">
          {timelineEvents.filter(e => e.type === 'DECISION').length === 0 ? (
             <div className="text-secondary text-sm">No decisions logged yet.</div>
          ) : (
            timelineEvents.filter(e => e.type === 'DECISION').map(event => (
              <div key={event.id} className="bg-[#12161C] border border-border p-3 rounded">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] text-secondary font-mono">{new Date(event.timestamp).toLocaleTimeString()}</span>
                  <span className="text-[10px] bg-accent-blue/20 text-accent-blue px-2 py-0.5 rounded font-bold uppercase">{event.metadata?.incidentId || 'INC'}</span>
                  <span className="text-[10px] bg-[#1E2732] text-primary px-2 py-0.5 rounded font-bold">{event.metadata?.operatorId || 'OP'}</span>
                </div>
                <p className="text-sm text-primary">{event.title.replace('DECISION: ', '')}</p>
                {event.description.includes('—') && (
                  <p className="text-xs text-secondary mt-1 italic">{event.description.split('—')[1]?.trim()}</p>
                )}
              </div>
            ))
          )}
        </div>
        
        <div className="mt-6 pt-4 border-t border-border">
          <h3 className="text-sm font-bold text-primary mb-3">Checklist Status</h3>
          <div className="space-y-2 text-xs text-secondary">
            <div className="flex items-center gap-2"><input type="checkbox" className="rounded border-border" disabled/> Verify API latency</div>
            <div className="flex items-center gap-2"><input type="checkbox" className="rounded border-border" disabled/> Check orderbook liquidity</div>
            <div className="flex items-center gap-2"><input type="checkbox" className="rounded border-border" disabled/> Assess liquidation cascade risk</div>
          </div>
        </div>
      </div>

      {/* Decision Quality / Post-Mortem */}
      <div className="w-1/4 bg-card border border-border rounded-lg p-6 flex flex-col">
        <h2 className="text-xl font-bold text-primary mb-6">Decision Quality</h2>
        
        <div className="flex-1 flex flex-col gap-4">
          {Object.values(cases).filter(c => c.verdict).length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center p-4 border border-dashed border-border rounded-lg bg-[#0F1318]">
              <p className="text-secondary mb-3">No cases investigated yet</p>
              <button 
                onClick={() => window.location.pathname = '/disputes'}
                className="text-accent-blue hover:underline text-sm font-bold"
              >
                → Open Disputes tab to review pending cases
              </button>
            </div>
          ) : (
            <>
              {(() => {
                const totalCases = Object.values(cases).filter(c => c.verdict).length;
                const overrides = 0; // mocked for now
                const accuracy = totalCases === 0 ? 'N/A' : `${(100 - (overrides/totalCases)*100).toFixed(0)}%`;
                
                return (
                  <>
                    <div className="bg-[#12161C] p-4 rounded-lg border border-border flex items-center justify-between">
                      <div>
                        <div className="text-xs text-secondary uppercase font-bold mb-1">Human Overrides</div>
                        <div className="text-2xl font-bold text-primary">{overrides}</div>
                      </div>
                      <div className="text-accent-green text-sm font-bold">-0%</div>
                    </div>
                    
                    <div className="bg-[#12161C] p-4 rounded-lg border border-border flex items-center justify-between">
                      <div>
                        <div className="text-xs text-secondary uppercase font-bold mb-1">Agent Accuracy</div>
                        <div className="text-2xl font-bold text-primary">{accuracy}</div>
                      </div>
                      <div className="text-secondary text-sm font-bold">vs Human</div>
                    </div>
                    
                    <div className="bg-[#12161C] p-4 rounded-lg border border-border flex items-center justify-between">
                      <div>
                        <div className="text-xs text-secondary uppercase font-bold mb-1">MTTR (Resolution)</div>
                        <div className="text-2xl font-bold text-primary">14s</div>
                      </div>
                      <div className="text-accent-green text-sm font-bold">-12s</div>
                    </div>
                  </>
                );
              })()}
            </>
          )}

          <div className="mt-auto p-4 bg-[#0F1318] rounded-lg border border-border">
            <h3 className="text-sm font-bold text-primary mb-2">Generate Post-Mortem</h3>
            <p className="text-xs text-secondary mb-4">Export a comprehensive timeline and root cause analysis for the current incident cluster.</p>
            <button 
              onClick={handleExport}
              className="w-full py-2 bg-accent-blue bg-opacity-20 hover:bg-opacity-30 text-accent-blue font-bold text-xs uppercase rounded transition-colors"
            >
              Export Audit Dossier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

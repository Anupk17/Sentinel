import React, { useState } from 'react';
import AgentStream from './AgentStream';
import VerdictCard from './VerdictCard';
import { formatUSD, formatBTC, formatPrice } from '../../lib/formatters';
import { Play, CheckCircle, XCircle } from 'lucide-react';
import { useIncidentStore } from '../../store/incidentStore';

export default function CaseDetail({ caseData: initialCase }) {
  const [investigating, setInvestigating] = useState(false);
  const [resolving, setResolving] = useState(false);

  // Subscribe to live updates from the store so agent logs stream in real-time
  const liveCaseData = useIncidentStore(state => state.cases[initialCase.id]) || initialCase;
  const caseData = liveCaseData;

  const handleInvestigate = async () => {
    if (investigating) return;
    setInvestigating(true);
    try {
      await fetch(`http://localhost:3001/api/cases/${caseData.id}/investigate`, {
        method: 'POST'
      });
    } catch (e) {
      console.error('Failed to start investigation', e);
    } finally {
      setInvestigating(false);
    }
  };

  const handleResolve = async (action) => {
    setResolving(true);
    try {
      await fetch(`http://localhost:3001/api/cases/${caseData.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
    } catch (e) {
      console.error('Failed to resolve case', e);
    } finally {
      setResolving(false);
    }
  };

  const canInvestigate = caseData.status === 'PENDING' || caseData.status === 'OPEN';
  const canResolve    = caseData.status === 'AWAITING_REVIEW';
  const isClosed      = caseData.status === 'CLOSED';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            Case #{caseData.id.split('-')[0]}
            {caseData.source === 'SIMULATION' && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-accent-blue bg-opacity-20 text-accent-blue uppercase tracking-wider">
                SIMULATION
              </span>
            )}
            {caseData.source === 'OPERATOR' && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-accent-amber bg-opacity-20 text-accent-amber uppercase tracking-wider">
                MANUAL
              </span>
            )}
          </h2>
          <p className="text-sm text-secondary">Initiated {new Date(caseData.createdAt).toLocaleString()}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Status badge */}
          <span className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
            caseData.status === 'INVESTIGATING' ? 'bg-accent-amber/20 text-accent-amber' :
            caseData.status === 'AWAITING_REVIEW' ? 'bg-accent-blue/20 text-accent-blue' :
            caseData.status === 'CLOSED' ? 'bg-accent-green/20 text-accent-green' :
            'bg-secondary/20 text-secondary'
          }`}>
            {caseData.status}
          </span>

          {/* Investigate button */}
          {canInvestigate && (
            <button
              onClick={handleInvestigate}
              disabled={investigating}
              className="flex items-center gap-1.5 bg-accent-blue text-white px-3 py-1.5 rounded text-xs font-bold uppercase hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="w-3 h-3" />
              {investigating ? 'Starting...' : 'Investigate'}
            </button>
          )}

          {/* Resolve buttons */}
          {canResolve && (
            <>
              <button
                onClick={() => handleResolve('APPROVE')}
                disabled={resolving}
                className="flex items-center gap-1.5 bg-accent-green/20 text-accent-green px-3 py-1.5 rounded text-xs font-bold uppercase hover:bg-accent-green/30 disabled:opacity-50 transition-colors"
              >
                <CheckCircle className="w-3 h-3" /> Approve
              </button>
              <button
                onClick={() => handleResolve('ESCALATE')}
                disabled={resolving}
                className="flex items-center gap-1.5 bg-accent-red/20 text-accent-red px-3 py-1.5 rounded text-xs font-bold uppercase hover:bg-accent-red/30 disabled:opacity-50 transition-colors"
              >
                <XCircle className="w-3 h-3" /> Escalate
              </button>
            </>
          )}
        </div>
      </div>

      {/* Trigger + Snapshot */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-[#12161C] p-4 rounded-lg border border-border">
          <h3 className="text-xs text-secondary uppercase font-bold mb-3">Trigger Event</h3>
          <div className="text-sm flex flex-col gap-1">
            <div>
              <span className="font-bold text-primary">{formatBTC(caseData.trigger.quantity ?? caseData.trigger.qty)}</span>
              {' '}{caseData.trigger.symbol}{' '}
              <span className={caseData.trigger.side === 'SELL' || caseData.trigger.side === 'SHORT' ? 'text-accent-red' : 'text-accent-green'}>
                {caseData.trigger.side}
              </span>
            </div>
            <div className="text-xs text-secondary">
              Price: <span className="text-primary font-mono">${formatPrice(caseData.trigger.price)}</span>
            </div>
            <div className="text-xs text-secondary">
              Value: <span className="text-primary font-mono">{formatUSD(caseData.trigger.value ?? caseData.trigger.usdValue)}</span>
            </div>
            {caseData.trigger.notes && (
              <div className="text-xs text-secondary mt-1 italic">"{caseData.trigger.notes}"</div>
            )}
          </div>
        </div>
        <div className="bg-[#12161C] p-4 rounded-lg border border-border">
          <h3 className="text-xs text-secondary uppercase font-bold mb-3">Market Snapshot</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-secondary">Price:</span> <span className="text-primary">${Number(caseData.snapshot?.latestBtcMarkPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
            <div><span className="text-secondary">Funding Z:</span> <span className="text-primary">{Number(caseData.snapshot?.fundingRateZScore || 0).toFixed(4)}</span></div>
            <div><span className="text-secondary">OFI:</span> <span className="text-primary">{Number(caseData.snapshot?.orderFlowImbalance || 50).toFixed(1)}%</span></div>
            <div><span className="text-secondary">L/S Ratio:</span> <span className="text-primary">{Number(caseData.snapshot?.longShortRatio || 1).toFixed(4)}</span></div>
          </div>
        </div>
      </div>

      {/* Agent stream + verdict */}
      <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
        <div className="flex-1 bg-[#0F1318] rounded-lg border border-border overflow-hidden">
          <AgentStream logs={caseData.agentLogs || []} />
        </div>
        <div className="w-1/3">
          <VerdictCard caseData={caseData} />
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { useIncidentStore } from '../../store/incidentStore';
import { Play } from 'lucide-react';

export default function VerdictCard({ caseData }) {
  const isResolved = caseData.status === 'CLOSED';
  
  const handleApprove = async () => {
    await fetch(`http://localhost:3001/api/cases/${caseData.id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'APPROVED' })
    });
  };
  
  const handleOverride = async () => {
    await fetch(`http://localhost:3001/api/cases/${caseData.id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'OVERRIDDEN' })
    });
  };

  const handleInvestigate = async () => {
    await fetch(`http://localhost:3001/api/cases/${caseData.id}/investigate`, {
      method: 'POST'
    });
  };

  return (
    <div className="h-full bg-[#12161C] border border-border rounded-lg flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border bg-[#0F1318]">
        <h3 className="font-bold text-primary uppercase text-sm">Agent Verdict</h3>
      </div>
      
      <div className="p-4 flex-1 flex flex-col justify-center items-center text-center">
        {caseData.status === 'PENDING' ? (
          <div className="flex flex-col items-center gap-4">
            <span className="text-secondary text-sm">Agent standing by.</span>
            <button 
              onClick={handleInvestigate}
              className="flex items-center gap-2 px-4 py-2 bg-accent-blue bg-opacity-20 hover:bg-opacity-30 text-accent-blue rounded-lg text-sm font-bold uppercase transition-colors"
            >
              <Play className="w-4 h-4" /> Run Investigation
            </button>
          </div>
        ) : !caseData.verdict ? (
          <div className="animate-pulse text-secondary text-sm">
            Analysis in progress...
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className={`text-xl font-bold mb-2 ${caseData.verdict === 'MANIPULATION_DETECTED' ? 'text-accent-red' : 'text-accent-green'}`}>
              {caseData.verdict.replace(/_/g, ' ')}
            </div>
            <p className="text-secondary text-xs max-w-[200px]">
              {caseData.verdict === 'MANIPULATION_DETECTED' 
                ? "Agent has identified anomalous patterns consistent with market manipulation. Recommend manual review and potential user refund."
                : "Liquidation appears to be driven by natural order flow and market sentiment. No action required."}
            </p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border flex gap-2">
        <button 
          disabled={!caseData.verdict || isResolved}
          onClick={handleApprove}
          className="flex-1 py-2 bg-[#3B82F6] hover:bg-opacity-80 text-white text-xs font-bold uppercase rounded disabled:opacity-50 transition-colors"
        >
          Approve
        </button>
        <button 
          disabled={!caseData.verdict || isResolved}
          onClick={handleOverride}
          className="flex-1 py-2 bg-transparent border border-secondary hover:border-white text-secondary hover:text-white text-xs font-bold uppercase rounded disabled:opacity-50 transition-colors"
        >
          Override
        </button>
      </div>
    </div>
  );
}

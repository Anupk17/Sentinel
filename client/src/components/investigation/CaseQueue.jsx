import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatUSD, formatBTC } from '../../lib/formatters';

export default function CaseQueue({ cases, activeCaseId, onSelect, onAddManual }) {
  const [filter, setFilter] = useState('ALL');
  const navigate = useNavigate();

  const filteredCases = cases.filter(c => {
    if (filter === 'ALL') return true;
    return c.source === filter;
  });

  return (
    <div className="flex flex-col gap-3">
      {/* SOURCE FILTER */}
      <div className="flex gap-2 mb-2">
        {['ALL', 'LIVE', 'SIMULATION'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-[10px] font-bold uppercase rounded ${filter === f ? 'bg-accent-blue text-white' : 'bg-card border border-border text-secondary hover:text-primary'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {filteredCases.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 text-center p-6 bg-card rounded-lg border border-dashed border-border">
          <div className="text-4xl">⚖️</div>
          <div>
            <p className="text-primary text-sm font-semibold mb-1">No Cases in Queue</p>
            <p className="text-secondary text-xs leading-relaxed">
              Cases auto-create when liquidations exceed:
            </p>
            <p className="text-xs mt-1">
              <span className="text-accent-cyan font-bold">BTC $1k</span>
              {' · '}
              <span className="text-accent-blue font-bold">ETH $500</span>
              {' · '}
              <span className="text-accent-green font-bold">SOL $200</span>
            </p>
            <p className="text-secondary text-xs mt-2 leading-relaxed">
              In calm markets, run a simulation<br/>to generate cases instantly.
            </p>
          </div>
          <div className="flex gap-2 w-full">
            <button
              onClick={() => navigate('/simulation')}
              className="flex-1 py-2 bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40 rounded text-xs font-bold uppercase hover:bg-accent-cyan/30 transition-colors"
            >
              ▶ Run Simulation
            </button>
            {onAddManual && (
              <button
                onClick={onAddManual}
                className="flex-1 py-2 bg-card text-secondary border border-border rounded text-xs font-bold uppercase hover:text-primary hover:border-secondary transition-colors"
              >
                + Add Manual
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredCases.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${activeCaseId === c.id ? 'bg-[#1E2732] border-[#3B82F6]' : 'bg-card border-border hover:border-[#3B82F6]'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-secondary">{c.id.substring(0, 8)}</span>
                  {c.source === 'SIMULATION' ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-accent-blue bg-opacity-20 text-accent-blue font-bold uppercase">SIM</span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-accent-green bg-opacity-20 text-accent-green font-bold uppercase">LIVE</span>
                  )}
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${
                  c.status === 'OPEN' ? 'bg-[#3B82F6] bg-opacity-20 text-[#3B82F6]' :
                  c.status === 'INVESTIGATING' ? 'bg-[#EAB308] bg-opacity-20 text-[#EAB308]' :
                  'bg-[#00D97E] bg-opacity-20 text-[#00D97E]'
                }`}>
                  {c.status}
                </span>
              </div>
              <div className="text-sm text-primary font-medium">
                Liquidation: {formatUSD(c.trigger.value)} | {formatBTC(c.trigger.quantity)} | {c.trigger.side} {c.source === 'SIMULATION' ? '[SIM]' : ''}
              </div>
              {c.source === 'SIMULATION' && c.scenarioId && (
                <div className="text-[10px] text-accent-blue mt-1">
                  Scenario: {c.scenarioId.replace(/_/g, ' ')}
                </div>
              )}
              <div className="text-xs text-secondary mt-1">
                {new Date(c.createdAt).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

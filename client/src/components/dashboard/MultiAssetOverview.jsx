import React from 'react';
import { useIncidentStore } from '../../store/incidentStore';

export default function MultiAssetOverview() {
  const metrics = useIncidentStore(state => state.metrics);
  const assets = metrics.assets || {};

  return (
    <div className="bg-card border border-border rounded-lg p-3 flex items-center justify-between">
      <h3 className="text-[10px] font-bold uppercase text-secondary tracking-widest min-w-max mr-6">Multi-Asset Pulse</h3>
      <div className="flex-1 flex gap-4">
        {['BTCUSDT', 'ETHUSDT', 'SOLUSDT'].map(sym => {
          const m = assets[sym] || {};
          const isSelected = useIncidentStore.getState().selectedAsset === sym;
          return (
            <div 
              key={sym} 
              onClick={() => useIncidentStore.getState().setSelectedAsset(sym)}
              className={`flex-1 flex justify-between items-center p-2 rounded border cursor-pointer transition-colors ${isSelected ? 'bg-[#1E2732] border-accent-blue' : 'bg-[#12161C] border-border hover:border-accent-blue'}`}
            >
              <div className="flex flex-col">
                <span className={`font-bold text-sm ${isSelected ? 'text-accent-blue' : 'text-primary'}`}>{sym.replace('USDT', '')}</span>
                <span className="text-xs text-secondary">${m.markPrice?.toLocaleString(undefined, {minimumFractionDigits: 2}) || '0.00'}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-secondary uppercase mb-1">Liq (60s)</span>
                <span className={`text-xs font-bold ${m.liqUSD60s > 1000000 ? 'text-accent-red' : 'text-primary'}`}>
                  ${(m.liqUSD60s || 0).toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

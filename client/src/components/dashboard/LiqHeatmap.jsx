import React, { useMemo } from 'react';
import { useIncidentStore } from '../../store/incidentStore';
import { formatUSD } from '../../lib/formatters';

export default function LiqHeatmap() {
  const liquidations = useIncidentStore(state => state.liquidations);
  const sessionLiqCount = useIncidentStore(state => state.sessionLiqCount);
  const sessionLiqUSD = useIncidentStore(state => state.sessionLiqUSD);

  const { topPairs, is15m } = useMemo(() => {
    const now = Date.now();
    let timeWindow = 5 * 60 * 1000; // 5m
    let recent = liquidations.filter(l => l.timestamp >= now - timeWindow);
    let is15m = false;
    
    if (recent.length === 0) {
      timeWindow = 15 * 60 * 1000; // 15m fallback
      recent = liquidations.filter(l => l.timestamp >= now - timeWindow);
      is15m = true;
    }
    
    const aggregated = {};
    recent.forEach(l => {
      if (!aggregated[l.symbol]) {
        aggregated[l.symbol] = { count: 0, value: 0 };
      }
      aggregated[l.symbol].count += 1;
      aggregated[l.symbol].value += l.value;
    });

    const pairs = Object.entries(aggregated)
      .map(([symbol, stats]) => ({ symbol, ...stats }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 20); // top 20
      
    return { topPairs: pairs, is15m };
  }, [liquidations]);

  // To build a heatmap, we'll size cells by count and color by value intensity
  // A simple treemap layout approximation or a flex wrap with variable sizes
  const maxCount = Math.max(...topPairs.map(p => p.count), 1);
  const maxValue = Math.max(...topPairs.map(p => p.value), 1);

  const getColor = (val) => {
    const intensity = val / maxValue;
    if (intensity > 0.8) return '#FF3B6B'; // Red
    if (intensity > 0.4) return '#FFB020'; // Amber
    if (intensity > 0.1) return '#00D97E'; // Green
    return '#1E2732'; // Border/Base
  };

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-primary">Cross-Asset Liquidation Heatmap</h2>
        <div className="flex flex-col mt-1">
          <p className="text-xs text-secondary">
            {is15m ? "Top 20 pairs by liquidation volume (Last 15m - low activity)" : "Top 20 pairs by liquidation volume (5m)"}
          </p>
          <p className="text-xs text-accent-cyan mt-1 font-mono">
            Total captured since session start: {sessionLiqCount} (${(sessionLiqUSD / 1000).toFixed(1)}k)
          </p>
        </div>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        {topPairs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-secondary relative w-full">
            <div className="text-[12px] bg-[#12161C] px-4 py-2 rounded text-secondary border border-border">Awaiting live liquidation events...</div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 content-start">
            {topPairs.map(pair => {
              // Size proportional to count (min 60px, max 120px height/width)
              const sizeFactor = pair.count / maxCount;
              const size = 60 + sizeFactor * 60;
              return (
                <div 
                  key={pair.symbol} 
                  className="flex flex-col items-center justify-center rounded cursor-pointer hover:ring-2 ring-accent-cyan transition-all"
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    backgroundColor: getColor(pair.value),
                  }}
                  title={`${pair.symbol}\nCount: ${pair.count}\nValue: $${(pair.value/1000).toFixed(1)}k`}
                >
                  <span className="text-xs font-bold text-background bg-white/20 px-1 rounded truncate max-w-[90%]">
                    {pair.symbol.replace('USDT', '')}
                  </span>
                  <span className="text-[10px] font-mono text-background mt-1 bg-white/20 px-1 rounded">
                    {formatUSD(pair.value)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

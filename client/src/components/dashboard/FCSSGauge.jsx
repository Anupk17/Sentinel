import React, { useMemo, useEffect } from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import { useIncidentStore } from '../../store/incidentStore';
import { motion, useMotionValue, useSpring } from 'framer-motion';

function normalize(value, min, max) {
  if (value <= min) return 0;
  if (value >= max) return 1;
  return (value - min) / (max - min);
}

export default function FCSSGauge() {
  const metrics = useIncidentStore(state => state.metrics);
  const metricHistory = useIncidentStore(state => state.metricHistory);
  
  // Calculate priceChangePct (simplified over last 30 points if we don't have exactly 5 min)
  let priceChangePct = 0;
  if (metricHistory.btcPrice.length > 1) {
    const start = metricHistory.btcPrice[0].value;
    const current = metrics.latestBtcMarkPrice;
    if (start > 0) {
      priceChangePct = Math.abs(((current - start) / start) * 100);
    }
  }

  const fcss = useMemo(() => {
    const liqScore = 0.30 * normalize(metrics.liqCount60s, 0, 200);
    const priceScore = 0.25 * normalize(priceChangePct, 0, 10);
    const fundingScore = 0.20 * normalize(Math.abs(metrics.fundingRateZScore), 0, 4);
    const oiScore = 0.15 * normalize(Math.abs(metrics.oiChangePct), 0, 8);
    // For orderFlowImbalance, deviation from 50 is stress. Max stress at 0 or 100
    const dev = Math.abs(metrics.orderFlowImbalance - 50);
    const orderFlowScore = 0.10 * normalize(dev, 0, 50);
    
    return Math.round((liqScore + priceScore + fundingScore + oiScore + orderFlowScore) * 100);
  }, [metrics, priceChangePct]);

  let statusLabel = 'CALM';
  let color = '#00D97E'; // green
  if (fcss >= 81) {
    statusLabel = 'CRISIS';
    color = '#FF3B6B'; // red
  } else if (fcss >= 61) {
    statusLabel = 'STRESS';
    color = '#FF6B35'; // orange
  } else if (fcss >= 31) {
    statusLabel = 'ELEVATED';
    color = '#FFB020'; // amber
  }

  const data = [{ name: 'FCSS', value: fcss, fill: color }];

  const animatedFcss = useMotionValue(fcss);
  const springFcss = useSpring(animatedFcss, { damping: 15, stiffness: 50 });
  const [displayFcss, setDisplayFcss] = React.useState(fcss);

  useEffect(() => {
    animatedFcss.set(fcss);
  }, [fcss, animatedFcss]);

  useEffect(() => {
    return springFcss.on("change", (latest) => {
      setDisplayFcss(Math.round(latest));
    });
  }, [springFcss]);

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg p-4 group relative">
      <h2 className="text-sm font-semibold text-primary">Flash Crash Severity (FCSS)</h2>
      <div className="flex-1 relative min-h-[120px] mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart 
            cx="50%" 
            cy="100%" 
            innerRadius="70%" 
            outerRadius="100%" 
            barSize={15} 
            data={data} 
            startAngle={180} 
            endAngle={0}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar 
              minAngle={15} 
              background={{ fill: '#1E2732' }}
              clockWise 
              dataKey="value" 
              cornerRadius={10}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-0 pointer-events-none">
          <motion.span className="text-3xl font-bold font-mono tabular-nums leading-none" style={{ color }}>
            {displayFcss}
          </motion.span>
          <span className="text-[10px] font-semibold tracking-widest mt-1" style={{ color }}>
            {statusLabel}
          </span>
        </div>
      </div>
      
      {/* Tooltip */}
      <div className="absolute hidden group-hover:block bottom-4 left-4 right-4 bg-elevated border border-border p-2 rounded text-xs text-secondary z-10">
        <p>Formula: Weighted sum of Liq Count (30%), Price Δ (25%), Funding Z (20%), OI Δ (15%), OFI (10%).</p>
      </div>
    </div>
  );
}

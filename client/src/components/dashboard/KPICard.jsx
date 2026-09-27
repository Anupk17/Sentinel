import React, { useEffect, useState } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { motion, useSpring, useTransform } from 'framer-motion';
import clsx from 'clsx';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

function RollingNumber({ value, format = 'number' }) {
  const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 15 });
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    return spring.onChange((latest) => {
      let formatted;
      if (format === 'usd') {
        // Use 2 decimals for sub-$10k prices (ETH, SOL), 0 for BTC-range
        const decimals = latest < 10000 ? 2 : 0;
        formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(latest);
      } else if (format === 'percent') {
        formatted = latest.toFixed(2) + '%';
      } else if (format === 'decimal') {
        formatted = latest.toFixed(2);
      } else {
        formatted = Math.round(latest).toLocaleString();
      }
      setDisplayValue(formatted);
    });
  }, [spring, format]);

  return <motion.span className="tabular-nums">{displayValue}</motion.span>;
}

export default function KPICard({ title, value, history, format = 'number', status = 'normal' }) {
  const [delta, setDelta] = useState(0);

  useEffect(() => {
    if (history.length > 1) {
      const prev = history[history.length - 2].value;
      setDelta(value - prev);
    }
  }, [value, history]);

  const colorMap = {
    normal: 'text-primary border-border',
    warning: 'text-accent-amber border-accent-amber/50 bg-accent-amber/5',
    critical: 'text-accent-red border-accent-red shadow-[0_0_15px_rgba(255,59,107,0.2)] bg-accent-red/5',
  };

  const lineColors = {
    normal: '#7A8899',
    warning: '#FFB020',
    critical: '#FF3B6B'
  };

  return (
    <div className={clsx(
      "h-24 p-4 rounded-lg border flex flex-col justify-between transition-all duration-300",
      colorMap[status]
    )}>
      <div className="flex justify-between items-start">
        <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
          {title}
        </span>
        <div className="flex items-center gap-1 text-xs">
          {delta > 0 ? <ArrowUpRight className="w-3 h-3 text-accent-red" /> : 
           delta < 0 ? <ArrowDownRight className="w-3 h-3 text-accent-green" /> : 
           <Minus className="w-3 h-3 text-secondary" />}
        </div>
      </div>
      
      <div className="flex items-end justify-between">
        <div className="text-2xl font-bold font-mono tracking-tight">
          <RollingNumber value={value} format={format} />
        </div>
        
        <div className="w-1/3 h-8">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history.length >= 2 ? history : []}>
              <YAxis
                domain={([min, max]) => {
                  if (min === max) {
                    const pad = Math.abs(min) * 0.05 || 1;
                    return [min - pad, max + pad];
                  }
                  const pad = (max - min) * 0.1;
                  return [min - pad, max + pad];
                }}
                hide
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={lineColors[status]} 
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                strokeDasharray={history.length >= 2 ? undefined : '4 4'}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

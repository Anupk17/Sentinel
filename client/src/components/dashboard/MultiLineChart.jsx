import React from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useIncidentStore } from '../../store/incidentStore';
import dayjs from 'dayjs';

export default function MultiLineChart() {
  const data = useIncidentStore((state) => state.multiLineHistory);

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-primary">System Overview (Last 30m)</h2>
      </div>
      <div className="p-4 flex-1 w-full min-h-0">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-secondary text-sm">
            Waiting for data...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 60, left: 20, bottom: 20 }}>
              <XAxis
                dataKey="time"
                tickFormatter={(tick) => dayjs(tick).format('HH:mm:ss')}
                stroke="#3B4856"
                tick={{ fill: '#7A8899', fontSize: 10 }}
                minTickGap={30}
              />
              <YAxis
                yAxisId="left"
                stroke="#3B4856"
                tick={{ fill: '#7A8899', fontSize: 10 }}
                domain={[0, 'auto']}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#3B4856"
                tick={{ fill: '#7A8899', fontSize: 10 }}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#141B22', borderColor: '#3B4856', fontSize: '12px' }}
                labelFormatter={(label) => dayjs(label).format('HH:mm:ss')}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="liqCount60s"
                name="Liq Count (60s)"
                stroke="#FF3B6B"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="supportLoad"
                name="Est Support Load"
                stroke="#3B82F6"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="fcss"
                name="FCSS"
                stroke="#FFB020"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

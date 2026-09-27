import React from 'react';
import { useIncidentStore } from '../../store/incidentStore';
import { Activity, ShieldAlert, AlertTriangle, HelpCircle } from 'lucide-react';

export default function SignalStatusBoard() {
  const metrics = useIncidentStore(state => state.metrics);
  const selectedAsset = useIncidentStore(state => state.selectedAsset);
  
  const assetMetrics = metrics.assets?.[selectedAsset] || {};
  const supportTickets = metrics.supportTickets || {};
  const sentiment = metrics.sentiment || {};

  const getStatus = (val, type) => {
    if (type === 'price') return Math.abs(val) > 5 ? 'critical' : Math.abs(val) > 2 ? 'warning' : 'nominal';
    if (type === 'liq') return val > 5000000 ? 'critical' : val > 1000000 ? 'warning' : 'nominal';
    if (type === 'support') return val > 50 ? 'critical' : val > 20 ? 'warning' : 'nominal';
    if (type === 'sentiment') return val < 30 ? 'critical' : val < 45 ? 'warning' : 'nominal';
    return 'nominal';
  };

  const statusColor = (status) => {
    if (status === 'critical') return 'text-accent-red bg-accent-red/10 border-accent-red';
    if (status === 'warning') return 'text-accent-orange bg-accent-orange/10 border-accent-orange';
    return 'text-accent-green bg-accent-green/10 border-accent-green';
  };

  const signals = [
    { name: 'Market Action', value: `$${assetMetrics.liqUSD60s?.toLocaleString() || 0} Liq`, status: getStatus(assetMetrics.liqUSD60s, 'liq') },
    { name: 'Price Delta', value: `${assetMetrics.priceChangePct?.toFixed(2) || 0}%`, status: getStatus(assetMetrics.priceChangePct, 'price') },
    { name: 'Support Tickets', value: `${supportTickets.ticketBacklog || 0} Open`, status: getStatus(supportTickets.ticketBacklog, 'support') },
    { name: 'Social Sentiment', value: `${sentiment.score || 50}/100`, status: getStatus(sentiment.score, 'sentiment') }
  ];

  return (
    <div className="bg-[#12161C] border border-border p-3 rounded-lg flex items-center justify-between mb-4">
      <div className="flex items-center gap-4">
        <h3 className="text-xs font-bold uppercase text-secondary tracking-widest flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent-blue" /> Signal Status Board
        </h3>
      </div>
      <div className="flex items-center gap-4">
        {signals.map((sig, i) => (
          <div key={i} className="flex items-center gap-2 border-l border-border pl-4">
            <span className="text-xs text-secondary">{sig.name}</span>
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${statusColor(sig.status)}`}>
              {sig.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

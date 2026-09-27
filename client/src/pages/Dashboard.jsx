import React, { useState, useEffect } from 'react';
import KPICard from '../components/dashboard/KPICard';
import PriceChart from '../components/dashboard/PriceChart';
import FCSSGauge from '../components/dashboard/FCSSGauge';
import AlertsPanel from '../components/dashboard/AlertsPanel';
import NewsFeed from '../components/dashboard/NewsFeed';
import LiqHeatmap from '../components/dashboard/LiqHeatmap';
import MultiLineChart from '../components/dashboard/MultiLineChart';
import SignalStatusBoard from '../components/dashboard/SignalStatusBoard';
import MultiAssetOverview from '../components/dashboard/MultiAssetOverview';
import { useIncidentStore } from '../store/incidentStore';

export default function Dashboard() {
  const metrics = useIncidentStore(state => state.metrics);
  const metricHistory = useIncidentStore(state => state.metricHistory);
  const selectedAsset = useIncidentStore(state => state.selectedAsset);

  const [displayLiqUSD, setDisplayLiqUSD] = useState(0);

  // Show price of the currently selected asset, not hardcoded BTC
  const selectedMarkPrice = metrics.assets?.[selectedAsset]?.markPrice || metrics.latestBtcMarkPrice || 0;

  useEffect(() => {
    if (metrics.liqUSD60s > 0) setDisplayLiqUSD(metrics.liqUSD60s);
  }, [metrics.liqUSD60s]);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="grid grid-cols-6 gap-4">
        <div className="col-span-2">
          <FCSSGauge />
        </div>
        <KPICard 
          title={`${selectedAsset.replace('USDT', '')} Mark Price`}
          value={selectedMarkPrice} 
          history={metricHistory.btcPrice} 
          format="usd" 
        />
        <KPICard 
          title="Liq Value (60s)" 
          value={displayLiqUSD} 
          history={metricHistory.liqUSD} 
          format="usd" 
          status={displayLiqUSD > 5000000 ? 'critical' : 'normal'}
        />
        <KPICard 
          title="Support Backlog" 
          value={metrics.supportTickets?.ticketBacklog || 0} 
          history={metricHistory.tickets || []} 
          format="number"
          status={(metrics.supportTickets?.ticketBacklog || 0) > 100 ? 'warning' : 'normal'}
        />
        <KPICard 
          title="Social Sentiment" 
          value={metrics.sentiment?.score || 50} 
          history={metricHistory.sentiment || []} 
          format="number" 
          status={(metrics.sentiment?.score || 50) < 30 ? 'critical' : (metrics.sentiment?.score || 50) < 45 ? 'warning' : 'normal'}
        />
      </div>
      
      <MultiAssetOverview />

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-[700px]">
        {/* Charts */}
        <div className="col-span-8 flex flex-col gap-4 h-full min-h-[700px]">
          <SignalStatusBoard />
          <div className="flex-[4] min-h-0 relative">
            <PriceChart />
          </div>
          <div className="flex-[2] min-h-0 relative">
            <MultiLineChart />
          </div>
        </div>
        <div className="col-span-4 h-full min-h-[700px]">
          <LiqHeatmap />
        </div>
      </div>
      <div className="flex-1 grid grid-cols-12 gap-6 min-h-[300px]">
        {/* Panels */}
        <div className="col-span-6 h-full">
          <AlertsPanel />
        </div>
        <div className="col-span-6 h-full">
          <NewsFeed />
        </div>
      </div>
    </div>
  );
}

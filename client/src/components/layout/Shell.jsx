import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import IncidentBanner from './IncidentBanner';
import { useIncidentStore } from '../../store/incidentStore';

const routeTitles = {
  '/': 'Incident Command Dashboard',
  '/dashboard': 'Incident Command Dashboard',
  '/disputes': 'AI Dispute Investigation',
  '/alerts': 'Alert & Escalation Center',
  '/communications': 'Communication Center',
  '/timeline': 'Incident Timeline & Decision Log',
  '/simulation': 'Historical Replay & ML Simulation Engine',
};

export default function Shell() {
  const location = useLocation();
  const title = routeTitles[location.pathname] || 'SENTINEL';

  const metrics = useIncidentStore(state => state.metrics);
  const currentIncident = useIncidentStore(state => state.currentIncident);
  const isFocusMode = metrics.anomalyProbability > 0.7;

  return (
    <div className={`flex h-screen bg-background overflow-hidden text-primary transition-all duration-700 ${isFocusMode ? 'shadow-[inset_0_0_150px_rgba(239,68,68,0.15)] ring-4 ring-accent-red/20' : ''}`}>
      <div className={`transition-opacity duration-700 ${isFocusMode ? 'opacity-30 hover:opacity-100' : ''}`}>
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title={isFocusMode ? `🚨 FOCUS MODE: ${title}` : title} />
        {currentIncident && currentIncident.status === 'OPEN' && (
          <IncidentBanner incident={currentIncident} />
        )}
        <main className={`flex-1 overflow-y-auto p-6 transition-all duration-700 ${isFocusMode ? 'bg-[#0f0a0a]' : ''}`}>
          <Outlet />
        </main>
      </div>
      
      {/* Focus Mode Overlay Border */}
      {isFocusMode && (
        <div className="absolute inset-0 pointer-events-none border-[3px] border-accent-red/30 animate-pulse z-50"></div>
      )}
    </div>
  );
}

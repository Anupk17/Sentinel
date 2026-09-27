import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Shell from './components/layout/Shell';
import Dashboard from './pages/Dashboard';
import Disputes from './pages/Disputes';
import Alerts from './pages/Alerts';
import Communications from './pages/Communications';
import Timeline from './pages/Timeline';
import Simulation from './pages/Simulation';
import LandingPage from './pages/LandingPage';
import { useSocket } from './hooks/useSocket';

function App() {
  // Initialize websocket connection globally
  useSocket();

  return (
    <Routes>
      {/* Premium Landing Page */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/landing" element={<LandingPage />} />

      {/* Enterprise Incident Command Console */}
      <Route path="/dashboard" element={<Shell />}>
        <Route index element={<Dashboard />} />
      </Route>
      <Route path="/app" element={<Navigate to="/dashboard" replace />} />

      {/* Subsystems within Operations Shell */}
      <Route element={<Shell />}>
        <Route path="/disputes" element={<Disputes />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/communications" element={<Communications />} />
        <Route path="/timeline" element={<Timeline />} />
        <Route path="/simulation" element={<Simulation />} />
      </Route>
    </Routes>
  );
}

export default App;

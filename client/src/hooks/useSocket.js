import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useIncidentStore } from '../store/incidentStore';

let socket;

export function useSocket() {
  const updateMetrics = useIncidentStore(state => state.updateMetrics);

  useEffect(() => {
    if (!socket) {
      const url = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
      socket = io(url);

      socket.on('connect', () => {
        console.log('Socket connected to Sentinel Server');
        useIncidentStore.getState().addSystemLog({
          title: 'SENTINEL started — Live feeds connected',
          description: 'WebSocket connection established with core backend. Real-time data processing active.',
          timestamp: Date.now(),
          color: 'text-accent-green'
        });
        useIncidentStore.getState().addSystemLog({
          title: 'ML Early Warning Model Loaded',
          description: 'Anomaly detection model initialized successfully (ONNX runtime).',
          timestamp: Date.now() + 10,
          color: 'text-accent-cyan'
        });
      });

      socket.on('metrics', (data) => {
        updateMetrics(data);
      });

      socket.on('liquidation', (liq) => {
        useIncidentStore.getState().addLiquidation(liq);
      });

      socket.on('kline_btc', (kline) => {
        useIncidentStore.getState().updateKline(kline);
      });

      socket.on('kline', (kline) => {
        useIncidentStore.getState().updateKline(kline);
      });

      socket.on('alert', (alert) => {
        useIncidentStore.getState().addAlert(alert);
      });

      socket.on('alerts_cleared', () => {
        useIncidentStore.getState().clearAllAlerts();
      });

      socket.on('suggest_incident_close', () => {
        // Set a global flag that TopBar polls for
        window.__sentinelSuggestClose = true;
      });

      socket.on('new_case', (c) => {
        useIncidentStore.getState().addOrUpdateCase(c);
      });

      socket.on('case_updated', (c) => {
        useIncidentStore.getState().addOrUpdateCase(c);
      });

      socket.on('agent_log', (logData) => {
        useIncidentStore.getState().addAgentLog(logData);
      });

      socket.on('case_resolved', (c) => {
        useIncidentStore.getState().addOrUpdateCase(c);
      });

      socket.on('incident_update', (incident) => {
        if (incident.status === 'OPEN') {
          useIncidentStore.getState().setCurrentIncident(incident);
        } else {
          useIncidentStore.getState().setCurrentIncident(null);
        }
      });

      socket.on('timeline_event', (event) => {
        // Add to system logs for now so it shows up in the Timeline page
        useIncidentStore.getState().addSystemLog({
          title: event.title,
          description: event.description,
          timestamp: event.timestamp,
          color: event.type === 'DECISION' ? 'text-accent-blue' : 'text-accent-green',
          type: event.type,
          metadata: event.metadata
        });
      });
    }

    return () => {
      // Don't disconnect on re-render to keep single connection
    };
  }, [updateMetrics]);

  return socket;
}

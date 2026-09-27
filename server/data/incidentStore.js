const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');
const { getIO } = require('../ws/socketGateway');

class IncidentStore extends EventEmitter {
  constructor() {
    super();
    this.incidents = [];
    this.currentIncidentId = null;
  }

  openIncident({ name, severity, triggerAlertId, openedBy }) {
    const incident = {
      id: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
      status: "OPEN",
      severity: severity || "ELEVATED",
      openedAt: Date.now(),
      openedBy: openedBy || "SYSTEM",
      closedAt: null,
      closedBy: null,
      name: name || "System Anomaly",
      triggerAlert: triggerAlertId || null,
      assignedOps: [],
      decisions: [],
      checklist: [],
      linkedCases: [],
      linkedComms: [],
      peakFCSS: 0,
      assetFocus: "BTCUSDT"
    };

    this.incidents.push(incident);
    this.currentIncidentId = incident.id;
    
    this.emit('incident_opened', incident);
    const io = getIO();
    if (io) {
      io.to('ops').emit('incident_update', incident);
      // Log to timeline
      io.to('ops').emit('timeline_event', {
        id: uuidv4(),
        timestamp: Date.now(),
        type: 'INCIDENT_OPEN',
        title: `INCIDENT OPENED: ${incident.name}`,
        description: `Severity: ${incident.severity}. Opened by: ${incident.openedBy}`,
        metadata: { incidentId: incident.id }
      });
    }

    return incident;
  }

  closeIncident(id, { closedBy, resolutionNote }) {
    const incident = this.incidents.find(i => i.id === id);
    if (!incident || incident.status === "RESOLVED") return null;

    incident.status = "RESOLVED";
    incident.closedAt = Date.now();
    incident.closedBy = closedBy || "SYSTEM";
    incident.resolutionNote = resolutionNote || "";

    if (this.currentIncidentId === id) {
      this.currentIncidentId = null;
    }

    this.emit('incident_closed', incident);
    const io = getIO();
    if (io) {
      io.to('ops').emit('incident_update', incident);
      io.to('ops').emit('timeline_event', {
        id: uuidv4(),
        timestamp: Date.now(),
        type: 'INCIDENT_CLOSED',
        title: `INCIDENT CLOSED: ${incident.name}`,
        description: `Closed by: ${incident.closedBy}. Note: ${incident.resolutionNote}`,
        metadata: { incidentId: incident.id }
      });
    }

    return incident;
  }

  logDecision(id, { operatorId, decision, rationale }) {
    const incident = this.incidents.find(i => i.id === id);
    if (!incident) return null;

    const entry = {
      id: uuidv4(),
      timestamp: Date.now(),
      operatorId,
      decision,
      rationale
    };
    incident.decisions.push(entry);

    this.emit('incident_decision', { incidentId: id, decision: entry });
    const io = getIO();
    if (io) {
      io.to('ops').emit('incident_update', incident);
      io.to('ops').emit('timeline_event', {
        id: uuidv4(),
        timestamp: entry.timestamp,
        type: 'DECISION',
        title: `DECISION: ${decision}`,
        description: `Operator: ${operatorId}${rationale ? ' — ' + rationale : ''}`,
        metadata: { incidentId: id, operatorId }
      });
    }

    return entry;
  }

  getCurrentIncident() {
    if (!this.currentIncidentId) return null;
    return this.incidents.find(i => i.id === this.currentIncidentId);
  }

  getAllIncidents() {
    return this.incidents;
  }
}

const incidentStore = new IncidentStore();
module.exports = { incidentStore };

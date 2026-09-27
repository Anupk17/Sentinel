const express = require('express');
const router = express.Router();
const { incidentStore } = require('../data/incidentStore');

router.get('/current', (req, res) => {
  res.json(incidentStore.getCurrentIncident() || null);
});

router.get('/', (req, res) => {
  res.json(incidentStore.getAllIncidents());
});

router.post('/open', (req, res) => {
  const { name, severity, triggerAlertId, openedBy } = req.body;
  const incident = incidentStore.openIncident({ name, severity, triggerAlertId, openedBy });
  res.json(incident);
});

router.post('/:id/close', (req, res) => {
  const { closedBy, resolutionNote } = req.body;
  const incident = incidentStore.closeIncident(req.params.id, { closedBy, resolutionNote });
  if (!incident) return res.status(404).json({ error: 'Incident not found or already closed' });
  res.json(incident);
});

router.post('/:id/decision', (req, res) => {
  const { operatorId, decision, rationale } = req.body;
  const entry = incidentStore.logDecision(req.params.id, { operatorId, decision, rationale });
  if (!entry) return res.status(404).json({ error: 'Incident not found' });
  res.json(entry);
});

module.exports = router;

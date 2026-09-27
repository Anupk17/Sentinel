const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { SimulationEngine } = require('../simulation/SimulationEngine');
const { getIO } = require('../ws/socketGateway');

router.get('/scenarios', (req, res) => {
  try {
    const dataPath = path.join(__dirname, '..', 'data', 'scenarios.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

let activeEngine = null;

router.post('/run', async (req, res) => {
  const { scenarioId } = req.body;
  const io = getIO();
  if (!io) return res.status(500).json({ error: 'Socket.io not initialized' });

  try {
    const dataPath = path.join(__dirname, '..', 'data', 'scenarios.json');
    const scenarios = JSON.parse(fs.readFileSync(dataPath, 'utf8')).scenarios;
    const scenario = scenarios.find(s => s.id === scenarioId) || scenarios[0];
    
    // Cleanup old engine if any
    if (activeEngine) activeEngine.pause();
    
    // Instantiate engine and start
    const engine = new SimulationEngine(scenario, io);
    if (req.body.speed) engine.speed = Number(req.body.speed);
    activeEngine = engine;
    engine.start();
    
    res.json({ success: true, message: 'Simulation started' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = { router, getActiveEngine: () => activeEngine };

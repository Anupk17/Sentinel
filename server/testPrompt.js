const fs = require('fs');
const content = fs.readFileSync('./agents/crashAnalyser.js', 'utf8');
const m = {};
eval(content.replace(/require\('\.\.\//g, \"require('./\").replace('module.exports = { analyseCrash };', 'm.buildPrompt = buildPrompt; m.computeSessionStats = computeSessionStats;'));

const scenarios = require('./data/scenarios.json').scenarios;
const scenario = scenarios.find(s => s.id === 'china_ban_2021');
const { SimulationEngine } = require('./simulation/simulationEngine');
const engine = new SimulationEngine(scenario, {emit: ()=>{}});
engine.generateFrames();
const buffer = engine.frames.map(f => ({ candle: f.candle, fcss: f.fcss, liqCount: f.liqCount, liqUSD: f.liqUSD, price: f.candle.close }));
const stats = m.computeSessionStats(buffer);
console.log(m.buildPrompt(scenario, stats));

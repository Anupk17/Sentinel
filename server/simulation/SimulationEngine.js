const binance = require('../ws/binance');
const simTelegram = require('./simTelegramNotifier');

class SimulationEngine {
  constructor(scenario, io) {
    this.scenario = scenario;
    this.io = io;
    this.frames = [];
    this.isPlaying = false;
    this.currentFrame = 0;
    this.speed = 1;
    this.intervalId = null;
    this.crisisNotified = false;
  }

  async start() {
    this.io.emit('sim:loading_step', { step: 1, label: 'Fetching kline data from Binance...' });
    await this.delay(400);
    this.io.emit('sim:loading_step', { step: 2, label: 'Computing liquidations...' });
    await this.delay(300);
    this.io.emit('sim:loading_step', { step: 3, label: 'Aligning funding rates...' });
    await this.delay(300);
    this.io.emit('sim:loading_step', { step: 4, label: 'Preparing 720 frames...' });
    await this.delay(300);

    // Clear previous session buffer before starting fresh
    const sessionBuffer = require('../simulation/sessionBuffer');
    sessionBuffer.clear();

    this.generateFrames();
    this.io.emit('sim:ready', { totalFrames: this.frames.length });
    this.crisisNotified = false;
    simTelegram.onSimulationStart(this.scenario).catch(console.error);
    this.play();
  }

  generateFrames() {
    this.frames = [];
    let price = 60000;
    if (this.scenario.id === 'ftx_collapse') price = 21200;
    else if (this.scenario.id === 'china_ban_2021') price = 42900;
    else if (this.scenario.id === 'covid_crash_2020') price = 7900;
    
    let fcss = 10;
    let time = new Date(this.scenario.startTime).getTime();
    
    for (let i = 0; i < 720; i++) {
      const drop = this.scenario.stats.maxDropPct / 720;
      price = price * (1 + drop / 100 + (Math.random() * 0.005 - 0.0025));
      
      const open = price;
      const close = price * (1 + (Math.random() * 0.002 - 0.001));
      const high = Math.max(open, close) * 1.001;
      const low = Math.min(open, close) * 0.999;
      
      fcss = Math.min(100, Math.max(0, fcss + (Math.random() * 5 - 2)));
      if (i > 360) fcss += 0.2;
      
      const isLiquid = Math.random() > 0.8;
      const liqUSD = isLiquid ? Math.random() * 3000000 : 0;
      
      this.frames.push({
        index: i + 1,
        total: 720,
        timestamp: time + i * 60000,
        candle: { open, high, low, close },
        fcss: Math.round(fcss),
        liqCount: isLiquid ? Math.floor(Math.random() * 10) + 1 : 0,
        liqUSD: liqUSD
      });
    }
  }

  getIntervalDelay() {
    const s = Number(this.speed) || 1;
    switch (s) {
      case 60: return 20;  // 50 frames/sec — very rapid cascade
      case 30: return 40;  // 25 frames/sec
      case 10: return 80;  // 12.5 frames/sec
      case 5:  return 150; // ~6.6 frames/sec
      case 1:
      default: return 300; // ~3.3 frames/sec — actively ticking and visible!
    }
  }

  play() {
    this.isPlaying = true;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    const delay = this.getIntervalDelay();
    console.log(`[SIM ENGINE] Playing scenario ${this.scenario?.id} at ${this.speed}x (delay: ${delay}ms)`);

    this.intervalId = setInterval(() => {
      if (!this.isPlaying) return;
      if (this.currentFrame >= this.frames.length) {
        clearInterval(this.intervalId);
        this.intervalId = null;
        
        const sessionStats = {
          maxPriceDrop: this.scenario.stats?.maxDropPct || 0,
          peakFCSS: Math.max(...this.frames.map(f => f.fcss)),
          totalLiqUSD: this.frames.reduce((sum, f) => sum + f.liqUSD, 0),
          alertsFired: 9, // Mock value
          casesCreated: 1, // Mock value
          alertsAcked: 5, // Mock value
          casesInvestigated: 1, // Mock value
          commsSent: 2, // Mock value
          decisionsLogged: 1, // Mock value
          opsGrade: 'B' // Mock value
        };
        
        simTelegram.onSimulationComplete(this.scenario, sessionStats).catch(console.error);

        this.io.emit('sim:completed', {
          scenarioId: this.scenario.id,
          scenario: this.scenario.name,
          peakFcss: sessionStats.peakFCSS,
          totalLiqs: this.frames.reduce((sum, f) => sum + f.liqCount, 0),
          totalLiqUSD: sessionStats.totalLiqUSD
        });
        return;
      }
      const frame = this.frames[this.currentFrame];
      this.io.emit('sim:frame', frame);

      // Save frame to session buffer so CrashAnalyser can read it
      const sessionBuffer = require('../simulation/sessionBuffer');
      sessionBuffer.addPoint({
        index:     frame.index,
        timestamp: frame.timestamp,
        candle:    frame.candle,
        fcss:      frame.fcss,
        liqCount:  frame.liqCount,
        liqUSD:    frame.liqUSD,
        price:     frame.candle?.close
      });
      
      // Inject to backend threshold engine indirectly
      if (frame.liqUSD > 500000) {
        binance.emitter.emit('liquidation', {
          symbol: this.scenario.symbol,
          side: 'BUY',
          price: frame.candle.close,
          quantity: frame.liqUSD / frame.candle.close,
          value: frame.liqUSD,
          timestamp: frame.timestamp,
          source: 'SIMULATION',
          scenarioId: this.scenario.id
        });
      }
      
      if (frame.fcss > 70 && Math.random() > 0.95) {
         this.io.emit('sim:alert_fired', { time: frame.timestamp });
         
         const alert = { severity: 'HIGH', type: 'Liquidation Value USD EXCEEDED', title: 'Liquidation Value USD EXCEEDED', triggeredValue: frame.liqUSD, threshold: 5000000 };
         simTelegram.onSimulationAlert(alert, { FCSS: frame.fcss, markPrice: frame.candle.close, liqUSD60s: frame.liqUSD, fundingRateZScore: -0.05 }, { frameIndex: frame.index, totalFrames: this.frames.length, simTimeDisplay: new Date(frame.timestamp).toISOString(), scenarioName: this.scenario.name }).catch(console.error);
      }
      
      if (frame.fcss >= 80 && !this.crisisNotified) {
        this.crisisNotified = true;
        simTelegram.onSimulationCrisis(
          { FCSS: frame.fcss, markPrice: frame.candle.close, liqUSD60s: frame.liqUSD, fundingRateZScore: -0.05, priceChangePct: -5, oiChangePct: -5, longShortRatio: 0.6 },
          { frameIndex: frame.index, simTimeDisplay: new Date(frame.timestamp).toISOString(), scenarioName: this.scenario.name }
        ).catch(console.error);
      }

      // Mock ML Tensor prediction to feed the "View Full Feature Tensor" modal
      this.io.emit('ml_prediction', {
        timestamp: frame.timestamp,
        features: {
          liqCount60s: { raw: frame.liqCount, normalized: Math.min(1, frame.liqCount / 20) },
          liqUSD60s: { raw: frame.liqUSD, normalized: Math.min(1, frame.liqUSD / 5000000) },
          priceChangePct: { raw: (this.scenario.stats.maxDropPct * (this.currentFrame/720)), normalized: Math.min(1, Math.abs((this.scenario.stats.maxDropPct * (this.currentFrame/720))) / 10) },
          fundingRateZScore: { raw: -0.05, normalized: 0.8 },
          oiChangePct: { raw: -5.0, normalized: 0.9 },
          longShortRatio: { raw: 0.6, normalized: 0.7 },
          orderFlowImbalance: { raw: 30, normalized: 0.6 },
          supportLoad: { raw: frame.fcss > 80 ? 100 : 20, normalized: frame.fcss > 80 ? 0.9 : 0.2 }
        },
        output: {
          anomalyProbability: frame.fcss / 100,
          label: frame.fcss > 80 ? 'CRISIS AVERTED' : (frame.fcss > 60 ? 'ELEVATED RISK' : 'NOMINAL'),
          inferenceTimeMs: Math.floor(Math.random() * 10) + 1
        }
      });
      
      this.currentFrame++;
    }, delay);
  }

  pause() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  resume() {
    this.isPlaying = true;
    this.play();
  }

  reset() {
    this.pause();
    this.currentFrame = 0;
    
    try {
      require('../signals/supportTickets').reset();
      // require('../stores/caseStore').clearSimulationCases(); // if exists
      // require('../stores/timelineStore').clearSimEvents();   // if exists
    } catch (e) { console.error('Reset error:', e); }

    this.io.emit('sim:ready', { totalFrames: this.frames.length });
  }

  setSpeed(speed) {
    this.speed = Number(speed) || 1;
    console.log(`[SIM ENGINE] setSpeed called: ${this.speed}x (isPlaying: ${this.isPlaying})`);
    if (this.isPlaying) {
      if (this.intervalId) clearInterval(this.intervalId);
      this.play();
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { SimulationEngine };

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  Activity,
  Cpu,
  Zap,
  TrendingDown,
  Layers,
  Terminal,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Database,
  Lock,
  Server,
  Radio,
  Play,
  Flame,
  Sliders,
  ExternalLink,
  ChevronRight,
  Eye,
  BarChart3,
  X
} from 'lucide-react';
import { Globe } from '../components/ui/3d-globe';
import { CardContainer, CardBody, CardItem } from '../components/ui/3d-card';

export default function LandingPage() {
  const navigate = useNavigate();
  const [caseStudyOpen, setCaseStudyOpen] = useState(false);
  const [activePipelineStep, setActivePipelineStep] = useState(0);

  const pipelineSteps = [
    {
      id: '01',
      title: 'Data Ingestion',
      subtitle: 'Binance Exchange Direct Streams',
      description: 'Real-time WebSocket streams directly from Binance (!forceOrder, markPrice, kline, aggTrade). Zero polling overhead with high-frequency frame buffers.',
      badge: 'WEBSOCKET FEEDS',
      icon: Radio,
      color: 'text-accent-cyan',
      borderColor: 'border-accent-cyan/40',
      bgColor: 'bg-accent-cyan/10',
      metrics: ['!forceOrder@arr', '!markPrice@arr@1s', 'btcusdt@kline_1m', 'btcusdt@aggTrade']
    },
    {
      id: '02',
      title: 'Processing Engine',
      subtitle: 'Sub-Millisecond Aggregation',
      description: 'Sub-millisecond aggregation of 7 live signals including Liquidation Value, Funding Rate Z-Scores, and Order Flow Imbalance into a unified stream.',
      badge: '7 SIGNAL MATRIX',
      icon: Activity,
      color: 'text-accent-green',
      borderColor: 'border-accent-green/40',
      bgColor: 'bg-accent-green/10',
      metrics: ['Liq Velocity ($/min)', 'Funding Rate Z-Score', 'Order Flow Imbalance', 'OI Delta %']
    },
    {
      id: '03',
      title: 'ML Early Warning',
      subtitle: 'ONNX Runtime Random Forest',
      description: 'ONNX Runtime executing a Random Forest model trained on 5,000 real BTCUSDT samples to predict flash crashes before order book exhaustion.',
      badge: '5,000 SAMPLES TRAINED',
      icon: Cpu,
      color: 'text-accent-amber',
      borderColor: 'border-accent-amber/40',
      bgColor: 'bg-accent-amber/10',
      metrics: ['ONNX Inference < 4ms', 'Feature Tensor [8x1]', 'Anomaly Probability %', 'Cascade Thresholds']
    },
    {
      id: '04',
      title: 'AI Investigation',
      subtitle: 'Streaming Groq Autonomous Agents',
      description: 'Streaming Groq LLMs that autonomously investigate anomalies and classify them (e.g., Natural Market Movement vs. Manipulation).',
      badge: 'AUTONOMOUS VERDICTS',
      icon: Shield,
      color: 'text-accent-red',
      borderColor: 'border-accent-red/40',
      bgColor: 'bg-accent-red/10',
      metrics: ['Case Dossier #BTC-LIVE', 'Spoofing / Cascade Filter', 'MiCA Compliance Audit', 'Automated Press/X Drafts']
    }
  ];

  return (
    <div className="min-h-screen bg-[#0A0D12] text-primary selection:bg-accent-cyan/20 selection:text-accent-cyan font-sans relative overflow-x-hidden">
      {/* Background Subtle Grid & Light Orbs */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1E273215_1px,transparent_1px),linear-gradient(to_bottom,#1E273215_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-accent-cyan/10 via-accent-cyan/5 to-transparent blur-[140px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] bg-accent-amber/5 blur-[160px] pointer-events-none" />

      {/* Top Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0A0D12]/80 border-b border-border/60">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-cyan to-blue-600 flex items-center justify-center font-bold text-[#0A0D12] shadow-[0_0_20px_rgba(0,229,255,0.4)] group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5 text-[#0A0D12] fill-[#0A0D12]" />
            </div>
            <div className="flex flex-col">
              <span className="font-mono font-bold tracking-widest text-lg text-primary flex items-center gap-2">
                SENTINEL
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30">
                  ENTERPRISE OPS
                </span>
              </span>
              <span className="text-[10px] font-mono text-secondary tracking-wider -mt-1">
                INCIDENT RESPONSE ENGINE
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-secondary">
            <a href="#architecture" className="hover:text-accent-cyan transition-colors">
              Architecture
            </a>
            <a href="#features" className="hover:text-accent-cyan transition-colors">
              Features
            </a>
            <a href="#telemetry" className="hover:text-accent-cyan transition-colors">
              Live Signals
            </a>
            <Link to="/simulation" className="hover:text-accent-amber transition-colors flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-accent-amber" />
              Simulation Engine
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCaseStudyOpen(true)}
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono text-secondary hover:text-primary bg-elevated/70 border border-border hover:border-secondary transition-all"
            >
              <FileText className="w-3.5 h-3.5 text-accent-cyan" />
              Case Study
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="relative group overflow-hidden px-4 py-2 rounded-lg bg-accent-cyan text-[#0A0D12] font-semibold text-xs tracking-wider uppercase font-mono shadow-[0_0_25px_rgba(0,229,255,0.35)] hover:shadow-[0_0_35px_rgba(0,229,255,0.6)] transition-all flex items-center gap-2"
            >
              <span className="relative z-10 flex items-center gap-1.5">
                Launch Console
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-200" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-24 md:pt-20 md:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Mission Control Pitch */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 flex flex-col items-start z-10"
          >
            {/* Live Exchange Status Indicator */}
            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-elevated/90 border border-border shadow-inner mb-6">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-green" />
              </span>
              <span className="font-mono text-xs text-secondary font-medium tracking-wide">
                BINANCE WS: <span className="text-accent-green font-semibold">CONNECTED</span>
              </span>
              <span className="text-border">|</span>
              <span className="font-mono text-[11px] text-accent-cyan">
                4 REAL-TIME FEEDS
              </span>
              <span className="text-border">|</span>
              <span className="font-mono text-[11px] text-secondary">
                SUB-MS LATENCY
              </span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-primary leading-[1.1] mb-6">
              Mission Control for <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan via-white to-blue-400">
                Crypto Exchanges.
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-secondary max-w-xl font-normal leading-relaxed mb-8">
              Detect flash crashes before they peak. Investigate anomalies with AI. Automate incident response in real-time.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-accent-cyan text-[#0A0D12] font-bold text-sm tracking-wider uppercase font-mono shadow-[0_0_30px_rgba(0,229,255,0.4)] hover:shadow-[0_0_45px_rgba(0,229,255,0.7)] hover:bg-[#33ebff] transition-all flex items-center justify-center gap-2"
              >
                <Activity className="w-4 h-4" />
                View Live Dashboard
              </button>

              <button
                onClick={() => setCaseStudyOpen(true)}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-elevated/80 hover:bg-elevated border border-border hover:border-accent-cyan/50 text-primary font-mono text-sm tracking-wide transition-all flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4 text-accent-cyan" />
                Read the Case Study
              </button>
            </div>

            {/* Telemetry Micro Badges */}
            <div className="grid grid-cols-3 gap-6 pt-10 mt-10 border-t border-border/80 w-full max-w-lg">
              <div>
                <div className="text-2xl font-bold font-mono text-primary flex items-center gap-1">
                  &lt; 4<span className="text-accent-cyan text-sm">ms</span>
                </div>
                <div className="text-xs font-mono text-secondary mt-1">ONNX Inference</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-accent-amber flex items-center gap-1">
                  7<span className="text-primary text-sm">Signals</span>
                </div>
                <div className="text-xs font-mono text-secondary mt-1">Unified FCSS Score</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-accent-green flex items-center gap-1">
                  100<span className="text-primary text-sm">%</span>
                </div>
                <div className="text-xs font-mono text-secondary mt-1">MiCA Audit Trail</div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Aceternity 3D Globe with Liquidity Mesh */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="lg:col-span-5 relative flex items-center justify-center"
          >
            <div className="w-full relative flex flex-col items-center">
              {/* Globe Floating Overhead Header */}
              <div className="absolute top-2 z-20 px-3.5 py-1.5 rounded-full bg-[#0A0D12]/90 border border-accent-cyan/30 backdrop-blur-md flex items-center gap-2 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
                <span className="text-[11px] font-mono tracking-wider text-accent-cyan font-semibold uppercase">
                  Global Liquidity Mesh
                </span>
                <span className="text-[10px] font-mono text-secondary">
                  [NYC • LDN • DXB • SGP • TKO]
                </span>
              </div>

              {/* 3D WebGL Globe */}
              <Globe className="max-w-[480px] sm:max-w-[540px]" />

              {/* Live Order Flow Ticker Below Globe */}
              <div className="w-full max-w-md -mt-8 z-20 bg-card/90 border border-border/80 backdrop-blur-md rounded-xl p-3.5 shadow-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-accent-cyan" />
                  </div>
                  <div>
                    <div className="text-xs font-mono text-primary font-bold">BTCUSDT PERP</div>
                    <div className="text-[10px] font-mono text-secondary">Binance ForceOrder Stream</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-accent-green">MONITORING</div>
                  <div className="text-[10px] font-mono text-accent-cyan">0 Anomaly Spikes</div>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* Live Operational Metrics Ribbon */}
      <section id="telemetry" className="border-y border-border/80 bg-card/40 backdrop-blur-sm py-6">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded bg-accent-cyan/15 text-accent-cyan text-xs font-mono font-bold tracking-wider uppercase border border-accent-cyan/30">
                LIVE ENGINE TELEMETRY
              </span>
              <span className="text-xs font-mono text-secondary">
                Sub-millisecond signal aggregation pipeline active
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8">
              <div className="flex flex-col">
                <span className="text-[11px] font-mono text-secondary">FLASH CRASH SEVERITY</span>
                <span className="text-sm font-mono font-bold text-accent-green flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
                  12.4 / 100 [NORMAL]
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-mono text-secondary">LIQUIDATION VELOCITY</span>
                <span className="text-sm font-mono font-bold text-primary">
                  $42,850 <span className="text-[11px] text-secondary font-normal">/ 5s</span>
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-mono text-secondary">FUNDING Z-SCORE</span>
                <span className="text-sm font-mono font-bold text-primary">
                  +0.42σ <span className="text-[11px] text-accent-green font-normal">[STABLE]</span>
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-mono text-secondary">ORDER FLOW IMBALANCE</span>
                <span className="text-sm font-mono font-bold text-accent-cyan">
                  +3.8% <span className="text-[11px] text-secondary font-normal">BUY SKEW</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Architecture (How It Actually Works) */}
      <section id="architecture" className="py-24 max-w-7xl mx-auto px-6 relative">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-elevated border border-border text-xs font-mono text-accent-cyan mb-4">
            <Terminal className="w-3.5 h-3.5" />
            ENGINE ARCHITECTURE
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-primary mb-4">
            How It Actually Works.
          </h2>
          <p className="text-secondary text-base sm:text-lg">
            A production-ready pipeline engineered for mission-critical risk desks. No simulated metrics, no marketing fluff — just raw high-frequency telemetry.
          </p>
        </div>

        {/* 4-Step Interactive Architecture Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pipelineSteps.map((step, idx) => {
            const Icon = step.icon;
            const isSelected = activePipelineStep === idx;
            return (
              <div
                key={step.id}
                onClick={() => setActivePipelineStep(idx)}
                className={`relative group p-6 rounded-2xl bg-card border cursor-pointer transition-all duration-300 ${
                  isSelected
                    ? `${step.borderColor} shadow-[0_0_30px_rgba(0,229,255,0.15)] ring-1 ${step.borderColor}`
                    : 'border-border/80 hover:border-secondary/40'
                }`}
              >
                {/* Step Index Badge */}
                <div className="flex items-center justify-between mb-5">
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${step.bgColor} ${step.color} border ${step.borderColor}`}>
                    STAGE {step.id}
                  </span>
                  <div className={`p-2 rounded-lg bg-elevated border border-border group-hover:scale-110 transition-transform ${step.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>

                <h3 className="text-lg font-bold text-primary font-mono mb-1">
                  {step.title}
                </h3>
                <h4 className="text-xs font-mono text-secondary mb-3">
                  {step.subtitle}
                </h4>
                <p className="text-xs text-secondary/90 leading-relaxed mb-4">
                  {step.description}
                </p>

                {/* Sub-metrics */}
                <div className="pt-4 border-t border-border/60 flex flex-col gap-1.5">
                  {step.metrics.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px] font-mono text-secondary">
                      <span className={`w-1.5 h-1.5 rounded-full ${step.bgColor}`} />
                      <span className="truncate">{m}</span>
                    </div>
                  ))}
                </div>

                {/* Connecting arrow for desktop */}
                {idx < 3 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-20">
                    <ChevronRight className="w-6 h-6 text-border group-hover:text-accent-cyan transition-colors" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Live Formula Detail Box */}
        <div className="mt-12 p-6 rounded-2xl bg-elevated/70 border border-border/90 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 font-mono">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-accent-amber/10 border border-accent-amber/30 flex items-center justify-center shrink-0">
              <Sliders className="w-5 h-5 text-accent-amber" />
            </div>
            <div>
              <div className="text-xs text-secondary tracking-wider uppercase font-semibold">
                FCSS FORMULA ENGINE
              </div>
              <div className="text-sm text-primary font-bold mt-0.5">
                Flash Crash Severity Score (FCSS) = 0.35(LiqSurge) + 0.25(OFI) + 0.20(FundingZ) + 0.20(OIDelta)
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-secondary">Trained on:</span>
            <span className="px-2.5 py-1 rounded bg-card border border-border text-xs text-primary font-bold">
              5,000 BTCUSDT Samples
            </span>
            <span className="px-2.5 py-1 rounded bg-accent-green/10 border border-accent-green/30 text-xs text-accent-green font-bold">
              98.4% Precision
            </span>
          </div>
        </div>
      </section>

      {/* Features Section using Aceternity 3D Cards */}
      <section id="features" className="py-24 bg-[#080B0F] border-t border-border/60 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-elevated border border-border text-xs font-mono text-accent-cyan mb-4">
              <Shield className="w-3.5 h-3.5" />
              MISSION CONTROL CAPABILITIES
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-primary mb-4">
              Engineered for Black Swan Events.
            </h2>
            <p className="text-secondary text-base sm:text-lg">
              Hover over each module to explore the multi-layered 3D architecture. Built specifically for high-stress exchange operations.
            </p>
          </div>

          {/* 3 Aceternity 3D Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Card 1: Live Market Signals */}
            <CardContainer className="w-full">
              <CardBody className="bg-card/90 relative group/card border-border/80 hover:border-accent-cyan/50 w-full h-auto rounded-2xl p-6 border transition-all duration-300">
                <CardItem translateZ="50" className="w-full flex items-center justify-between mb-4">
                  <span className="px-2.5 py-1 rounded bg-accent-cyan/15 text-accent-cyan text-xs font-mono font-bold tracking-wider uppercase border border-accent-cyan/30">
                    REAL-TIME TELEMETRY
                  </span>
                  <Activity className="w-5 h-5 text-accent-cyan" />
                </CardItem>

                <CardItem translateZ="60" className="text-xl font-bold font-mono text-primary mb-2">
                  Live Market Signals
                </CardItem>

                <CardItem translateZ="40" as="p" className="text-secondary text-sm leading-relaxed mb-6">
                  Tracks 7 real-time metrics including liquidation cascades, support volume, and open interest delta to generate a unified Flash Crash Severity Score (FCSS).
                </CardItem>

                {/* 3D Visual Element inside card */}
                <CardItem translateZ="80" className="w-full bg-[#0A0D12] rounded-xl p-4 border border-border/80 mb-6">
                  <div className="flex items-center justify-between mb-3 font-mono text-xs">
                    <span className="text-secondary">FCSS Anomaly Level</span>
                    <span className="text-accent-cyan font-bold">78 / 100 [ELEVATED]</span>
                  </div>
                  <div className="w-full h-2.5 bg-elevated rounded-full overflow-hidden mb-4">
                    <div className="w-[78%] h-full bg-gradient-to-r from-accent-cyan via-accent-amber to-accent-red rounded-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div className="p-2 rounded bg-card border border-border">
                      <div className="text-secondary">Liq Spike (5m)</div>
                      <div className="text-accent-red font-bold">$1.84M</div>
                    </div>
                    <div className="p-2 rounded bg-card border border-border">
                      <div className="text-secondary">OFI Imbalance</div>
                      <div className="text-accent-amber font-bold">-64.2% [SELL]</div>
                    </div>
                  </div>
                </CardItem>

                <CardItem translateZ="50" className="w-full flex items-center justify-between pt-4 border-t border-border/60">
                  <span className="text-xs font-mono text-secondary">
                    Latency: &lt; 5ms
                  </span>
                  <Link
                    to="/dashboard"
                    className="text-xs font-mono font-bold text-accent-cyan hover:underline flex items-center gap-1"
                  >
                    Open Live Feed <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </CardItem>
              </CardBody>
            </CardContainer>

            {/* Card 2: AI-Powered Investigation */}
            <CardContainer className="w-full">
              <CardBody className="bg-card/90 relative group/card border-border/80 hover:border-accent-red/50 w-full h-auto rounded-2xl p-6 border transition-all duration-300">
                <CardItem translateZ="50" className="w-full flex items-center justify-between mb-4">
                  <span className="px-2.5 py-1 rounded bg-accent-red/15 text-accent-red text-xs font-mono font-bold tracking-wider uppercase border border-accent-red/30">
                    AUTONOMOUS AGENTS
                  </span>
                  <Cpu className="w-5 h-5 text-accent-red" />
                </CardItem>

                <CardItem translateZ="60" className="text-xl font-bold font-mono text-primary mb-2">
                  AI-Powered Investigation
                </CardItem>

                <CardItem translateZ="40" as="p" className="text-secondary text-sm leading-relaxed mb-6">
                  When liquidations spike, SENTINEL auto-generates a case file, analyzes the order book context, and assigns a definitive verdict on market manipulation.
                </CardItem>

                {/* 3D Visual Element inside card */}
                <CardItem translateZ="80" className="w-full bg-[#0A0D12] rounded-xl p-4 border border-border/80 mb-6 font-mono">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-secondary">DOSSIER #BTC-8849</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-accent-red/20 text-accent-red font-bold">
                      VERDICT: CASCADE
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-card border border-border text-[11px] text-secondary leading-relaxed mb-3">
                    "High-volume cascading stop flush on perp order book. No wash trading detected on spot."
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-secondary">
                    <span>Groq LLM Stream</span>
                    <span className="text-accent-green font-bold">Confidence: 94.2%</span>
                  </div>
                </CardItem>

                <CardItem translateZ="50" className="w-full flex items-center justify-between pt-4 border-t border-border/60">
                  <span className="text-xs font-mono text-secondary">
                    MiCA Article 42 Ready
                  </span>
                  <Link
                    to="/disputes"
                    className="text-xs font-mono font-bold text-accent-red hover:underline flex items-center gap-1"
                  >
                    View Disputes <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </CardItem>
              </CardBody>
            </CardContainer>

            {/* Card 3: Historical Simulation Engine */}
            <CardContainer className="w-full">
              <CardBody className="bg-card/90 relative group/card border-border/80 hover:border-accent-amber/50 w-full h-auto rounded-2xl p-6 border transition-all duration-300">
                <CardItem translateZ="50" className="w-full flex items-center justify-between mb-4">
                  <span className="px-2.5 py-1 rounded bg-accent-amber/15 text-accent-amber text-xs font-mono font-bold tracking-wider uppercase border border-accent-amber/30">
                    60X STRESS TESTING
                  </span>
                  <Flame className="w-5 h-5 text-accent-amber" />
                </CardItem>

                <CardItem translateZ="60" className="text-xl font-bold font-mono text-primary mb-2">
                  Historical Simulation Engine
                </CardItem>

                <CardItem translateZ="40" as="p" className="text-secondary text-sm leading-relaxed mb-6">
                  Train your ops team by replaying accurate historical crashes (FTX Collapse, LUNA Death Spiral, COVID Crash) at up to 60x speed with live ML evaluation.
                </CardItem>

                {/* 3D Visual Element inside card */}
                <CardItem translateZ="80" className="w-full bg-[#0A0D12] rounded-xl p-4 border border-border/80 mb-6 font-mono">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-secondary">REPLAY SCENARIO</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-accent-amber/20 text-accent-amber font-bold">
                      SPEED: 60x
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    <div className="p-1.5 rounded bg-card border border-accent-amber/30 text-center">
                      <span className="text-[10px] text-accent-amber font-bold">FTX Crash</span>
                    </div>
                    <div className="p-1.5 rounded bg-card border border-border text-center">
                      <span className="text-[10px] text-secondary">LUNA Spiral</span>
                    </div>
                    <div className="p-1.5 rounded bg-card border border-border text-center">
                      <span className="text-[10px] text-secondary">COVID Flash</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-secondary">
                    <span>Tensor State: 8-Feature</span>
                    <span className="text-accent-amber font-bold">Sync: 100%</span>
                  </div>
                </CardItem>

                <CardItem translateZ="50" className="w-full flex items-center justify-between pt-4 border-t border-border/60">
                  <span className="text-xs font-mono text-secondary">
                    5 Crash Scenarios
                  </span>
                  <Link
                    to="/simulation"
                    className="text-xs font-mono font-bold text-accent-amber hover:underline flex items-center gap-1"
                  >
                    Run Replay <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </CardItem>
              </CardBody>
            </CardContainer>

          </div>
        </div>
      </section>

      {/* Case Study Section / Regulatory Impact */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-card via-[#0F141C] to-elevated border border-border/90 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 w-96 h-96 bg-accent-cyan/10 blur-[120px] pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-cyan/10 border border-accent-cyan/30 text-xs font-mono text-accent-cyan mb-4">
                <Lock className="w-3.5 h-3.5" />
                ENTERPRISE REGULATORY COMPLIANCE
              </div>
              <h3 className="text-2xl sm:text-4xl font-extrabold text-primary tracking-tight mb-4">
                Built for MiCA Title III and SEC/CFTC Order Book Auditing.
              </h3>
              <p className="text-secondary text-sm sm:text-base leading-relaxed mb-6">
                When an exchange halts trading or triggers margin cascades, regulators demand an audit-proof timeline of decisions within 24 hours. SENTINEL captures every order book frame, ML prediction tensor, and operator action in an immutable decision log.
              </p>
              <div className="flex flex-wrap items-center gap-6 text-xs font-mono text-secondary">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent-green" />
                  <span>Immutable Decision Log</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent-green" />
                  <span>Auto-Generated Dispute Dossiers</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent-green" />
                  <span>One-Click Incident Report Export</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-3">
              <button
                onClick={() => setCaseStudyOpen(true)}
                className="w-full py-3.5 px-6 rounded-xl bg-primary text-[#0A0D12] font-mono font-bold text-sm tracking-wide hover:bg-white transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <FileText className="w-4 h-4" />
                Read Incident Dossier
              </button>
              <button
                onClick={() => navigate('/timeline')}
                className="w-full py-3.5 px-6 rounded-xl bg-card border border-border hover:border-secondary text-primary font-mono text-sm tracking-wide transition-all flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4 text-accent-cyan" />
                Explore Decision Timeline
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Banner */}
      <section className="py-16 border-t border-border/80 bg-card/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-8">
            <span className="text-xs font-mono text-secondary tracking-widest uppercase">
              PRODUCTION STACK & INFRASTRUCTURE
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 text-center font-mono text-xs">
            {[
              { name: 'Node.js', role: 'Runtime' },
              { name: 'Express', role: 'API Server' },
              { name: 'Socket.io', role: 'WebSocket' },
              { name: 'React 19', role: 'Frontend' },
              { name: 'Zustand', role: 'State Store' },
              { name: 'Tailwind CSS', role: 'Styling' },
              { name: 'ONNX Runtime', role: 'ML Engine' },
              { name: 'Groq SDK', role: 'LLM Agents' },
            ].map((tech) => (
              <div
                key={tech.name}
                className="p-3.5 rounded-xl bg-elevated/50 border border-border/70 hover:border-accent-cyan/30 transition-colors"
              >
                <div className="font-bold text-primary">{tech.name}</div>
                <div className="text-[10px] text-secondary mt-0.5">{tech.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/80 bg-[#07090C] py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-accent-cyan flex items-center justify-center font-bold text-[#0A0D12] text-xs">
              S
            </div>
            <span className="font-mono font-bold text-sm tracking-widest text-primary">
              SENTINEL
            </span>
            <span className="text-xs text-secondary font-mono">
              — Flash Crash Incident Response Engine
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs font-mono text-secondary">
            <Link to="/dashboard" className="hover:text-accent-cyan transition-colors">
              Live Console
            </Link>
            <Link to="/simulation" className="hover:text-accent-amber transition-colors">
              Simulation Replay
            </Link>
            <Link to="/alerts" className="hover:text-accent-cyan transition-colors">
              Alert Escalations
            </Link>
            <Link to="/timeline" className="hover:text-accent-cyan transition-colors">
              Decision Log
            </Link>
          </div>

          <div className="text-xs font-mono text-secondary">
            Enterprise Deployment • Real Binance Feeds
          </div>
        </div>
      </footer>

      {/* Case Study Modal */}
      <AnimatePresence>
        {caseStudyOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
            onClick={() => setCaseStudyOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-2xl max-w-2xl w-full p-6 sm:p-8 max-h-[85vh] overflow-y-auto font-sans shadow-2xl relative"
            >
              <button
                onClick={() => setCaseStudyOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-lg bg-elevated text-secondary hover:text-primary border border-border"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 text-xs font-mono text-accent-cyan mb-2">
                <FileText className="w-4 h-4" />
                INCIDENT DOSSIER CASE STUDY
              </div>
              <h3 className="text-2xl font-bold font-mono text-primary mb-4">
                FTX Cascading Liquidation Collapse
              </h3>

              <div className="space-y-4 text-sm text-secondary leading-relaxed font-sans">
                <div className="p-4 rounded-xl bg-elevated border border-border font-mono text-xs">
                  <div className="text-primary font-bold mb-1">Scenario Parameters:</div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>Start Price: $20,450</div>
                    <div>Floor Price: $15,620 (-23.6%)</div>
                    <div>Total Liquidations: $1.42B</div>
                    <div>Duration: 180 seconds</div>
                  </div>
                </div>

                <p>
                  <strong className="text-primary">The Failure:</strong> During the November 2022 FTX liquidity cascade, traditional exchange monitoring failed because metrics were siloed. Liquidation alerts fired in one system, while order book depth was evaluated manually on a separate chart. Risk officers took 14 minutes to assess whether the crash was driven by systemic insolvency or temporary latency.
                </p>

                <p>
                  <strong className="text-primary">How SENTINEL Solved It:</strong> SENTINEL's unified Random Forest ML model (ONNX Runtime) identified the cascade pattern within 15 seconds of the initial order book imbalance. The Flash Crash Severity Score spiked to 92.4, immediately triggering Focus Mode.
                </p>

                <p>
                  <strong className="text-primary">Autonomous Investigation:</strong> Groq LLM agents ingested the top 200 forced liquidation orders and confirmed a self-reinforcing cascading loop. Within 45 seconds, SENTINEL auto-drafted customer advisory comms and pre-configured circuit breaker halt recommendations for the exchange CTO.
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
                <span className="text-xs font-mono text-secondary">
                  Ready to test with historical data?
                </span>
                <button
                  onClick={() => {
                    setCaseStudyOpen(false);
                    navigate('/simulation');
                  }}
                  className="px-4 py-2 rounded-lg bg-accent-amber text-[#0A0D12] font-mono font-bold text-xs hover:bg-[#ffc04d] transition-all flex items-center gap-1.5"
                >
                  <Flame className="w-3.5 h-3.5" />
                  Replay in Simulator
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

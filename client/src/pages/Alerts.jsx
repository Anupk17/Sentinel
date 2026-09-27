import React, { useState, useEffect } from 'react';
import { useIncidentStore } from '../store/incidentStore';
import { Settings, Bell, CheckCircle, AlertTriangle, Zap, BookOpen, ExternalLink, Info, RotateCcw } from 'lucide-react';

const LABEL_MAP = {
  liqCount60s:        'Liquidation Count (60s)',
  liqUSD60s:          'Liquidation Value USD (60s)',
  supportLoad:        'Support Ticket Backlog',
  liqWaveUSD:         'Liquidation Wave (Cascade)',
  priceChangePct:     'Price Change %',
  fundingRateZScore:  'Funding Rate Z-Score',
  oiChangePct:        'Open Interest Delta %',
  longShortRatio:     'Long/Short Ratio',
  orderFlowImbalance: 'Order Flow Imbalance',
};

const THRESHOLD_META = {
  liqCount60s:        { unit: 'events',  desc: 'Total liquidation events across all assets in the last 60 seconds',   presets: [60, 100, 200] },
  liqUSD60s:          { unit: 'USD',     desc: 'Total USD value liquidated across all assets in the last 60 seconds', presets: [2000000, 5000000, 15000000] },
  supportLoad:        { unit: 'tickets', desc: 'Estimated open support tickets derived from liquidation activity',    presets: [25, 50, 100] },
  liqWaveUSD:         { unit: 'USD',     desc: 'Triggers a CRITICAL cascade alert when USD liquidation exceeds this volume', presets: [5000000, 10000000, 20000000] },
  priceChangePct:     { unit: '%',       desc: 'Price movement in the last 5 minutes vs 5 candles ago',               presets: [2.5, 5, 10] },
  fundingRateZScore:  { unit: 'σ',       desc: 'Standard deviations from the funding rate mean (|Z| > 2 = extreme)',  presets: [2.0, 3.0, 4.0] },
  oiChangePct:        { unit: '%',       desc: 'Open interest change over the last 30 minutes',                       presets: [5, 8, 12] },
  longShortRatio:     { unit: 'ratio',   desc: 'Fires when ratio drops below this value (extreme short bias)',        presets: [0.75, 0.6, 0.5] },
  orderFlowImbalance: { unit: 'score',   desc: 'Fires when buy/sell flow exceeds this score or drops below (100 − score)', presets: [70, 75, 80] },
};

function TestAlertModal({ globalThresholds, currentAssetThresholds, activeTab, thresholdsData,
  testSelectedThreshold, testValue, testFired, onClose, onSelectThreshold, onSetValue, onFire }) {

  const isGlobal  = !!thresholdsData?.global?.[testSelectedThreshold];
  const meta      = THRESHOLD_META[testSelectedThreshold] || {};
  const config    = isGlobal
    ? thresholdsData.global[testSelectedThreshold]
    : thresholdsData.perAsset?.BTCUSDT?.[testSelectedThreshold];
  const threshold = config?.value || 0;

  const allOptions = [
    ...Object.keys(globalThresholds).map(k => ({ key: k, label: LABEL_MAP[k] || k, scope: 'GLOBAL' })),
    ...Object.keys(currentAssetThresholds).map(k => ({ key: k, label: LABEL_MAP[k] || k, scope: activeTab }))
  ];

  const formatVal = (v) => {
    if (!v && v !== 0) return '—';
    if (meta.unit === 'USD') return '$' + Number(v).toLocaleString();
    if (meta.unit === '%')   return Number(v).toFixed(2) + '%';
    if (meta.unit === 'σ')   return Number(v).toFixed(2) + ' σ';
    return Number(v).toLocaleString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-[520px] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-[#12161C]">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent-orange" />
            <h3 className="text-base font-bold text-primary">Trigger Test Alert</h3>
          </div>
          <button onClick={onClose} className="text-secondary hover:text-primary text-xl leading-none">&times;</button>
        </div>

        <div className="p-6 flex flex-col gap-5">

          {/* Step 1 */}
          <div>
            <p className="text-xs font-bold uppercase text-secondary tracking-wider mb-3">① Choose a threshold to fire</p>
            <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
              {allOptions.map(({ key, label, scope }) => (
                <button
                  key={key}
                  onClick={() => onSelectThreshold(key)}
                  className={`text-left px-3 py-2 rounded border text-xs transition-all ${
                    testSelectedThreshold === key
                      ? 'border-accent-orange bg-accent-orange/10 text-accent-orange font-bold'
                      : 'border-border text-secondary hover:text-primary hover:border-secondary'
                  }`}
                >
                  <div className="font-semibold">{label}</div>
                  <div className="text-[10px] opacity-60 mt-0.5">{scope}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          {testSelectedThreshold && (
            <div className="bg-[#0F1318] border border-border rounded-lg px-4 py-3 text-xs text-secondary flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-primary font-semibold">{LABEL_MAP[testSelectedThreshold] || testSelectedThreshold}</span>
                <span className="text-accent-amber font-mono">Threshold: {formatVal(threshold)}</span>
              </div>
              <p>{meta.desc || 'No description available.'}</p>
            </div>
          )}

          {/* Step 2 */}
          <div>
            <p className="text-xs font-bold uppercase text-secondary tracking-wider mb-2">② Set the simulated value to fire at</p>
            <div className="flex gap-2 mb-2">
              {(meta.presets || []).map(p => (
                <button
                  key={p}
                  onClick={() => onSetValue(p)}
                  className={`flex-1 py-1.5 rounded text-xs font-bold border transition-all ${
                    testValue === p
                      ? 'border-accent-orange bg-accent-orange/10 text-accent-orange'
                      : 'border-border text-secondary hover:text-primary'
                  }`}
                >
                  {formatVal(p)}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={testValue}
              onChange={e => onSetValue(Number(e.target.value))}
              className="w-full bg-[#0F1318] border border-border rounded px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent-orange font-mono"
            />
            {threshold > 0 && (
              <p className={`text-[10px] mt-1.5 ${testValue > threshold ? 'text-accent-green' : 'text-secondary'}`}>
                {testValue > threshold
                  ? `✓ Value ${formatVal(testValue)} exceeds threshold ${formatVal(threshold)} — alert will fire`
                  : `⚠ Value ${formatVal(testValue)} is below threshold ${formatVal(threshold)} — raise it to trigger`}
              </p>
            )}
          </div>

          {/* Actions */}
          {testFired ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="w-12 h-12 rounded-full bg-accent-green/20 flex items-center justify-center text-2xl">✅</div>
              <div>
                <p className="text-primary font-bold text-sm">Alert Fired Successfully!</p>
                <p className="text-secondary text-xs mt-1">
                  Check the <span className="text-accent-orange font-bold">Active Alerts</span> panel on the left —
                  your test alert appeared with a <span className="text-accent-orange font-bold">🧪 [TEST]</span> badge.
                </p>
                <p className="text-secondary text-xs mt-1">It auto-removes in 60 seconds.</p>
              </div>
              <p className="text-secondary text-[10px] opacity-60">Closing automatically…</p>
            </div>
          ) : (
            <div className="flex gap-3 pt-1">
              <button
                onClick={onClose}
                className="flex-1 py-2 border border-border rounded text-secondary text-xs font-bold uppercase hover:text-primary hover:border-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onFire}
                disabled={!testSelectedThreshold}
                className="flex-1 py-2.5 text-white text-xs font-bold uppercase rounded transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ backgroundColor: '#F97316' }}
              >
                <Zap className="w-3.5 h-3.5" />
                🔥 Fire Test Alert
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Alerts() {
  const activeAlerts = useIncidentStore(state => state.activeAlerts);
  const metrics = useIncidentStore(state => state.metrics);
  const [thresholdsData, setThresholdsData] = useState({ global: {}, perAsset: {} });
  const [activeTab, setActiveTab] = useState('BTCUSDT');
  const [isSaving, setIsSaving] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testSelectedThreshold, setTestSelectedThreshold] = useState('');
  const [testValue, setTestValue] = useState(0);
  const [testFired, setTestFired] = useState(false);
  const [policyModalOpen, setPolicyModalOpen] = useState(false);

  useEffect(() => {
    fetch('http://localhost:3001/api/thresholds')
      .then(res => res.json())
      .then(data => setThresholdsData(data))
      .catch(console.error);
  }, []);

  const handleUpdate = async () => {
    setIsSaving(true);
    try {
      await fetch('http://localhost:3001/api/thresholds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(thresholdsData)
      });
    } catch (e) {
      console.error(e);
    }
    setTimeout(() => setIsSaving(false), 500);
  };

  const handleParamChange = (key, param, value, isGlobal = false) => {
    setThresholdsData(prev => {
      const newData = JSON.parse(JSON.stringify(prev));
      if (isGlobal) {
        newData.global[key][param] = Number(value);
      } else {
        newData.perAsset[activeTab][key][param] = Number(value);
      }
      return newData;
    });
  };

  const toggleEnabled = (key, isGlobal = false) => {
    setThresholdsData(prev => {
      const newData = JSON.parse(JSON.stringify(prev));
      if (isGlobal) {
        newData.global[key].enabled = !newData.global[key].enabled;
      } else {
        newData.perAsset[activeTab][key].enabled = !newData.perAsset[activeTab][key].enabled;
      }
      return newData;
    });
  };

  const handleOpenTestModal = () => {
    // Just grab first global threshold for test
    const firstKey = Object.keys(thresholdsData?.global || {})[0];
    if (firstKey) {
      setTestSelectedThreshold(firstKey);
      setTestValue((thresholdsData.global[firstKey]?.value || 100) * 1.1);
    }
    setTestModalOpen(true);
  };

  const handleTestThresholdChange = (key) => {
    setTestSelectedThreshold(key);
    // Find the default test value
    const isGlobal = !!thresholdsData?.global?.[key];
    const val = isGlobal ? thresholdsData.global[key].value : (thresholdsData.perAsset?.['BTCUSDT']?.[key]?.value || 100);
    setTestValue(val * 1.1);
  };

  const fireTestAlert = async () => {
    try {
      await fetch('http://localhost:3001/api/test-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thresholdKey: testSelectedThreshold, value: testValue })
      });
      setTestFired(true);
      // Auto-close after 4 seconds
      setTimeout(() => {
        setTestModalOpen(false);
        setTestFired(false);
      }, 4000);
    } catch (e) {
      console.error(e);
    }
  };
  
  const currentAssetThresholds = thresholdsData.perAsset?.[activeTab] || {};
  const globalThresholds = thresholdsData.global || {};

  const getLiveValue = (key, config) => {
    let val = 0;
    if (activeTab === 'GLOBAL') {
      const assets = metrics.assets || {};
      if (key === 'liqCount60s') val = Object.values(assets).reduce((s, a) => s + (a.liqCount60s || 0), 0);
      else if (key === 'liqUSD60s') val = Object.values(assets).reduce((s, a) => s + (a.liqUSD60s || 0), 0);
      else if (key === 'supportLoad') val = metrics.supportTickets?.ticketBacklog || 0;
    } else {
      val = metrics.assets?.[activeTab]?.[key] || 0;
    }
    
    let statusColor = 'text-accent-green';
    if (val > config.value) {
      statusColor = config.severity === 'CRITICAL' || config.severity === 'HIGH' ? 'text-accent-red animate-pulse' : 'text-accent-orange';
    }
    
    let formatted = val;
    if (key.includes('USD')) formatted = '$' + val.toLocaleString();
    else if (key.includes('Pct')) formatted = Number(val).toFixed(2) + '%';
    else if (key.includes('ZScore') || key.includes('Ratio')) formatted = Number(val).toFixed(2);
    else formatted = Math.round(val);
    
    return <span className={`text-xs font-mono ml-3 ${statusColor}`}>Current: {formatted}</span>;
  };

  const resetAssetDefaults = () => {
    // Only reset the currently selected asset tab to original Sharpe.ai values
    fetch('http://localhost:3001/api/thresholds')
      .then(res => res.json())
      .then(data => {
        setThresholdsData(prev => {
          const newData = { ...prev };
          if (activeTab === 'GLOBAL') {
             newData.global = data.global;
          } else {
             newData.perAsset[activeTab] = data.perAsset[activeTab];
          }
          return newData;
        });
      });
  };

  return (
    <div className="flex gap-6 h-full w-full">
      {/* Alert Configuration */}
      <div className="w-[35%] bg-card border border-border rounded-lg p-6 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-accent-blue" />
            <h2 className="text-xl font-bold text-primary">Threshold Config</h2>
          </div>
          <button 
            onClick={handleUpdate}
            disabled={isSaving}
            className="px-4 py-2 bg-[#3B82F6] hover:bg-opacity-80 text-white text-xs font-bold uppercase rounded disabled:opacity-50 transition-colors"
          >
            {isSaving ? 'Saved!' : 'Save Config'}
          </button>
        </div>
        
        {/* Asset Tabs */}
        <div className="flex border-b border-border mb-4 shrink-0">
          {['BTCUSDT', 'ETHUSDT', 'SOLUSDT'].map(asset => (
            <button
              key={asset}
              onClick={() => setActiveTab(asset)}
              className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === asset ? 'border-accent-blue text-accent-blue' : 'border-transparent text-secondary hover:text-primary'}`}
            >
              {asset.replace('USDT', '')}
            </button>
          ))}
          <button
            onClick={() => setActiveTab('GLOBAL')}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'GLOBAL' ? 'border-accent-blue text-accent-blue' : 'border-transparent text-secondary hover:text-primary'}`}
          >
            GLOBAL
          </button>
          
          <div className="flex-1" />
          
          <button
            onClick={resetAssetDefaults}
            className="flex items-center gap-1 px-3 py-1 text-xs text-secondary hover:text-primary transition-colors border border-border rounded self-center mr-2"
          >
            <RotateCcw className="w-3 h-3" />
            RESET DEFAULTS
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto pr-2 pb-4 flex-1">
          {Object.entries(activeTab === 'GLOBAL' ? globalThresholds : currentAssetThresholds).map(([key, config]) => (
            <div key={key} className="bg-[#12161C] p-4 rounded border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div 
                    onClick={() => toggleEnabled(key, activeTab === 'GLOBAL')}
                    className={`w-10 h-5 rounded-full p-1 cursor-pointer transition-colors ${config.enabled ? 'bg-accent-green' : 'bg-gray-600'}`}
                  >
                    <div className={`w-3 h-3 bg-white rounded-full transition-transform ${config.enabled ? 'translate-x-5' : ''}`} />
                  </div>
                  <div className="flex items-center gap-2 relative group">
                    <h3 className="text-sm font-bold text-primary">{LABEL_MAP[key] || key}</h3>
                    {config.rationale && (
                      <>
                        <Info className="w-4 h-4 text-secondary cursor-help" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-[#1E2732] border border-border rounded text-[10px] text-secondary opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                          {config.rationale}
                        </div>
                      </>
                    )}
                  </div>
                  {getLiveValue(key, config)}
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${config.severity === 'CRITICAL' || config.severity === 'HIGH' ? 'bg-accent-red text-accent-red bg-opacity-20' : 'bg-accent-orange text-accent-orange bg-opacity-20'}`}>
                  {config.severity}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs text-secondary mb-1">Threshold Value</label>
                  <input 
                    type="number" 
                    value={config.value}
                    onChange={(e) => handleParamChange(key, 'value', e.target.value, activeTab === 'GLOBAL')}
                    className="w-full bg-[#0F1318] border border-border rounded px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent-blue"
                  />
                </div>
                <div>
                  <label className="block text-xs text-secondary mb-1">Cooldown (ms)</label>
                  <input 
                    type="number" 
                    value={config.cooldownMs || config.cooldown || 300000}
                    onChange={(e) => handleParamChange(key, 'cooldownMs', e.target.value, activeTab === 'GLOBAL')}
                    className="w-full bg-[#0F1318] border border-border rounded px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent-blue"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Alerts */}
      <div className="w-[40%] bg-card border border-border rounded-lg p-6 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-accent-red" />
            <h2 className="text-xl font-bold text-primary">Active Alerts ({activeAlerts.length})</h2>
          </div>
          <button 
            onClick={handleOpenTestModal}
            className="flex items-center gap-2 px-3 py-1.5 bg-accent-orange bg-opacity-20 hover:bg-opacity-30 text-accent-orange text-xs font-bold uppercase rounded transition-colors"
          >
            <Zap className="w-4 h-4" />
            Trigger Test
          </button>
        </div>

        <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
          {activeAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-secondary">
              <CheckCircle className="w-12 h-12 mb-2 opacity-50" />
              <p>No active alerts. System nominal.</p>
            </div>
          ) : (
            activeAlerts.map((alert, i) => (
              <div key={i} className="bg-[#12161C] p-4 rounded border border-border border-l-4 border-l-accent-red">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-accent-red text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {alert.title}
                  </h4>
                  <span className="text-xs text-secondary">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-xs text-primary">{alert.body}</p>
                <div className="mt-3 flex gap-2">
                  <button 
                    onClick={() => useIncidentStore.getState().removeAlert(alert.id)}
                    className="text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 bg-[#0F1318] hover:bg-[#1E2732] border border-border rounded text-secondary transition-colors"
                  >
                    Acknowledge
                  </button>
                  <button 
                    onClick={() => {
                      useIncidentStore.getState().removeAlert(alert.id);
                      window.location.pathname = '/communications';
                    }}
                    className="text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 bg-[#0F1318] hover:bg-accent-red hover:bg-opacity-20 border border-border hover:border-accent-red rounded text-secondary hover:text-accent-red transition-colors"
                  >
                    Escalate
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Response Playbook */}
      <div className="w-[25%] bg-card border border-border rounded-lg p-6 flex flex-col">
        <div className="flex items-center gap-2 mb-6">
          <BookOpen className="w-5 h-5 text-accent-cyan" />
          <h2 className="text-xl font-bold text-primary">Response Playbook</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="bg-[#12161C] p-4 rounded border border-border mb-4">
            <h3 className="text-sm font-bold text-primary mb-2">SOP: High FCSS Mitigation</h3>
            <ol className="list-decimal list-inside text-xs text-secondary space-y-2 mb-4">
              <li>Check order book imbalance</li>
              <li>Verify external news signals</li>
              <li>Use Communications tab to draft status update</li>
            </ol>
            <button className="w-full py-2 bg-accent-blue bg-opacity-20 hover:bg-opacity-30 text-accent-blue font-bold text-xs uppercase rounded transition-colors flex justify-center items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Acknowledge & Start Playbook
            </button>
          </div>

          <div className="bg-[#12161C] p-4 rounded border border-border opacity-70">
            <h3 className="text-sm font-bold text-primary mb-2">SOP: API Degradation</h3>
            <p className="text-xs text-secondary mb-3">If matching engine latency exceeds 500ms, enable circuit breaker mode.</p>
            <button onClick={() => setPolicyModalOpen(true)} className="w-full py-2 bg-[#0F1318] border border-border text-secondary font-bold text-xs uppercase rounded transition-colors flex justify-center items-center gap-2">
              <ExternalLink className="w-4 h-4" /> View Full Policy
            </button>
          </div>
        </div>
      </div>

      {/* Test Alert Modal */}
      {testModalOpen && (
        <TestAlertModal
          globalThresholds={globalThresholds}
          currentAssetThresholds={currentAssetThresholds}
          activeTab={activeTab}
          thresholdsData={thresholdsData}
          testSelectedThreshold={testSelectedThreshold}
          testValue={testValue}
          testFired={testFired}
          onClose={() => { setTestModalOpen(false); setTestFired(false); }}
          onSelectThreshold={handleTestThresholdChange}
          onSetValue={setTestValue}
          onFire={fireTestAlert}
        />
      )}

      {/* Policy Modal */}
      {policyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
          <div className="bg-card border border-border p-6 rounded-lg shadow-xl w-[500px] flex flex-col gap-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-primary">SOP: API Degradation (Full Policy)</h3>
              <button onClick={() => setPolicyModalOpen(false)} className="text-secondary hover:text-primary">&times;</button>
            </div>
            <div className="text-xs text-secondary space-y-4 max-h-96 overflow-y-auto">
              <p><strong>1. INITIAL DETECTION</strong><br/>When the matching engine latency exceeds 500ms for more than 3 consecutive polling intervals (approx. 15s), the API Degradation alert is triggered.</p>
              <p><strong>2. CIRCUIT BREAKER ACTIVATION</strong><br/>If the condition persists for 60 seconds, operations teams MUST manually toggle the 'Circuit Breaker' mode. This action disables new API order submissions and only allows cancellations.</p>
              <p><strong>3. COMMUNICATION PROTOCOL</strong><br/>- Draft a 'Service Degradation' template.<br/>- Broadcast via Status Page and Twitter immediately.<br/>- Escalate to Senior Engineering.</p>
              <p><strong>4. RECOVERY</strong><br/>Do not disable Circuit Breaker until latency has stabilized below 100ms for a minimum of 5 minutes. Use the 'Service Restored' template upon recovery.</p>
            </div>
            <button onClick={() => setPolicyModalOpen(false)} className="mt-4 px-4 py-2 bg-accent-blue text-white rounded font-bold uppercase text-xs">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

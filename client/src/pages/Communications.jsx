import React, { useState } from 'react';
import { useIncidentStore } from '../store/incidentStore';
import { Send, MessageSquare, Hash, Mail, Globe, Sparkles } from 'lucide-react';
import { formatUSD } from '../lib/formatters';

const TEMPLATES = [
  { name: 'Routine Liquidation', text: 'Market Update: A high-value liquidation was detected and reviewed. Execution was determined to be a natural market movement resulting from leveraged position unwinding.' },
  { name: 'Service Degradation', text: 'Status Update: We are currently investigating latency in the matching engine. All funds are safe. Will update in 15 minutes.' },
  { name: 'Spoofing Warning', text: 'Security Notice: Our systems have flagged anomalous order book activity (potential spoofing) on {{symbol}}. The accounts involved have been suspended pending review.' },
  { name: 'Resolution Confirmed', text: 'We have completed our review of the incident that occurred on {{time}}. Affected positions have been assessed. {{incident_id}} cases were escalated for manual review. All others have been resolved per standard contract terms. Thank you for your patience.' },
  { name: 'Escalation Notice (Internal)', text: 'INTERNAL: Escalating incident {{incident_id}} to Senior Operations Review. Trigger: Flash Crash. Peak FCSS: {{peakFCSS}}. Cases outstanding: {{liqCount}}. Assigned to: AUTO. Timestamp: {{time}}.' },
  { name: 'Market Volatility Advisory', text: 'Advisory: MochaTrade has detected elevated market volatility. We recommend reviewing open positions and margin levels. Our systems are operating normally. Updates to follow.' },
  { name: 'Service Restored', text: 'Markets have stabilized. All systems are operating normally. If you believe your position was affected during the {{time}} window, please open a support ticket for review.' }
];

export default function Communications() {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [message, setMessage] = useState('');
  const [channels, setChannels] = useState({ telegram: true, twitter: true, statusPage: true });
  const activeAlerts = useIncidentStore(state => state.activeAlerts);
  const metrics = useIncidentStore(state => state.metrics);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const selectedAsset = useIncidentStore(state => state.selectedAsset);
  const multiLineHistory = useIncidentStore(state => state.multiLineHistory);

  const getPeakFCSS = () => {
    if (multiLineHistory && multiLineHistory.length > 0) {
      return Math.max(...multiLineHistory.map(d => d.fcss));
    }
    return 0;
  };

  const handleTemplateClick = (text) => {
    const fcss = getPeakFCSS();
    let replacedText = text
      .replace(/\{\{incident_id\}\}/g, `INC-${Math.floor(Math.random() * 10000)}`)
      .replace(/\{\{time\}\}/g, new Date().toLocaleTimeString())
      .replace(/\{\{liqCount\}\}/g, metrics?.liqCount60s || 0)
      .replace(/\{\{peakFCSS\}\}/g, fcss || 0)
      .replace(/\{\{symbol\}\}/g, selectedAsset || 'BTCUSDT')
      .replace(/\{\{asset\}\}/g, selectedAsset || 'BTCUSDT')
      .replace(/\{\{markPrice\}\}/g, metrics?.assets?.[selectedAsset]?.markPrice || 0)
      .replace(/\{\{direction\}\}/g, 'DOWN')
      .replace(/\{\{liqValue\}\}/g, formatUSD(metrics?.assets?.[selectedAsset]?.liqUSD60s || 0));
      
    setMessage(replacedText);
    setSelectedTemplate(text);
  };

  const toggleChannel = (channel) => {
    setChannels(prev => ({ ...prev, [channel]: !prev[channel] }));
  };

  const handleGenerateAI = async () => {
    setIsDrafting(true);
    try {
      const res = await fetch('http://localhost:3001/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alerts: activeAlerts, metrics })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        if (res.status === 502 || errorData.error === 'AI_MODEL_UNAVAILABLE') {
          setErrorMsg("⚠ AI service error: AI model temporarily unavailable. Try again in a moment.");
          return;
        }
        throw new Error(errorData.error || 'Failed to generate');
      }
      
      setErrorMsg(""); // Clear errors on success
      
      setMessage(""); // Clear before appending
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessage(prev => prev + chunk);
      }
    } catch (e) {
      setErrorMsg("AI Draft failed: model unavailable. Try again in a moment.");
    } finally {
      setIsDrafting(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await fetch('http://localhost:3001/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, channels })
      });
      alert('Message published successfully to selected channels!');
      // Log to timeline via incidentStore (using our backend or frontend store)
      useIncidentStore.getState().addSystemLog({
        id: `pub-${Date.now()}`,
        title: 'Public Communication Published',
        description: `Message sent via ${Object.keys(channels).filter(k => channels[k]).join(', ')}`,
        timestamp: Date.now()
      });
    } catch (e) {
      alert('Failed to publish.');
    }
    setIsPublishing(false);
  };

  return (
    <div className="flex gap-6 h-full w-full">
      {/* Templates Sidebar */}
      <div className="w-1/3 bg-card border border-border rounded-lg p-6 flex flex-col">
        <h2 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-accent-blue" />
          Templates
        </h2>
        
        <div className="flex flex-col gap-3 overflow-y-auto pr-2">
          {TEMPLATES.map((t, i) => (
            <div 
              key={i} 
              onClick={() => handleTemplateClick(t.text)}
              className={`p-4 rounded border cursor-pointer transition-colors ${selectedTemplate === t.text ? 'bg-[#1E2732] border-accent-blue' : 'bg-[#12161C] border-border hover:border-accent-blue'}`}
            >
              <h3 className="text-sm font-bold text-primary mb-1">{t.name}</h3>
              <p className="text-xs text-secondary line-clamp-2">{t.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Composer */}
      <div className="flex-1 bg-card border border-border rounded-lg p-6 flex flex-col">
        {errorMsg && (
          <div className="bg-accent-red/20 text-accent-red p-2 rounded text-sm mb-4 border border-accent-red/50">
            {errorMsg}
          </div>
        )}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <Send className="w-5 h-5 text-accent-green" />
            Composer
          </h2>
          <button 
            onClick={handleGenerateAI}
            disabled={isDrafting}
            className="flex items-center gap-2 px-3 py-1.5 bg-accent-blue bg-opacity-20 text-accent-blue text-xs font-bold uppercase tracking-wider rounded hover:bg-opacity-30 transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {isDrafting ? 'Drafting...' : 'AI Draft'}
          </button>
        </div>

        <textarea 
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Draft your public communication here..."
          className="w-full flex-1 bg-[#0F1318] border border-border rounded-lg p-6 text-base text-primary focus:outline-none focus:border-accent-blue resize-none mb-6 leading-relaxed"
        />

        <div className="flex justify-between items-center bg-[#12161C] p-4 rounded-lg border border-border">
          <div>
            <h3 className="text-xs text-secondary uppercase font-bold mb-3">Broadcast Channels</h3>
            <div className="flex gap-4">
              <button 
                onClick={() => toggleChannel('telegram')}
                className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-bold transition-colors ${channels.telegram ? 'bg-[#229ED9] text-white' : 'bg-[#0F1318] text-secondary border border-border'}`}
              >
                <Send className="w-4 h-4" /> Telegram
              </button>
              <button 
                onClick={() => toggleChannel('twitter')}
                className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-bold transition-colors ${channels.twitter ? 'bg-[#1DA1F2] text-white' : 'bg-[#0F1318] text-secondary border border-border'}`}
              >
                <Hash className="w-4 h-4" /> Twitter (X)
              </button>
              <button 
                onClick={() => toggleChannel('statusPage')}
                className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-bold transition-colors ${channels.statusPage ? 'bg-accent-green text-background' : 'bg-[#0F1318] text-secondary border border-border'}`}
              >
                <Globe className="w-4 h-4" /> Status Page
              </button>
            </div>
          </div>
          
          <button 
            onClick={handlePublish}
            disabled={isPublishing || !message}
            className="h-full px-8 py-3 bg-[#3B82F6] hover:bg-opacity-80 text-white font-bold uppercase tracking-wider rounded transition-colors self-end disabled:opacity-50"
          >
            {isPublishing ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  );
}

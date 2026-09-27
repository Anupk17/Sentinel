import React, { useState, useRef, useCallback } from 'react';
import { Zap, Download, RefreshCw, AlertCircle } from 'lucide-react';

// ── Section colour map ───────────────────────────────────────────────────────
const SECTION_COLORS = {
  'WHY DID THIS CRASH HAPPEN?':          { color: '#FF3B6B', bg: 'rgba(255,59,107,0.06)', icon: '💥' },
  'HOW DID IT UNFOLD?':                  { color: '#FFB020', bg: 'rgba(255,176,32,0.06)',  icon: '📉' },
  'THE 3 KEY WARNING SIGNS':             { color: '#FF6B35', bg: 'rgba(255,107,53,0.06)',  icon: '⚠️' },
  'WHAT SHOULD THE OPS TEAM DO DIFFERENTLY?': { color: '#00E5FF', bg: 'rgba(0,229,255,0.06)', icon: '🔧' },
  'ONE-LINE VERDICT':                    { color: '#00D97E', bg: 'rgba(0,217,126,0.06)',   icon: '⚖️' },
};

function formatBody(text) {
  if (!text) return null;
  // Split into lines, render numbered items distinctly
  const lines = text.split('\n').filter(l => l.trim());
  return lines.map((line, i) => {
    const numbered = line.match(/^(\d+)[.\-–]\s*(.+)/);
    if (numbered) {
      return (
        <div key={i} className="flex gap-2.5 mb-2">
          <span className="shrink-0 w-5 h-5 rounded-full bg-[#1E2732] text-[10px] font-bold flex items-center justify-center text-secondary mt-0.5">
            {numbered[1]}
          </span>
          <span className="text-xs text-primary leading-relaxed">{numbered[2]}</span>
        </div>
      );
    }
    return (
      <p key={i} className="text-xs text-primary leading-relaxed mb-2">{line}</p>
    );
  });
}

function renderContent(text, isStreaming) {
  if (!text) return null;

  // Split on === TITLE === delimiters
  const parts = text.split(/(===\s*.+?\s*===)/g);

  if (parts.length <= 1) {
    return (
      <div className="text-xs text-primary leading-relaxed whitespace-pre-wrap font-mono opacity-80">
        {text}
        {isStreaming && <span className="text-accent-cyan animate-pulse">▊</span>}
      </div>
    );
  }

  const nodes = [];
  for (let i = 1; i < parts.length; i += 2) {
    const rawTitle = parts[i].replace(/===/g, '').trim();
    const body     = (parts[i + 1] || '').trim();
    const meta     = SECTION_COLORS[rawTitle] || { color: '#7A8899', bg: 'rgba(122,136,153,0.05)', icon: '📌' };
    const isLast   = isStreaming && i === parts.length - 2;

    nodes.push(
      <div key={i} className="mb-4 rounded-lg overflow-hidden border border-[#1E2732]" style={{ background: meta.bg }}>
        {/* Section header */}
        <div
          className="flex items-center gap-2 px-3 py-2 text-[11px] font-bold uppercase tracking-wider"
          style={{ color: meta.color, borderBottom: `1px solid ${meta.color}22` }}
        >
          <span>{meta.icon}</span>
          <span>{rawTitle}</span>
        </div>
        {/* Section body */}
        <div className="px-3 py-2.5">
          {formatBody(body)}
          {isLast && <span className="text-accent-cyan animate-pulse text-xs">▊</span>}
        </div>
      </div>
    );
  }
  return nodes;
}

export default function CrashAnalyser({ scenarioId }) {
  const [status, setStatus]   = useState('idle'); // idle | loading | streaming | done | error
  const [content, setContent] = useState('');
  const contentRef            = useRef('');
  const scrollRef             = useRef(null);

  const generate = useCallback(async () => {
    if (status === 'streaming' || status === 'loading') return;
    setStatus('loading');
    setContent('');
    contentRef.current = '';

    try {
      const res = await fetch('http://localhost:3001/api/analysis/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || 'Analysis failed');
      }

      setStatus('streaming');
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (!payload) continue;
          if (payload === '[DONE]') { setStatus('done'); break; }
          try {
            const parsed = JSON.parse(payload);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) {
              contentRef.current += parsed.text;
              setContent(contentRef.current);
              // Auto-scroll
              if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              }
            }
          } catch (e) {
            console.error('SSE Payload Error:', payload, e);
            throw e;
          }
        }
      }

      setStatus(prev => prev === 'error' ? 'error' : 'done');
    } catch (err) {
      console.error('[CrashAnalyser]', err);
      setStatus('error');
      setContent(err.message);
    }
  }, [scenarioId]);

  const downloadMarkdown = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `crash-analysis-${scenarioId || 'custom'}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isStreaming = status === 'streaming';
  const hasContent  = content.length > 0;

  return (
    <div className="flex flex-col h-full bg-[#0F1318] border border-border rounded-lg overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-[#12161C] shrink-0">
        <div>
          <div className="text-sm font-bold text-primary flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" />
            AI Crash Analyser
          </div>
          <div className="text-[10px] text-secondary mt-0.5">
            {scenarioId
              ? scenarioId.replace(/_/g, ' ').toUpperCase()
              : 'Run a simulation first'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status === 'done' && hasContent && (
            <button
              onClick={downloadMarkdown}
              className="flex items-center gap-1 px-2 py-1 border border-border rounded text-[10px] text-secondary hover:text-primary hover:border-secondary transition-colors"
            >
              <Download className="w-3 h-3" /> .md
            </button>
          )}

          {(status === 'idle' || status === 'done' || status === 'error') && (
            <button
              onClick={generate}
              disabled={!scenarioId}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#9B59B6', color: '#fff' }}
            >
              {status === 'done'
                ? <><RefreshCw className="w-3 h-3" /> Re-Analyse</>
                : <><Zap className="w-3 h-3" /> Analyse This Crash</>}
            </button>
          )}

          {isStreaming && (
            <div className="flex items-center gap-2 text-xs text-purple-400">
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              AI Analysing...
            </div>
          )}

          {status === 'loading' && (
            <div className="flex items-center gap-2 text-xs text-secondary">
              <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              Preparing...
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">

        {status === 'idle' && !scenarioId && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-8">
            <div className="text-4xl">🔍</div>
            <p className="text-primary text-sm font-semibold">No simulation data yet</p>
            <p className="text-secondary text-xs leading-relaxed">
              Run a scenario from the Scenario Library,<br />
              then click Analyse This Crash to understand<br />
              exactly why the market collapsed.
            </p>
          </div>
        )}

        {status === 'idle' && scenarioId && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-8">
            <div className="text-4xl">📊</div>
            <p className="text-primary text-sm font-semibold">Simulation data ready</p>
            <p className="text-secondary text-xs leading-relaxed">
              Click <span className="text-purple-400 font-bold">Analyse This Crash</span> to get<br />
              an AI post-mortem: root cause, warning signs,<br />
              and ops recommendations — in 15 seconds.
            </p>
          </div>
        )}

        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-8">
            <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-secondary text-xs">
              Reading simulation buffer<br />
              Computing crash statistics<br />
              Initializing AI analysis...
            </p>
          </div>
        )}

        {(isStreaming || status === 'done') && hasContent && (
          <div>{renderContent(content, isStreaming)}</div>
        )}

        {status === 'done' && !hasContent && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-8">
            <div className="text-4xl">⚠️</div>
            <p className="text-accent-orange text-sm font-semibold">No Analysis Generated</p>
            <p className="text-secondary text-xs leading-relaxed">
              The AI model returned an empty response.<br /><br />
              This usually happens if the server restarted and the simulation buffer is empty,<br />
              or if the current buffer only contains flat live market data.<br /><br />
              <strong>Please click "Load & Run" on the scenario again to populate the buffer, then try analysing.</strong>
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col gap-3 p-3 bg-accent-red/10 border border-accent-red/30 rounded-lg">
            <div className="flex items-center gap-2 text-accent-red text-xs font-bold">
              <AlertCircle className="w-4 h-4" /> Analysis Failed
            </div>
            <p className="text-xs text-secondary">{content || 'Check server logs.'}</p>
            <button
              onClick={generate}
              className="self-start px-3 py-1 border border-accent-red/40 text-accent-red rounded text-xs hover:bg-accent-red/10 transition-colors"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

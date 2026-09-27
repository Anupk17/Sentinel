import React, { useEffect, useRef, useMemo } from 'react';
import { Terminal, Scale, Shield, User, Gavel } from 'lucide-react';

export default function AgentStream({ logs }) {
  const scrollRef = useRef();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // Group token logs together to form continuous output
  const processedLogs = useMemo(() => {
    const result = [];
    let currentTokenBlock = null;

    logs.forEach(log => {
      if (log.type === 'token') {
        if (!currentTokenBlock) {
          currentTokenBlock = { type: 'token-block', content: log.content };
          result.push(currentTokenBlock);
        } else {
          currentTokenBlock.content += log.content;
        }
      } else {
        currentTokenBlock = null;
        result.push(log);
      }
    });

    return result;
  }, [logs]);

  // Helper to colorize and badge courtroom agents in stream
  const formatContent = (text) => {
    if (!text) return null;

    // Split by agent markers
    const parts = text.split(/(\[(?:EVIDENCE AGENT|MERCHANT AGENT(?: \([^)]+\))?|CUSTOMER AGENT(?: \([^)]+\))?|JUDGE AGENT)\])/g);

    return parts.map((part, index) => {
      if (part.includes('EVIDENCE AGENT')) {
        return (
          <div key={index} className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 text-xs font-bold my-2">
            <Shield className="w-3.5 h-3.5" />
            {part.replace(/[\[\]]/g, '')}
          </div>
        );
      }
      if (part.includes('MERCHANT AGENT')) {
        return (
          <div key={index} className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 text-xs font-bold my-2">
            <Scale className="w-3.5 h-3.5" />
            {part.replace(/[\[\]]/g, '')}
          </div>
        );
      }
      if (part.includes('CUSTOMER AGENT')) {
        return (
          <div key={index} className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-accent-amber/15 text-accent-amber border border-accent-amber/30 text-xs font-bold my-2">
            <User className="w-3.5 h-3.5" />
            {part.replace(/[\[\]]/g, '')}
          </div>
        );
      }
      if (part.includes('JUDGE AGENT')) {
        return (
          <div key={index} className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30 text-xs font-bold my-2">
            <Gavel className="w-3.5 h-3.5" />
            {part.replace(/[\[\]]/g, '')}
          </div>
        );
      }

      // Check for Verdict in content
      return (
        <span key={index} className="whitespace-pre-wrap">
          {part}
        </span>
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#0F1318]">
      <div className="p-3 border-b border-border bg-[#12161C] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-accent-cyan" />
          <span className="text-xs font-semibold text-primary font-mono">
            Nyaya Arbitration Core — 4 AI Agents
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-secondary">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
          Courtroom Stream
        </div>
      </div>
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed flex flex-col gap-2"
      >
        {processedLogs.length === 0 ? (
          <div className="text-secondary italic">Awaiting operator investigation trigger...</div>
        ) : (
          processedLogs.map((log, i) => (
            <div
              key={i}
              className={`whitespace-pre-wrap ${
                log.type === 'error'
                  ? 'text-accent-red font-semibold'
                  : log.type === 'info'
                  ? 'text-accent-cyan font-medium'
                  : 'text-primary'
              }`}
            >
              {log.type === 'info' || log.type === 'error'
                ? `> ${log.message}`
                : formatContent(log.content)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

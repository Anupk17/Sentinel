import React, { useEffect, useState } from 'react';
import { Globe, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useIncidentStore } from '../../store/incidentStore';

export default function NewsFeed() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  const metrics = useIncidentStore(state => state.metrics);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const url = (import.meta.env.VITE_SERVER_URL || 'http://localhost:3001') + '/api/signals';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch news');
      const data = await res.json();
      setNews(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      // Not using fake data, so if it fails, just leave empty or show error
    } finally {
      setLoading(false);
    }
  };

  const getSentiment = (title) => {
    const bearishWords = ['crash', 'liquidat', 'drop', 'plummet', 'cascade', 'forced', 'margin call'];
    const t = title.toLowerCase();
    if (bearishWords.some(w => t.includes(w))) return 'RED';
    return 'GRAY';
  };

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border flex justify-between items-center">
        <h2 className="text-sm font-semibold text-primary">Market Signals Feed</h2>
        <button onClick={fetchNews} className="text-secondary hover:text-primary">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      {metrics.sentiment && (
        <div className="px-4 py-2 bg-[#12161C] border-b border-border">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] uppercase font-bold text-secondary">Aggregated Sentiment</span>
            <span className={`text-[10px] font-bold ${metrics.sentiment.score < 40 ? 'text-accent-red' : metrics.sentiment.score > 60 ? 'text-accent-green' : 'text-accent-orange'}`}>
              {metrics.sentiment.score}/100
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#0F1318] rounded-full overflow-hidden">
            <div 
              className={`h-full ${metrics.sentiment.score < 40 ? 'bg-accent-red' : metrics.sentiment.score > 60 ? 'bg-accent-green' : 'bg-accent-orange'}`} 
              style={{ width: `${metrics.sentiment.score}%` }} 
            />
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="flex flex-col gap-2">
          {/* Internal Computed Signals */}
          <div className="block bg-elevated border border-border rounded p-3 hover:border-secondary transition-colors">
            <div className="flex items-start gap-2">
              <div className="mt-1 w-2 h-2 rounded-full shrink-0 bg-accent-cyan" />
              <div>
                <div className="flex items-center gap-2 mb-1 text-[10px] text-secondary font-semibold uppercase tracking-wider">
                  <Globe className="w-3 h-3" />
                  <span>Internal Analytics</span>
                  <span>•</span>
                  <span>Live</span>
                </div>
                <h3 className="text-sm text-primary leading-snug mb-1">
                  BTC Funding Rate: {metrics.fundingRateZScore > 0 ? '+' : ''}{metrics.fundingRateZScore.toFixed(2)}Z 
                  ({Math.abs(metrics.fundingRateZScore) > 2 ? 'High Deviation' : 'Normal Range'})
                </h3>
                <h3 className="text-sm text-primary leading-snug mb-1">
                  Open Interest: {(metrics.oiChangePct > 0 ? '+' : '')}{metrics.oiChangePct.toFixed(2)}% in last 5m
                </h3>
                <h3 className="text-sm text-primary leading-snug">
                  Order Flow: {metrics.orderFlowImbalance.toFixed(1)}% buy-side pressure
                </h3>
              </div>
            </div>
          </div>
          {news.map((item, i) => (
            <a key={i} href={item.url} target="_blank" rel="noreferrer" className="block bg-elevated border border-border rounded p-3 hover:border-secondary transition-colors">
              <div className="flex items-start gap-2">
                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${item.sentiment === 'RED' ? 'bg-accent-red animate-pulse' : 'bg-secondary'}`} />
                <div>
                  <div className="flex items-center gap-2 mb-1 text-[10px] text-secondary font-semibold uppercase tracking-wider">
                    <Globe className="w-3 h-3" />
                    <span>{item.source}</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(item.publishedAt || Date.now()), { addSuffix: true })}</span>
                  </div>
                  <h3 className="text-sm text-primary leading-snug">{item.title}</h3>
                </div>
              </div>
            </a>
          ))}
          {news.length === 0 && !loading && (
            <div className="p-4 text-center text-secondary text-sm">
              No recent high-risk market signals detected.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useRef } from 'react';
import { useIncidentStore } from '../../store/incidentStore';

// Symbol map: internal asset -> TradingView symbol
const TV_SYMBOL = {
  BTCUSDT: 'BINANCE:BTCUSDT.P',
  ETHUSDT: 'BINANCE:ETHUSDT.P',
  SOLUSDT: 'BINANCE:SOLUSDT.P',
};

export default function PriceChart() {
  const selectedAsset = useIncidentStore(state => state.selectedAsset);
  const containerId = useRef(`tv_chart_${Math.random().toString(36).substring(2, 9)}`).current;

  useEffect(() => {
    let isMounted = true;

    function createWidget() {
      if (!isMounted) return;
      const container = document.getElementById(containerId);
      if (!container) return;

      // Clear container to avoid duplicate iframes
      container.innerHTML = '';

      if (window.TradingView && window.TradingView.widget) {
        new window.TradingView.widget({
          autosize: true,
          symbol: TV_SYMBOL[selectedAsset] || 'BINANCE:BTCUSDT.P',
          interval: '1',
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'en',
          toolbar_bg: '#0A0D12',
          enable_publishing: false,
          allow_symbol_change: true,
          hide_side_toolbar: false,
          withdateranges: true,
          save_image: false,
          container_id: containerId,
        });
      }
    }

    // Load tv.js if not already present
    if (!window.TradingView) {
      let script = document.getElementById('tradingview-widget-script');
      if (!script) {
        script = document.createElement('script');
        script.id = 'tradingview-widget-script';
        script.src = 'https://s3.tradingview.com/tv.js';
        script.type = 'text/javascript';
        script.async = true;
        script.onload = () => {
          if (isMounted) createWidget();
        };
        document.head.appendChild(script);
      } else {
        script.addEventListener('load', createWidget);
      }
    } else {
      createWidget();
    }

    return () => {
      isMounted = false;
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [selectedAsset, containerId]);

  return (
    <div className="flex flex-col h-full w-full bg-card border border-border rounded-lg overflow-hidden min-h-[460px]">
      <div id={containerId} className="w-full h-full min-h-[460px]" />
    </div>
  );
}

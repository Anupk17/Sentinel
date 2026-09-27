const WebSocket = require('ws');
const wsClient = new WebSocket('wss://ws.okx.com:8443/ws/v5/public');

wsClient.on('open', () => {
  console.log('OKX Connected!');
  wsClient.send(JSON.stringify({
    op: 'subscribe',
    args: [{ channel: 'liquidation-orders', instType: 'SWAP' }]
  }));
});

wsClient.on('message', (data) => {
  console.log('OKX Received:', data.toString().substring(0, 300));
  process.exit(0);
});

wsClient.on('error', (e) => console.error('OKX Error:', e));

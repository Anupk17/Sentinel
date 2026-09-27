const WebSocket = require('ws');
const wsUrl = 'wss://fstream.binance.com/stream?streams=btcusdt@aggTrade';
const wsClient = new WebSocket(wsUrl);
wsClient.on('open', () => console.log('Connected!'));
wsClient.on('message', (data) => {
  console.log('Received:', data.toString().substring(0, 200));
  process.exit(0);
});
wsClient.on('error', (e) => console.error(e));

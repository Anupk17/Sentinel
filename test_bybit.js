const WebSocket = require('ws');
const wsClient = new WebSocket('wss://stream.bybit.com/v5/public/linear');

wsClient.on('open', () => {
  console.log('Bybit Connected!');
  wsClient.send(JSON.stringify({
    op: 'subscribe',
    args: ['tickers.BTCUSDT', 'publicTrade.BTCUSDT']
  }));
});

wsClient.on('message', (data) => {
  console.log('Bybit Received:', data.toString().substring(0, 300));
  process.exit(0);
});

wsClient.on('error', (e) => console.error('Bybit Error:', e));

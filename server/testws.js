const WebSocket = require('ws');
const ws = new WebSocket('wss://fstream.binance.com/stream?streams=btcusdt@markPrice@1s');
ws.on('open', () => console.log('Connected!'));
ws.on('message', (d) => console.log('Msg:', d.toString()));
ws.on('error', (e) => console.log('Err:', e));
setTimeout(() => process.exit(), 5000);

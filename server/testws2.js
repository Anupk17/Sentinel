const WebSocket = require('ws');
const ws = new WebSocket('wss://fstream.binance.com/stream?streams=btcusdt@trade/btcusdt@kline_1m');
ws.on('open', () => console.log('Connected to trade/kline!'));
ws.on('message', (d) => { console.log('Msg:', d.toString()); process.exit(); });
ws.on('error', (e) => console.log('Err:', e));
setTimeout(() => { console.log('Timeout'); process.exit(); }, 5000);

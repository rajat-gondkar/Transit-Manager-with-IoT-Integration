const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let esp32Socket = null;
let browserClients = new Set();

wss.on('connection', (ws, req) => {
  if (req.url === '/esp32') {
    esp32Socket = ws;
    console.log('ESP32 connected');
    ws.on('message', (msg) => {
      // Relay to all browser clients
      for (let client of browserClients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(msg);
        }
      }
    });
    ws.on('close', () => {
      console.log('ESP32 disconnected');
      esp32Socket = null;
    });
  } else if (req.url === '/browser') {
    browserClients.add(ws);
    console.log('Browser client connected');
    ws.on('close', () => {
      browserClients.delete(ws);
      console.log('Browser client disconnected');
    });
  }
});

app.get('/health', (req, res) => res.send('OK'));

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Relay server running on port ${PORT}`);
}); 
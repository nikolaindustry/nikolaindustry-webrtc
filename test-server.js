/**
 * Simple test server for WebRTC Viewer and Camera applications
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Serve static files from Viewer and Camera directories
app.use('/viewer', express.static(path.join(__dirname, 'Viewer')));
app.use('/camera', express.static(path.join(__dirname, 'Camera')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Main endpoints
app.get('/', (req, res) => {
  res.send(`
    <h1>WebRTC Test Server</h1>
    <p><a href="/viewer/">Viewer Application</a></p>
    <p><a href="/camera/">Camera Application</a></p>
    <p><a href="/health">Health Check</a></p>
  `);
});

app.get('/viewer/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Viewer', 'index.html'));
});

app.get('/camera/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Camera', 'index.html'));
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Map();

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  console.log('New client connected');
  
  // Generate unique client ID
  const clientId = generateClientId();
  ws.clientId = clientId;
  
  // Store client
  clients.set(clientId, ws);
  
  // Send client their ID
  ws.send(JSON.stringify({
    type: 'welcome',
    clientId: clientId
  }));
  
  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleSignalingMessage(ws, data);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });
  
  // Handle client disconnect
  ws.on('close', () => {
    console.log(`Client ${clientId} disconnected`);
    clients.delete(clientId);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error(`WebSocket error for client ${clientId}:`, error);
  });
});

// Handle signaling messages
function handleSignalingMessage(sender, message) {
  switch (message.type) {
    case 'join':
      // Handle client joining a room
      const room = message.room || 'default';
      sender.room = room;
      
      // Check if client specified a device type
      if (message.deviceType) {
        sender.deviceType = message.deviceType; // 'camera' or 'viewer'
      }
      
      // Check if camera specified a camera ID
      if (message.cameraId) {
        sender.cameraId = message.cameraId;
      }
      
      console.log(`Client ${sender.clientId} joining room ${room} as ${sender.deviceType || 'viewer'} with cameraId ${sender.cameraId}`);
      
      // Notify client of room join success
      sender.send(JSON.stringify({
        type: 'joined',
        room: room
      }));
      break;
      
    case 'requestStream':
      // For testing purposes, just echo back
      sender.send(JSON.stringify({
        type: 'cameraNotFound',
        cameraId: message.cameraId
      }));
      break;
      
    default:
      console.log('Unknown message type:', message.type);
  }
}

// Send message to specific client
function sendToClient(clientId, message) {
  const client = clients.get(clientId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(message));
  }
}

// Generate unique client ID
function generateClientId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Test server is listening on port ${PORT}`);
  console.log(`Access the applications at:`);
  console.log(`  Viewer: http://localhost:${PORT}/viewer/`);
  console.log(`  Camera: http://localhost:${PORT}/camera/`);
});
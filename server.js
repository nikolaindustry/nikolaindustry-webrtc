const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');

// Create Express app
const app = express();

// Serve static files from public directory
app.use(express.static('public'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Main endpoint
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Check if HTTPS certificates exist
let server;
const httpsOptions = {
  key: fs.existsSync('./key.pem') ? fs.readFileSync('./key.pem') : null,
  cert: fs.existsSync('./cert.pem') ? fs.readFileSync('./cert.pem') : null
};

if (httpsOptions.key && httpsOptions.cert) {
  // Create HTTPS server if certificates are available
  server = https.createServer(httpsOptions, app);
  console.log('Starting server with HTTPS support');
} else {
  // Fallback to HTTP server
  server = http.createServer(app);
  console.log('Starting server with HTTP (for production HTTPS should be used for media access)');
}

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
    
    // Notify other clients that this client has left
    broadcast({
      type: 'clientDisconnected',
      clientId: clientId
    }, ws);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error(`WebSocket error for client ${clientId}:`, error);
  });
});

// Handle signaling messages
function handleSignalingMessage(sender, message) {
  // Ensure sender has a clientId
  if (!sender.clientId) {
    console.log('Sender does not have a clientId, skipping message');
    return;
  }
  
  switch (message.type) {
    case 'offer':
      // Validate that target is provided
      if (!message.target) {
        console.log('Offer message missing target client ID');
        return;
      }
      // Send offer to target client
      sendToClient(message.target, {
        type: 'offer',
        sender: sender.clientId,
        sdp: message.sdp
      });
      break;
      
    case 'answer':
      // Validate that target is provided
      if (!message.target) {
        console.log('Answer message missing target client ID');
        return;
      }
      // Send answer to target client
      sendToClient(message.target, {
        type: 'answer',
        sender: sender.clientId,
        sdp: message.sdp
      });
      break;
      
    case 'iceCandidate':
      // Validate that target is provided
      if (!message.target) {
        console.log('ICE candidate message missing target client ID');
        return;
      }
      // Send ICE candidate to target client
      sendToClient(message.target, {
        type: 'iceCandidate',
        sender: sender.clientId,
        candidate: message.candidate
      });
      break;
      
    case 'join':
      // Handle client joining a room
      const room = message.room || 'default';
      sender.room = room;
      
      // Notify client of room join success
      sender.send(JSON.stringify({
        type: 'joined',
        room: room
      }));
      
      // Notify other clients in the room about the new client
      broadcastToRoom(room, {
        type: 'clientJoined',
        clientId: sender.clientId
      }, sender);
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
  } else {
    console.log(`Client ${clientId} not found or not open`);
  }
}

// Broadcast message to all clients except sender
function broadcast(message, sender) {
  clients.forEach((client, clientId) => {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// Broadcast message to all clients in the same room except sender
function broadcastToRoom(room, message, sender) {
  clients.forEach((client, clientId) => {
    if (client !== sender && client.room === room && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// Generate unique client ID
function generateClientId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  const networkInterfaces = require('os').networkInterfaces();
  const addresses = [];
  
  Object.keys(networkInterfaces).forEach(interface => {
    networkInterfaces[interface].forEach(addr => {
      if (!addr.internal && addr.family === 'IPv4') {
        addresses.push(addr.address);
      }
    });
  });
  
  console.log(`Server is listening on port ${PORT}`);
  console.log(`Local: http://localhost:${PORT}`);
  if (addresses.length > 0) {
    console.log(`Network: http://${addresses[0]}:${PORT}`);
  }
  
  // If using HTTPS, also show HTTPS URLs
  if (httpsOptions.key && httpsOptions.cert) {
    console.log(`Secure Local: https://localhost:${PORT}`);
    if (addresses.length > 0) {
      console.log(`Secure Network: https://${addresses[0]}:${PORT}`);
    }
  }
});
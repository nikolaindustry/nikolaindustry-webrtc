const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

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

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Map();

// Store available cameras by room
const availableCameras = new Map();

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
    
    // Remove camera from available cameras if it was a camera
    if (ws.deviceType === 'camera' && ws.cameraId) {
      // Remove from global available cameras tracking
      if (availableCameras.has(ws.room)) {
        const roomCameras = availableCameras.get(ws.room);
        if (roomCameras.has(ws.cameraId)) {
          roomCameras.delete(ws.cameraId);
        }
      }
      
      // Notify other clients in the room that this camera is no longer available
      if (ws.room) {
        broadcastToRoom(ws.room, {
          type: 'cameraUnavailable',
          cameraId: ws.cameraId,
          clientId: clientId
        }, ws);
      }
    }
    
    clients.delete(clientId);
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
      
      // Check if client specified a device type
      if (message.deviceType) {
        sender.deviceType = message.deviceType; // 'camera' or 'viewer'
      }
      
      // Check if camera specified a camera ID
      if (message.cameraId) {
        sender.cameraId = message.cameraId;
      }
      
      // Initialize available cameras tracking for this room if needed
      if (!availableCameras.has(room)) {
        availableCameras.set(room, new Map());
      }
      
      // Notify client of room join success
      sender.send(JSON.stringify({
        type: 'joined',
        room: room
      }));
      
      // Notify other clients in the room about the new client
      broadcastToRoom(room, {
        type: 'clientJoined',
        clientId: sender.clientId,
        deviceType: sender.deviceType || 'viewer',
        cameraId: sender.cameraId
      }, sender);
      
      // If this is a camera, add it to available cameras and notify all viewers
      if (sender.deviceType === 'camera' && sender.cameraId) {
        // Add to available cameras tracking
        availableCameras.get(room).set(sender.cameraId, sender.clientId);
        
        // Notify all viewers in the room about the available camera
        broadcastToRoom(room, {
          type: 'cameraAvailable',
          cameraId: sender.cameraId,
          clientId: sender.clientId
        }, sender);
      }
      
      // If this is a viewer, send them the list of currently available cameras
      if (!sender.deviceType || sender.deviceType === 'viewer') {
        // Send list of currently available cameras
        const roomCameras = availableCameras.get(room);
        if (roomCameras) {
          roomCameras.forEach((cameraClientId, cameraId) => {
            // Verify the camera client is still connected
            if (clients.has(cameraClientId)) {
              sender.send(JSON.stringify({
                type: 'cameraAvailable',
                cameraId: cameraId,
                clientId: cameraClientId
              }));
            }
          });
        }
      }
      break;
      
    case 'requestStream':
      // Viewer requesting to view a specific camera
      if (!message.cameraId) {
        console.log('Request stream message missing camera ID');
        return;
      }
      
      // Find the camera with the requested ID
      let targetCamera = null;
      const roomCameras = availableCameras.get(sender.room);
      if (roomCameras && roomCameras.has(message.cameraId)) {
        const cameraClientId = roomCameras.get(message.cameraId);
        // Verify the camera client is still connected
        if (clients.has(cameraClientId)) {
          targetCamera = cameraClientId;
        } else {
          // Camera is no longer connected, remove from available cameras
          roomCameras.delete(message.cameraId);
        }
      }
      
      if (targetCamera) {
        // Notify the camera that a viewer wants to connect
        sendToClient(targetCamera, {
          type: 'viewerRequest',
          viewerId: sender.clientId,
          requestId: message.requestId || Date.now().toString()
        });
      } else {
        // Notify viewer that camera is not available
        sender.send(JSON.stringify({
          type: 'cameraNotFound',
          cameraId: message.cameraId
        }));
      }
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

// Get client count by room
function getClientCountByRoom(room) {
  let count = 0;
  clients.forEach(client => {
    if (client.room === room) {
      count++;
    }
  });
  return count;
}

// Get clients in room
function getClientsInRoom(room) {
  const roomClients = [];
  clients.forEach((client, clientId) => {
    if (client.room === room) {
      roomClients.push({ clientId, client });
    }
  });
  return roomClients;
}

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is listening on port ${PORT}`);
  console.log(`Access the application at: http://localhost:${PORT}`);
  
  // Log room statistics every 30 seconds
  setInterval(() => {
    const rooms = new Set();
    clients.forEach(client => {
      if (client.room) {
        rooms.add(client.room);
      }
    });
    
    console.log(`Active rooms: ${rooms.size}`);
    rooms.forEach(room => {
      const clientCount = getClientCountByRoom(room);
      console.log(`  Room '${room}': ${clientCount} clients`);
    });
  }, 30000);
});

/**
 * WebRTC CCTV Viewer Application
 * 
 * A standalone viewer application that connects to the WebRTC signaling server
 * to request and display camera streams.
 */

const WebSocket = require('ws');

class WebRTCViewer {
  constructor(config) {
    this.config = config;
    this.ws = null;
    this.clientId = null;
    this.isConnected = false;
    this.availableCameras = new Map();
  }

  // Connect to the signaling server
  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.config.SERVER_URL);
      
      this.ws.on('open', () => {
        console.log('Connected to signaling server');
        this.isConnected = true;
      });
      
      this.ws.on('message', (data) => {
        this.handleMessage(JSON.parse(data));
      });
      
      this.ws.on('close', () => {
        console.log('Disconnected from signaling server');
        this.isConnected = false;
      });
      
      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });
      
      // Resolve when connected
      const onConnected = () => {
        this.ws.removeListener('error', onError);
        resolve();
      };
      
      const onError = (error) => {
        this.ws.removeListener('open', onConnected);
        reject(error);
      };
      
      this.ws.once('open', onConnected);
      this.ws.once('error', onError);
    });
  }

  // Join a room
  joinRoom() {
    if (!this.isConnected) {
      throw new Error('Not connected to server');
    }
    
    this.ws.send(JSON.stringify({
      type: 'join',
      room: this.config.ROOM_NAME
    }));
  }

  // Request stream from a camera
  requestStream(cameraId) {
    if (!this.isConnected) {
      throw new Error('Not connected to server');
    }
    
    this.ws.send(JSON.stringify({
      type: 'requestStream',
      cameraId: cameraId
    }));
    
    console.log(`Requested stream from camera: ${cameraId}`);
  }

  // Handle incoming messages
  handleMessage(message) {
    switch (message.type) {
      case 'welcome':
        this.clientId = message.clientId;
        console.log(`Assigned client ID: ${this.clientId}`);
        // Automatically join room after welcome
        this.joinRoom();
        break;
        
      case 'joined':
        console.log(`Joined room: ${message.room}`);
        break;
        
      case 'cameraAvailable':
        this.availableCameras.set(message.cameraId, message.clientId);
        console.log(`Camera available: ${message.cameraId}`);
        break;
        
      case 'cameraUnavailable':
        this.availableCameras.delete(message.cameraId);
        console.log(`Camera unavailable: ${message.cameraId}`);
        break;
        
      case 'cameraNotFound':
        console.log(`Camera not found: ${message.cameraId}`);
        break;
        
      case 'offer':
        console.log(`Received offer from camera: ${message.sender}`);
        // In a full implementation, you would handle the WebRTC offer here
        break;
        
      default:
        console.log('Received message:', message);
    }
  }

  // Get list of available cameras
  getAvailableCameras() {
    return Array.from(this.availableCameras.keys());
  }

  // Disconnect from server
  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Load configuration
const config = {
  SERVER_URL: process.env.SERVER_URL || 'ws://localhost:8080',
  ROOM_NAME: process.env.ROOM_NAME || 'cctv',
  CAMERA_ID: process.env.CAMERA_ID || 'ESP32-CAM-001'
};

// Create viewer instance
const viewer = new WebRTCViewer(config);

// Connect to server
viewer.connect()
  .then(() => {
    console.log('Viewer connected successfully');
    
    // After a short delay, request stream from camera
    setTimeout(() => {
      console.log('Available cameras:', viewer.getAvailableCameras());
      console.log(`Requesting stream from camera: ${config.CAMERA_ID}`);
      viewer.requestStream(config.CAMERA_ID);
    }, 2000);
  })
  .catch((error) => {
    console.error('Failed to connect viewer:', error);
  });

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down viewer...');
  viewer.disconnect();
  process.exit(0);
});

module.exports = WebRTCViewer;
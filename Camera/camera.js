/**
 * WebRTC CCTV Camera Application
 * 
 * A standalone camera application that connects to the WebRTC signaling server
 * to register itself and stream video.
 */

const WebSocket = require('ws');

class WebRTCCamera {
  constructor(config) {
    this.config = config;
    this.ws = null;
    this.clientId = null;
    this.isConnected = false;
    this.isStreaming = false;
    this.viewers = new Set();
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
        this.isStreaming = false;
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

  // Join a room and register as camera
  joinRoom() {
    if (!this.isConnected) {
      throw new Error('Not connected to server');
    }
    
    this.ws.send(JSON.stringify({
      type: 'join',
      room: this.config.ROOM_NAME,
      deviceType: 'camera',
      cameraId: this.config.CAMERA_ID
    }));
  }

  // Start streaming
  startStreaming() {
    if (!this.isConnected) {
      throw new Error('Not connected to server');
    }
    
    this.isStreaming = true;
    console.log('Camera streaming started');
    
    // Simulate sending periodic frame information
    this.streamInterval = setInterval(() => {
      if (this.isStreaming && this.viewers.size > 0) {
        this.sendFrameInfo();
      }
    }, 1000);
  }

  // Stop streaming
  stopStreaming() {
    this.isStreaming = false;
    if (this.streamInterval) {
      clearInterval(this.streamInterval);
    }
    console.log('Camera streaming stopped');
  }

  // Send frame information
  sendFrameInfo() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    
    // In a real implementation, this would be actual frame data
    const frameInfo = {
      type: 'frameInfo',
      cameraId: this.config.CAMERA_ID,
      timestamp: Date.now(),
      viewers: this.viewers.size
    };
    
    this.ws.send(JSON.stringify(frameInfo));
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
        // Start streaming after joining room
        setTimeout(() => {
          this.startStreaming();
        }, 1000);
        break;
        
      case 'viewerRequest':
        this.viewers.add(message.viewerId);
        console.log(`Viewer ${message.viewerId} requested stream`);
        // In a full implementation, you would start WebRTC negotiation here
        break;
        
      case 'offer':
        console.log(`Received offer from viewer: ${message.sender}`);
        // In a full implementation, you would create and send an answer
        break;
        
      default:
        console.log('Received message:', message);
    }
  }

  // Disconnect from server
  disconnect() {
    this.stopStreaming();
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Load configuration
const config = {
  SERVER_URL: process.env.SERVER_URL || 'ws://localhost:8080',
  CAMERA_ID: process.env.CAMERA_ID || 'ESP32-CAM-001',
  ROOM_NAME: process.env.ROOM_NAME || 'cctv'
};

// Create camera instance
const camera = new WebRTCCamera(config);

// Connect to server
camera.connect()
  .then(() => {
    console.log('Camera connected successfully');
  })
  .catch((error) => {
    console.error('Failed to connect camera:', error);
  });

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down camera...');
  camera.disconnect();
  process.exit(0);
});

module.exports = WebRTCCamera;
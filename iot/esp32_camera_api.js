/**
 * ESP32 CCTV Camera using WebRTC CCTV API
 * 
 * This implementation uses the programmatic WebRTC CCTV API for better 
 * cross-platform compatibility and easier integration.
 */

const { CameraClient } = require('../lib/webrtc-cctv-api.js');

// Mock camera stream for demonstration
// In a real ESP32 implementation, you would use:
// - ESP32-CAM module with OV2640 camera
// - Capture frames and encode to H.264 or VP8
// - Create MediaStream from the video data

class ESP32CameraStream {
  constructor() {
    this.tracks = [{
      kind: 'video',
      stop: () => console.log('Video track stopped')
    }];
  }
  
  getTracks() {
    return this.tracks;
  }
}

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'ws://localhost:8080';
const CAMERA_ID = process.env.CAMERA_ID || 'ESP32-CAM-' + Math.floor(Math.random() * 1000);
const ROOM_NAME = process.env.ROOM_NAME || 'cctv';

// Initialize camera client with a unique camera ID
const camera = new CameraClient({
  serverUrl: SERVER_URL,
  cameraId: CAMERA_ID,
  room: ROOM_NAME,
  mediaConstraints: { 
    video: { width: 640, height: 480 },
    audio: false 
  }
});

// Override the media device access to avoid using browser APIs in Node.js
// In a real ESP32 implementation, you would replace this with actual camera access
camera._createMockStream = function() {
  console.log('Using mock camera stream for ESP32');
  return new ESP32CameraStream();
};

// Monkey patch the getMediaDevices function to use our mock
const originalGetMediaDevices = camera._getMediaDevices || function() {};
camera._getMediaDevices = function(constraints) {
  return this._createMockStream();
};

// Set up event listeners
camera.on('connected', () => {
  console.log(`ESP32 camera ${camera.cameraId} connected to signaling server at ${SERVER_URL}`);
});

camera.on('registered', (data) => {
  console.log(`Camera registered in room: ${data.room} with ID: ${data.cameraId}`);
  // Start streaming after registration
  setTimeout(() => {
    camera.startStreaming().catch(console.error);
  }, 1000);
});

camera.on('streamingStarted', () => {
  console.log(`Camera ${camera.cameraId} started streaming`);
  console.log('In a real ESP32 implementation, this would start capturing from the camera module');
});

camera.on('streamingStopped', () => {
  console.log(`Camera ${camera.cameraId} stopped streaming`);
});

camera.on('viewerRequest', (message) => {
  console.log(`Viewer ${message.viewerId} requested stream from camera ${camera.cameraId}`);
});

camera.on('error', (error) => {
  console.error(`Camera error:`, error);
});

camera.on('disconnected', () => {
  console.log(`ESP32 camera ${camera.cameraId} disconnected from signaling server`);
});

// Override the register method to use our mock stream
const originalRegister = camera.register.bind(camera);
camera.register = async function(roomName = this.defaultRoom) {
  if (!this.isConnected) {
    await this.connect();
  }
  
  // Use mock stream instead of actual media devices
  if (!this.localStream) {
    try {
      this.localStream = this._createMockStream();
    } catch (error) {
      this.emit('error', new Error(`Failed to create mock stream: ${error.message}`));
      throw error;
    }
  }
  
  // Join room as camera
  await this.joinRoom(roomName, {
    deviceType: 'camera',
    cameraId: this.cameraId
  });
  
  this.emit('registered', { room: roomName, cameraId: this.cameraId });
};

// Connect and register camera
async function startCamera() {
  try {
    console.log(`Starting ESP32 camera with ID: ${CAMERA_ID}`);
    await camera.register();
    console.log('Camera registration completed');
  } catch (error) {
    console.error('Failed to register camera:', error);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down ESP32 camera...');
  await camera.close();
  process.exit(0);
});

// Simulate camera movement or other actions
setInterval(() => {
  if (camera.isStreaming) {
    console.log(`Camera ${camera.cameraId} is actively streaming`);
    console.log('In a real ESP32 implementation, this would capture and send video frames');
  }
}, 10000);

// Start the camera
startCamera().catch(console.error);

module.exports = camera;
/**
 * Example usage of the WebRTC CCTV API - Camera Client
 * 
 * This example demonstrates how to create a camera client and register it with the server.
 */

// Import the API (for Node.js environment)
const { CameraClient } = require('../lib/webrtc-cctv-api.js');

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'ws://localhost:8080';
const CAMERA_ID = process.env.CAMERA_ID || 'camera-001';
const ROOM_NAME = process.env.ROOM_NAME || 'cctv';

async function runCamera() {
  // Create camera client
  const camera = new CameraClient({
    serverUrl: SERVER_URL,
    cameraId: CAMERA_ID,
    room: ROOM_NAME,
    mediaConstraints: { 
      video: { width: 1280, height: 720 },
      audio: false 
    }
  });

  // Set up event listeners
  camera.on('connected', () => {
    console.log('Camera connected to server');
  });

  camera.on('registered', (data) => {
    console.log(`Camera registered in room: ${data.room} with ID: ${data.cameraId}`);
    // Start streaming after registration
    camera.startStreaming().catch(console.error);
  });

  camera.on('streamingStarted', () => {
    console.log('Camera streaming started');
  });

  camera.on('viewerRequest', (message) => {
    console.log(`Viewer ${message.viewerId} requested stream`);
  });

  camera.on('error', (error) => {
    console.error('Camera error:', error);
  });

  camera.on('disconnected', () => {
    console.log('Camera disconnected from server');
  });

  // Connect and register camera
  try {
    console.log('Connecting camera...');
    await camera.register();
    console.log('Camera registration completed');
  } catch (error) {
    console.error('Failed to register camera:', error);
  }

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down camera...');
    await camera.close();
    process.exit(0);
  });
}

// Run the camera
runCamera().catch(console.error);
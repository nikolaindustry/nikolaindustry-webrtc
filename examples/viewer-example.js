/**
 * Example usage of the WebRTC CCTV API - Viewer Client
 * 
 * This example demonstrates how to create a viewer client and request a camera stream.
 */

// Import the API (for Node.js environment)
const { ViewerClient } = require('../lib/webrtc-cctv-api.js');

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'ws://localhost:8080';
const CAMERA_ID = process.env.CAMERA_ID || 'camera-001';
const ROOM_NAME = process.env.ROOM_NAME || 'cctv';

async function runViewer() {
  // Create viewer client
  const viewer = new ViewerClient({
    serverUrl: SERVER_URL,
    room: ROOM_NAME
  });

  // Set up event listeners
  viewer.on('connected', () => {
    console.log('Viewer connected to server');
  });

  viewer.on('roomJoined', (room) => {
    console.log(`Viewer joined room: ${room}`);
    // Request stream after joining room
    requestCameraStream();
  });

  viewer.on('cameraAvailable', (message) => {
    console.log(`Camera available: ${message.cameraId}`);
  });

  viewer.on('streamReceived', (stream, cameraId) => {
    console.log(`Stream received from camera: ${cameraId}`);
    console.log(`Stream has ${stream.getTracks().length} tracks`);
    // In a real application, you would attach the stream to a video element
    // For Node.js, you would need additional libraries to process the stream
  });

  viewer.on('cameraNotFound', (message) => {
    console.log(`Camera not found: ${message.cameraId}`);
  });

  viewer.on('error', (error) => {
    console.error('Viewer error:', error);
  });

  viewer.on('disconnected', () => {
    console.log('Viewer disconnected from server');
  });

  // Function to request camera stream
  async function requestCameraStream() {
    try {
      console.log(`Requesting stream from camera: ${CAMERA_ID}`);
      const stream = await viewer.requestStream(CAMERA_ID);
      console.log('Stream request successful');
    } catch (error) {
      console.error('Failed to request stream:', error);
    }
  }

  // Connect and join room
  try {
    console.log('Connecting viewer...');
    await viewer.connect();
    await viewer.joinRoom(ROOM_NAME);
    console.log('Viewer connected and joined room');
  } catch (error) {
    console.error('Failed to connect viewer:', error);
  }

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down viewer...');
    await viewer.close();
    process.exit(0);
  });
}

// Run the viewer
runViewer().catch(console.error);
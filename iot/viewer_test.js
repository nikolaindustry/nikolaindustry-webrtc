/**
 * Test viewer for ESP32 camera using WebRTC CCTV API
 * 
 * This script demonstrates how to connect as a viewer and request a stream
 * from an ESP32 camera.
 */

const { ViewerClient } = require('../lib/webrtc-cctv-api.js');

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'ws://localhost:8080';
const CAMERA_ID = process.env.CAMERA_ID || 'ESP32-CAM-381'; // Use the ID from your ESP32 camera
const ROOM_NAME = process.env.ROOM_NAME || 'cctv';

// Initialize viewer client
const viewer = new ViewerClient({
  serverUrl: SERVER_URL,
  room: ROOM_NAME
});

// Set up event listeners
viewer.on('connected', () => {
  console.log(`Viewer connected to signaling server at ${SERVER_URL}`);
});

viewer.on('roomJoined', (room) => {
  console.log(`Viewer joined room: ${room}`);
  // Request stream after joining room
  requestCameraStream();
});

viewer.on('cameraAvailable', (message) => {
  console.log(`Camera available: ${message.cameraId} (${message.clientId})`);
});

viewer.on('streamReceived', (stream, cameraId) => {
  console.log(`Stream received from camera: ${cameraId}`);
  console.log(`Stream has ${stream.getTracks().length} tracks`);
  console.log('In a browser environment, you would attach this stream to a video element');
  console.log('In Node.js, you would need additional libraries to process the stream');
});

viewer.on('cameraNotFound', (message) => {
  console.log(`Camera not found: ${message.cameraId}`);
  console.log('Make sure the ESP32 camera is running and registered with this ID');
});

viewer.on('error', (error) => {
  console.error('Viewer error:', error);
});

viewer.on('disconnected', () => {
  console.log('Viewer disconnected from signaling server');
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
async function startViewer() {
  try {
    console.log('Connecting viewer...');
    await viewer.connect();
    await viewer.joinRoom(ROOM_NAME);
    console.log('Viewer connected and joined room');
  } catch (error) {
    console.error('Failed to connect viewer:', error);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down viewer...');
  await viewer.close();
  process.exit(0);
});

// Start the viewer
startViewer().catch(console.error);
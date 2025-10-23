// Example ESP32 CCTV Camera using WebRTC
const ESP32WebRTCClient = require('./esp32_client.js');

// Mock camera stream for demonstration
// In a real ESP32 implementation, you would use:
// - ESP32-CAM module with OV2640 camera
// - Capture frames and encode to H.264 or VP8
// - Create MediaStream from the video data

class MockCameraStream {
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

// Initialize ESP32 client with a unique camera ID
// In a real implementation, this could be the device's MAC address or serial number
const cameraId = process.argv[2] || 'ESP32-CAM-001';
const client = new ESP32WebRTCClient('ws://localhost:8080', cameraId);

// Set up mock camera stream
const cameraStream = new MockCameraStream();
client.setMediaStream(cameraStream);

// Connect to signaling server
client.connect();

// Start streaming after a short delay to ensure connection
setTimeout(() => {
  client.startStreaming();
}, 3000);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down ESP32 camera...');
  client.stopStreaming();
  client.close();
  process.exit(0);
});

// Simulate camera movement or other actions
setInterval(() => {
  if (client.isStreaming) {
    console.log(`Camera ${cameraId} is actively streaming`);
  }
}, 10000);
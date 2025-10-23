// Example IoT Camera Device using WebRTC
const HardwareWebRTCClient = require('./hardware_client.js');
const { createReadStream } = require('fs');

// For real hardware, you would use a library like:
// - node-camera (for general cameras)
// - ffmpeg (for video streaming)
// - specific SDKs for your hardware

// Mock camera stream for demonstration
class MockCameraStream {
  getTracks() {
    // Return mock tracks
    return [{
      kind: 'video',
      stop: () => console.log('Mock video track stopped')
    }, {
      kind: 'audio',
      stop: () => console.log('Mock audio track stopped')
    }];
  }
}

// Initialize hardware client
const client = new HardwareWebRTCClient('ws://localhost:8080', 'camera-001');

// Set up mock camera stream
const cameraStream = new MockCameraStream();
client.setMediaStream(cameraStream);

// Connect to signaling server
client.connect();

// Join room after a short delay to ensure connection
setTimeout(() => {
  client.joinRoom('iot-streaming');
}, 2000);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down camera device...');
  client.close();
  process.exit(0);
});
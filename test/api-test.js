/**
 * Test file for the WebRTC CCTV API
 * 
 * This file tests the basic functionality of the API classes.
 */

const { WebRTCCCTVClient, CameraClient, ViewerClient, isBrowser, isNode } = require('../lib/webrtc-cctv-api.js');

console.log('WebRTC CCTV API Test');
console.log('====================');
console.log('Environment:');
console.log('- Browser:', isBrowser);
console.log('- Node.js:', isNode);

// Test WebRTCCCTVClient
console.log('\nTesting WebRTCCCTVClient...');
try {
  const client = new WebRTCCCTVClient({
    serverUrl: 'ws://localhost:8080',
    room: 'test-room'
  });
  
  console.log('✓ WebRTCCCTVClient created successfully');
  console.log('  - Server URL:', client.serverUrl);
  console.log('  - Default Room:', client.defaultRoom);
  console.log('  - ICE Servers:', client.iceServers.length);
  
  // Test event emitter functionality
  let eventReceived = false;
  client.on('testEvent', () => {
    eventReceived = true;
  });
  
  client.emit('testEvent');
  console.log('✓ EventEmitter functionality working:', eventReceived);
} catch (error) {
  console.error('✗ WebRTCCCTVClient test failed:', error.message);
}

// Test CameraClient
console.log('\nTesting CameraClient...');
try {
  const camera = new CameraClient({
    serverUrl: 'ws://localhost:8080',
    cameraId: 'test-camera-001',
    room: 'test-room'
  });
  
  console.log('✓ CameraClient created successfully');
  console.log('  - Camera ID:', camera.cameraId);
  console.log('  - Media Constraints:', JSON.stringify(camera.mediaConstraints));
} catch (error) {
  console.error('✗ CameraClient test failed:', error.message);
}

// Test ViewerClient
console.log('\nTesting ViewerClient...');
try {
  const viewer = new ViewerClient({
    serverUrl: 'ws://localhost:8080',
    room: 'test-room'
  });
  
  console.log('✓ ViewerClient created successfully');
  console.log('  - Available Cameras Map:', viewer.availableCameras instanceof Map);
  console.log('  - Active Streams Map:', viewer.activeStreams instanceof Map);
  console.log('  - Peer Connections Map:', viewer.peerConnections instanceof Map);
} catch (error) {
  console.error('✗ ViewerClient test failed:', error.message);
}

console.log('\nAPI Test Completed');
# WebRTC CCTV API Documentation

## Overview

The WebRTC CCTV API provides a programmatic interface for controlling camera connections, viewer requests, room management, and streaming operations in a WebRTC-based CCTV system. It supports cross-platform compatibility for Windows, Linux, macOS, and embedded systems.

## Features

- Cross-platform compatibility (Browser, Node.js, Embedded systems)
- Camera client registration and streaming
- Viewer client stream requests
- Room-based organization
- Event-driven architecture
- Error handling and graceful shutdown

## Installation

```bash
npm install
```

## Usage

### Camera Client

```javascript
const { CameraClient } = require('./lib/webrtc-cctv-api.js');

// Create camera client
const camera = new CameraClient({
  serverUrl: 'ws://localhost:8080',
  cameraId: 'camera-001',
  room: 'cctv'
});

// Connect and register
await camera.register();

// Start streaming
await camera.startStreaming();
```

### Viewer Client

```javascript
const { ViewerClient } = require('./lib/webrtc-cctv-api.js');

// Create viewer client
const viewer = new ViewerClient({
  serverUrl: 'ws://localhost:8080',
  room: 'cctv'
});

// Connect and join room
await viewer.connect();
await viewer.joinRoom('cctv');

// Request stream from camera
const stream = await viewer.requestStream('camera-001');
```

## API Reference

### WebRTCCCTVClient (Base Class)

#### Constructor Options
- `serverUrl` (string): WebSocket server URL (default: 'ws://localhost:8080')
- `room` (string): Default room name (default: 'cctv')
- `iceServers` (Array): ICE servers configuration (default: Google STUN servers)

#### Methods
- `connect()`: Connect to the signaling server
- `disconnect()`: Disconnect from the signaling server
- `joinRoom(roomName, roomOptions)`: Join a room
- `leaveRoom()`: Leave current room

#### Events
- `connected`: Emitted when connected to server
- `disconnected`: Emitted when disconnected from server
- `roomJoined`: Emitted when successfully joined a room
- `error`: Emitted when an error occurs

### CameraClient

#### Constructor Options
- All options from WebRTCCCTVClient
- `cameraId` (string): Unique camera identifier
- `mediaConstraints` (Object): Media constraints for getUserMedia

#### Methods
- All methods from WebRTCCCTVClient
- `register(roomName)`: Register camera with the server
- `startStreaming()`: Start streaming
- `stopStreaming()`: Stop streaming
- `close()`: Close the camera client and clean up resources

#### Events
- All events from WebRTCCCTVClient
- `registered`: Emitted when camera is registered
- `streamingStarted`: Emitted when streaming starts
- `streamingStopped`: Emitted when streaming stops
- `viewerRequest`: Emitted when a viewer requests the stream

### ViewerClient

#### Constructor Options
- All options from WebRTCCCTVClient

#### Methods
- All methods from WebRTCCCTVClient
- `requestStream(cameraId)`: Request stream from a camera
- `stopViewing(cameraId)`: Stop viewing a camera
- `close()`: Close the viewer client and clean up resources

#### Events
- All events from WebRTCCCTVClient
- `streamReceived`: Emitted when a stream is received
- `cameraAvailable`: Emitted when a camera becomes available
- `cameraUnavailable`: Emitted when a camera becomes unavailable
- `cameraNotFound`: Emitted when a requested camera is not found

## Browser Usage

In browser environments, the API is available through the global `WebRTCCCTVAPI` object:

```html
<script src="lib/webrtc-cctv-api.js"></script>
<script>
  const camera = new WebRTCCCTVAPI.CameraClient({
    serverUrl: 'ws://localhost:8080',
    cameraId: 'browser-camera-001'
  });
</script>
```

## Examples

### Node.js Examples

Run the provided examples:

```bash
# Camera example
npm run camera-example

# Viewer example
npm run viewer-example
```

### Browser Example

Open `examples/browser-example.html` in a web browser.

## Environment Support

- **Browser**: Chrome, Firefox, Safari, Edge
- **Node.js**: Windows, Linux, macOS
- **Embedded Systems**: Any system with Node.js support

## Error Handling

The API uses an event-driven approach for error handling. Listen for the `error` event to handle errors:

```javascript
client.on('error', (error) => {
  console.error('An error occurred:', error.message);
});
```

## License

MIT
# WebRTC CCTV Camera Application

A standalone camera application that connects to the WebRTC signaling server to register itself and stream video.

## Overview

This camera application allows you to register a camera with the WebRTC CCTV system and make it available for viewers to watch live streams. It handles the signaling communication with the server to establish connections with viewers.

The package includes both a Node.js command-line version and a browser-based version with a full user interface that can use your computer's webcam.

## Prerequisites

- Node.js (v12 or higher) for command-line version
- Modern web browser with camera support for browser version
- npm (comes with Node.js)

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

The camera requires three configuration parameters:

1. **SERVER_URL** - The WebSocket URL of your signaling server (e.g., `ws://your-server:8080`)
2. **CAMERA_ID** - A unique identifier for your camera (e.g., `ESP32-CAM-001`)
3. **ROOM_NAME** - The room where your camera will be available (e.g., `cctv`)

These can be set in three ways (in order of precedence):

1. Environment variables:
   ```bash
   export SERVER_URL=ws://your-server:8080
   export CAMERA_ID=ESP32-CAM-001
   export ROOM_NAME=cctv
   npm start
   ```

2. Directly in the [config.js](file:///C:/Users/user/Documents/GitHub/webrtc/iot/config.js) file (see [config.example.js](file:///C:/Users/user/Documents/GitHub/webrtc/iot/config.example.js))

3. Using default values (localhost:8080, ESP32-CAM-001, cctv)

## Usage

### Command-Line Version

Start the camera application:
```bash
npm start
```

The application will:
1. Connect to the signaling server
2. Register itself with the specified camera ID
3. Join the specified room
4. Start streaming (simulated)

### Browser Version

Open [index.html](file:///C:/Users/user/Documents/GitHub/webrtc/Camera/index.html) in a web browser to use the full-featured browser-based camera with UI.

The browser version provides:
- Real-time viewer list updates
- Live camera preview
- Connection status indicators
- Event logging
- Actual webcam streaming

## How It Works

1. The camera connects to the WebSocket signaling server
2. It registers itself with a unique camera ID
3. It joins the specified room
4. When a viewer requests to view this camera, the server notifies the camera
5. The camera and viewer exchange WebRTC signaling messages to establish a peer-to-peer connection
6. Video streams directly between the camera and viewer (not through the server)

## API

### WebRTCCamera Class

#### Constructor
```javascript
const camera = new WebRTCCamera({
  SERVER_URL: 'ws://localhost:8080',
  CAMERA_ID: 'ESP32-CAM-001',
  ROOM_NAME: 'cctv'
});
```

#### Methods
- `connect()` - Connect to the signaling server
- `joinRoom()` - Join the specified room and register as camera
- `startStreaming()` - Start streaming (simulated)
- `stopStreaming()` - Stop streaming
- `disconnect()` - Disconnect from the server

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure the signaling server is running
   - Check the server URL and port
   - Verify network connectivity

2. **Camera Not Found by Viewers**
   - Verify the camera ID is unique
   - Check if the camera is registered in the correct room
   - Ensure the camera is streaming

3. **No Video Stream**
   - The command-line version only handles signaling
   - Use the browser version for actual video streaming
   - Check browser camera permissions
   - Verify camera hardware is working

### Debugging

Enable verbose logging by setting the DEBUG environment variable:
```bash
export DEBUG=webrtc-camera
npm start
```

## Extending the Application

This implementation provides both a basic command-line version and a full browser-based version. To extend the application:

1. Integrate with actual camera hardware (e.g., Raspberry Pi Camera, USB webcam)
2. Implement additional features like motion detection or recording
3. Add authentication and security features
4. Customize the styling to match your brand

For ESP32 camera integration, see the separate ESP32 implementation in the main project.

## License

MIT
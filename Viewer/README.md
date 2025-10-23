# WebRTC CCTV Viewer Application

A standalone viewer application that connects to the WebRTC signaling server to request and display camera streams.

## Overview

This viewer application allows you to connect to a WebRTC CCTV system and view live streams from registered cameras. It handles the signaling communication with the server to establish connections with cameras.

The package includes both a Node.js command-line version and a browser-based version with a full user interface.

## Prerequisites

- Node.js (v12 or higher) for command-line version
- Modern web browser for browser version
- npm (comes with Node.js)

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

The viewer requires three configuration parameters:

1. **SERVER_URL** - The WebSocket URL of your signaling server (e.g., `ws://your-server:8080`)
2. **ROOM_NAME** - The room where you want to look for available cameras (e.g., `cctv`)
3. **CAMERA_ID** - The specific camera ID you want to view (e.g., `ESP32-CAM-001`)

These can be set in three ways (in order of precedence):

1. Environment variables:
   ```bash
   export SERVER_URL=ws://your-server:8080
   export ROOM_NAME=cctv
   export CAMERA_ID=ESP32-CAM-001
   npm start
   ```

2. Directly in the [config.js](file:///C:/Users/user/Documents/GitHub/webrtc/iot/config.js) file (see [config.example.js](file:///C:/Users/user/Documents/GitHub/webrtc/iot/config.example.js))

3. Using default values (localhost:8080, cctv, ESP32-CAM-001)

## Usage

### Command-Line Version

Start the viewer application:
```bash
npm start
```

The application will:
1. Connect to the signaling server
2. Join the specified room
3. Display available cameras
4. Request a stream from the specified camera

### Browser Version

Open [index.html](file:///C:/Users/user/Documents/GitHub/webrtc/Viewer/index.html) in a web browser to use the full-featured browser-based viewer with UI.

The browser version provides:
- Real-time camera list updates
- Interactive camera selection
- Live video display
- Connection status indicators
- Event logging

## How It Works

1. The viewer connects to the WebSocket signaling server
2. It joins the specified room
3. The server sends a list of available cameras in the room
4. The viewer requests a stream from a specific camera by ID
5. The server notifies the camera of the viewer request
6. The camera and viewer exchange WebRTC signaling messages to establish a peer-to-peer connection
7. Video streams directly between the camera and viewer (not through the server)

## API

### WebRTCViewer Class

#### Constructor
```javascript
const viewer = new WebRTCViewer({
  SERVER_URL: 'ws://localhost:8080',
  ROOM_NAME: 'cctv',
  CAMERA_ID: 'ESP32-CAM-001'
});
```

#### Methods
- `connect()` - Connect to the signaling server
- `joinRoom()` - Join the specified room
- `requestStream(cameraId)` - Request a stream from a specific camera
- `getAvailableCameras()` - Get list of available cameras
- `disconnect()` - Disconnect from the server

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure the signaling server is running
   - Check the server URL and port
   - Verify network connectivity

2. **Camera Not Found**
   - Verify the camera ID matches
   - Check if the camera is registered in the same room
   - Ensure the camera is streaming

3. **No Video Display**
   - The command-line version only handles signaling
   - Use the browser version for actual video display
   - Check browser WebRTC support
   - Verify ICE candidate exchange

### Debugging

Enable verbose logging by setting the DEBUG environment variable:
```bash
export DEBUG=webrtc-viewer
npm start
```

## Extending the Application

This implementation provides both a basic command-line version and a full browser-based version. To extend the application:

1. Modify the browser version to add custom UI elements
2. Implement additional features like recording or snapshot capture
3. Add authentication and security features
4. Customize the styling to match your brand

## License

MIT
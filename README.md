# WebRTC Signaling Server

A lightweight WebRTC signaling server built with Node.js and WebSocket to facilitate peer-to-peer video streaming connections. This server handles the exchange of SDP offers/answers and ICE candidates between peers but does not relay the actual video streams.

## Features

- WebSocket-based real-time signaling
- Room-based client organization
- Exchange of SDP offers/answers for connection negotiation
- ICE candidate exchange for NAT traversal
- Simple web interface for testing
- Programmatic API for code-based integration
- Cross-platform compatibility (Windows, Linux, macOS, embedded systems)
- ESP32 camera module support

## Prerequisites

- Node.js (v12 or higher)
- npm (comes with Node.js)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd webrtc-signaling-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Development

To run the server in development mode with auto-restart:
```bash
npm run dev
```

### Production

To run the server in production mode:
```bash
npm start
```

The server will start on port 8080 by default, or the PORT environment variable if set.

### Programmatic API

This server includes a programmatic API for code-based integration. See [API Documentation](API.md) for details.

Examples:
```bash
# Camera example
npm run camera-example

# Viewer example
npm run viewer-example
```

### ESP32 Camera Integration

For ESP32 camera module integration, see [ESP32 Integration Guide](ESP32_GUIDE.md).

IoT examples:
```bash
# ESP32 camera using direct client
cd iot && node esp32_camera.js

# ESP32 camera using programmatic API
cd iot && node esp32_camera_api.js
```

## API Endpoints

- `GET /` - Serve the test client interface
- `GET /health` - Health check endpoint
- WebSocket connection at `/` - Signaling communication

## WebSocket Message Types

### Client to Server

1. `join` - Join a room
   ```json
   {
     "type": "join",
     "room": "room-name"
   }
   ```

2. `offer` - Send SDP offer to another client
   ```json
   {
     "type": "offer",
     "target": "target-client-id",
     "sdp": { /* SDP offer object */ }
   }
   ```

3. `answer` - Send SDP answer to another client
   ```json
   {
     "type": "answer",
     "target": "target-client-id",
     "sdp": { /* SDP answer object */ }
   }
   ```

4. `iceCandidate` - Send ICE candidate to another client
   ```json
   {
     "type": "iceCandidate",
     "target": "target-client-id",
     "candidate": { /* ICE candidate object */ }
   }
   ```

5. `requestStream` - Request stream from a specific camera
   ```json
   {
     "type": "requestStream",
     "cameraId": "camera-identifier"
   }
   ```

### Server to Client

1. `welcome` - Sent when client connects
   ```json
   {
     "type": "welcome",
     "clientId": "assigned-client-id"
   }
   ```

2. `joined` - Sent when client successfully joins a room
   ```json
   {
     "type": "joined",
     "room": "room-name"
   }
   ```

3. `clientJoined` - Sent when another client joins the same room
   ```json
   {
     "type": "clientJoined",
     "clientId": "joining-client-id",
     "deviceType": "camera|viewer",
     "cameraId": "camera-identifier" // For cameras
   }
   ```

4. `clientDisconnected` - Sent when another client disconnects
   ```json
   {
     "type": "clientDisconnected",
     "clientId": "disconnected-client-id"
   }
   ```

5. `offer` - Receive SDP offer from another client
   ```json
   {
     "type": "offer",
     "sender": "sender-client-id",
     "sdp": { /* SDP offer object */ }
   }
   ```

6. `answer` - Receive SDP answer from another client
   ```json
   {
     "type": "answer",
     "sender": "sender-client-id",
     "sdp": { /* SDP answer object */ }
   }
   ```

7. `iceCandidate` - Receive ICE candidate from another client
   ```json
   {
     "type": "iceCandidate",
     "sender": "sender-client-id",
     "candidate": { /* ICE candidate object */ }
   }
   ```

8. `viewerRequest` - Notification to a camera that a viewer wants to connect
   ```json
   {
     "type": "viewerRequest",
     "viewerId": "viewer-client-id"
   }
   ```

9. `cameraAvailable` - Notification that a camera is available in the room
   ```json
   {
     "type": "cameraAvailable",
     "cameraId": "camera-identifier",
     "clientId": "camera-client-id"
   }
   ```

10. `cameraUnavailable` - Notification that a camera is no longer available
    ```json
    {
      "type": "cameraUnavailable",
      "cameraId": "camera-identifier",
      "clientId": "camera-client-id"
    }
    ```

11. `cameraNotFound` - Notification that a requested camera was not found
    ```json
    {
      "type": "cameraNotFound",
      "cameraId": "camera-identifier"
    }
    ```

## Deployment on Render.com

This server is configured for deployment on Render.com using the provided `render.yaml` file. Simply connect your GitHub repository to Render and it will automatically deploy the service.

Environment variables:
- `PORT` - The port to listen on (automatically set by Render)

## Testing

Open your browser to `http://localhost:8080` (or your deployed URL) to access the test interface. You'll need to open two browser windows or tabs to test the peer-to-peer connection.

For programmatic API testing, see the examples in the `examples/` directory:
- `examples/camera-example.js` - Camera client example
- `examples/viewer-example.js` - Viewer client example
- `examples/browser-example.html` - Browser-based example

For ESP32 camera integration, see the examples in the `iot/` directory:
- `iot/esp32_camera.js` - Direct ESP32 camera client implementation
- `iot/esp32_camera_api.js` - ESP32 camera using programmatic API

## How It Works

1. Clients connect to the WebSocket server and are assigned unique IDs
2. Clients join rooms to find peers
3. Cameras register with unique identifiers
4. Viewers request streams from specific cameras by ID
5. When a viewer requests a stream:
   - The server notifies the camera of the viewer request
   - The camera creates an SDP offer and sends it to the viewer via the signaling server
   - The viewer responds with an SDP answer
   - Both clients exchange ICE candidates to establish the peer-to-peer connection
6. Once the signaling process is complete, the video streams flow directly between peers

## Programmatic API

This server includes a comprehensive programmatic API for code-based integration with cross-platform compatibility:

- **CameraClient**: For creating camera clients that can register and stream
- **ViewerClient**: For creating viewer clients that can request and receive streams
- **WebRTCCCTVClient**: Base class with common functionality
- Cross-platform support for Windows, Linux, macOS, and embedded systems
- Browser and Node.js compatibility

See [API Documentation](API.md) for detailed usage instructions.

## ESP32 Integration

The system supports ESP32 camera modules through two approaches:

1. **Node.js Bridge Approach**: Uses a companion device (Raspberry Pi, etc.) that communicates with the ESP32 camera module and handles WebRTC signaling using the programmatic API.

2. **Native ESP32 Approach**: Implements WebRTC directly on the ESP32 (more complex, limited by hardware constraints).

See [ESP32 Integration Guide](ESP32_GUIDE.md) for detailed implementation instructions.

## Security Considerations

This is a basic implementation for demonstration purposes. For production use, consider adding:
- Authentication and authorization
- Rate limiting
- Input validation and sanitization
- TLS/SSL encryption
- CORS configuration

## License

MIT
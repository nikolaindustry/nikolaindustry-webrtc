# Using WebRTC CCTV API with ESP32 Camera Module

This guide explains how to use the WebRTC CCTV API with an ESP32 camera module for real-time video streaming.

## Overview

The WebRTC CCTV API provides a programmatic interface that enables ESP32 camera modules to connect to the signaling server and stream video to viewers. The API supports cross-platform compatibility and can be adapted for embedded systems like ESP32.

## Hardware Requirements

- ESP32-CAM module (with OV2640 camera)
- Micro USB cable for programming
- 5V power supply

## Software Requirements

- Arduino IDE or PlatformIO
- ESP32 board support
- WebRTC library for ESP32 (if available)

## Implementation Approaches

There are two approaches to implement WebRTC with ESP32:

### 1. Node.js Bridge Approach (Recommended)

Use a Node.js application on a companion device (Raspberry Pi, etc.) that communicates with the ESP32 camera module and uses the WebRTC CCTV API.

### 2. Native ESP32 Approach

Implement WebRTC directly on the ESP32 (more complex, limited by hardware constraints).

## Node.js Bridge Approach

This approach uses a companion device that communicates with the ESP32 camera module and handles the WebRTC signaling.

### Directory Structure

```
webrtc/
├── iot/
│   ├── esp32_camera_api.js     # ESP32 camera implementation using WebRTC CCTV API
│   ├── esp32_client.js         # Direct WebRTC client implementation
│   ├── esp32_camera.js         # Example ESP32 camera using direct client
│   └── package.json            # IoT dependencies
└── lib/
    └── webrtc-cctv-api.js      # Main WebRTC CCTV API
```

### Implementation Steps

1. **Set up the companion device** (Raspberry Pi, etc.) with Node.js
2. **Install dependencies**:
   ```bash
   cd iot
   npm install
   ```

3. **Run the ESP32 camera**:
   ```bash
   # Using the programmatic API (recommended)
   node esp32_camera_api.js
   
   # Using the direct client
   node esp32_camera.js
   ```

4. **Configure environment variables** (optional):
   ```bash
   export SERVER_URL=ws://your-server:8080
   export CAMERA_ID=ESP32-CAM-001
   export ROOM_NAME=cctv
   node esp32_camera_api.js
   ```

### Example Code ([iot/esp32_camera_api.js](file:///C:/Users/user/Documents/GitHub/webrtc/iot/esp32_camera_api.js))

```javascript
const { CameraClient } = require('../lib/webrtc-cctv-api.js');

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'ws://localhost:8080';
const CAMERA_ID = process.env.CAMERA_ID || 'ESP32-CAM-001';
const ROOM_NAME = process.env.ROOM_NAME || 'cctv';

// Initialize camera client
const camera = new CameraClient({
  serverUrl: SERVER_URL,
  cameraId: CAMERA_ID,
  room: ROOM_NAME
});

// Set up event listeners
camera.on('connected', () => {
  console.log(`ESP32 camera connected to server`);
});

camera.on('registered', (data) => {
  console.log(`Camera registered in room: ${data.room}`);
  // Start streaming after registration
  camera.startStreaming();
});

camera.on('viewerRequest', (message) => {
  console.log(`Viewer ${message.viewerId} requested stream`);
});

// Connect and register camera
camera.register();
```

## Native ESP32 Approach

For a native implementation on ESP32, you would need to:

1. **Use ESP-IDF or Arduino framework**
2. **Implement WebRTC signaling** using HTTP/WebSocket libraries
3. **Handle SDP offer/answer exchange**
4. **Manage ICE candidates**
5. **Stream video data** from the camera module

### Required Libraries

- ArduinoWebSockets or similar WebSocket library
- ESP32-CAM library for camera control
- JSON library for message parsing

### Example Structure

```cpp
#include <WebSocketsClient.h>
#include <esp_camera.h>

WebSocketsClient webSocket;

void setup() {
  // Initialize camera
  camera_config_t config;
  // ... camera configuration ...
  esp_camera_init(&config);
  
  // Connect to WebSocket server
  webSocket.begin("server-ip", 8080, "/");
  webSocket.onEvent(webSocketEvent);
}

void loop() {
  webSocket.loop();
  
  // Capture and send video frames
  if (streaming) {
    camera_fb_t * fb = esp_camera_fb_get();
    if (fb) {
      // Send frame via WebSocket
      webSocket.sendBIN(fb->buf, fb->len);
      esp_camera_fb_return(fb);
    }
  }
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_CONNECTED:
      // Send join message
      break;
    case WStype_TEXT:
      // Handle signaling messages
      break;
  }
}
```

## API Integration

The WebRTC CCTV API provides the following key features for ESP32 integration:

### Camera Registration
```javascript
const camera = new CameraClient({
  serverUrl: 'ws://localhost:8080',
  cameraId: 'ESP32-CAM-001',
  room: 'cctv'
});

await camera.register();
```

### Streaming Control
```javascript
// Start streaming
await camera.startStreaming();

// Stop streaming
await camera.stopStreaming();
```

### Event Handling
```javascript
camera.on('viewerRequest', (message) => {
  console.log(`Viewer ${message.viewerId} requested stream`);
  // Prepare for streaming
});

camera.on('error', (error) => {
  console.error('Camera error:', error);
});
```

## Configuration Options

### Environment Variables
- `SERVER_URL`: WebSocket server URL (default: ws://localhost:8080)
- `CAMERA_ID`: Unique camera identifier (default: auto-generated)
- `ROOM_NAME`: Room to join (default: cctv)

### Camera Settings
- Video resolution
- Frame rate
- Bitrate control
- Network configuration

## Testing

1. **Start the signaling server**:
   ```bash
   npm start
   ```

2. **Run the ESP32 camera**:
   ```bash
   cd iot
   node esp32_camera_api.js
   ```

3. **Open the viewer interface** in a browser:
   ```
   http://localhost:8080
   ```

4. **Request the camera stream** by entering the camera ID

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
   - Check browser WebRTC support
   - Verify ICE candidate exchange
   - Check firewall settings

### Debugging Tips

1. **Enable verbose logging**:
   ```javascript
   camera.on('error', (error) => {
     console.error('Detailed error:', error);
   });
   ```

2. **Monitor server logs** for signaling messages

3. **Use browser developer tools** to inspect WebSocket traffic

## Performance Optimization

### For Companion Device
- Use efficient video encoding
- Optimize WebSocket message handling
- Implement connection retry logic
- Monitor memory usage

### For ESP32
- Reduce video resolution if needed
- Optimize camera capture settings
- Implement efficient data transfer
- Use appropriate power management

## Security Considerations

- Use secure WebSocket (wss://) in production
- Implement authentication if needed
- Validate all incoming messages
- Use secure network connections

## Extending Functionality

### Additional Features
- Motion detection
- Recording capabilities
- Remote control (pan/tilt)
- Multiple camera support
- Custom metadata transmission

### Integration with Other Systems
- IoT platforms (AWS IoT, Google Cloud IoT)
- Home automation systems
- Security systems
- Analytics services

## Conclusion

The WebRTC CCTV API provides a robust foundation for integrating ESP32 camera modules into a real-time video streaming system. The Node.js bridge approach is recommended for most use cases due to its simplicity and the availability of mature WebRTC libraries.
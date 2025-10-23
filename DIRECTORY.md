# Project Directory Structure

```
webrtc/
├── examples/                 # Example implementations
│   ├── browser-example.html  # Browser-based example
│   ├── camera-example.js     # Camera client example
│   └── viewer-example.js     # Viewer client example
├── iot/                      # IoT device implementations
│   └── esp32-camera.ino      # ESP32 camera simulation
├── lib/                      # Library code
│   └── webrtc-cctv-api.js    # Programmatic API
├── public/                   # Static web files
│   ├── esp32-camera.html     # ESP32 camera simulator interface
│   └── index.html            # Main viewer interface
├── test/                     # Test files
│   └── api-test.js           # API test script
├── .gitignore                # Git ignore file
├── API.md                    # API documentation
├── DIRECTORY.md              # This file
├── README.md                 # Project documentation
├── cert.pem                  # SSL certificate
├── key.pem                   # SSL private key
├── package-lock.json         # NPM lock file
├── package.json              # NPM package file
├── render.yaml               # Render.com deployment config
└── server.js                 # Main server implementation
```

## Directory Descriptions

### examples/
Contains example implementations showing how to use the programmatic API:
- `browser-example.html`: Complete browser-based example with UI
- `camera-example.js`: Node.js camera client example
- `viewer-example.js`: Node.js viewer client example

### iot/
Contains IoT device implementations:
- `esp32-camera.ino`: ESP32 camera simulation code

### lib/
Contains library code:
- `webrtc-cctv-api.js`: The main programmatic API with CameraClient and ViewerClient classes

### public/
Contains static web files served by the Express server:
- `esp32-camera.html`: ESP32 camera simulator interface
- `index.html`: Main viewer interface

### test/
Contains test files:
- `api-test.js`: Simple test script to verify API functionality

## Key Files

### server.js
The main WebSocket signaling server implementation that handles:
- Client connections and disconnections
- Room management
- Message routing between clients
- Camera registration and viewer requests

### lib/webrtc-cctv-api.js
The programmatic API that provides:
- `WebRTCCCTVClient`: Base class with common functionality
- `CameraClient`: Camera client implementation
- `ViewerClient`: Viewer client implementation
- Cross-platform compatibility for browser and Node.js environments

### public/index.html
The main viewer interface that allows users to:
- Connect to the signaling server
- Join rooms
- View available cameras
- Request streams from specific cameras

### public/esp32-camera.html
The ESP32 camera simulator interface that allows users to:
- Simulate an IoT camera device
- Register with a unique camera ID
- Join rooms
- Start/stop streaming

### examples/browser-example.html
A complete browser-based example that demonstrates:
- Creating both camera and viewer clients
- Connecting to the signaling server
- Registering cameras and requesting streams
- Full UI with controls and status indicators
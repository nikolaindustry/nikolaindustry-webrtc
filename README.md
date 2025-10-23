# WebRTC CCTV Test Server

A simple test server for the standalone WebRTC Viewer and Camera applications.

## Overview

This test server allows you to run and test the standalone Viewer and Camera applications without needing the full backend infrastructure. It provides:

- WebSocket signaling server for WebRTC communication
- Static file serving for the browser-based applications
- Basic message handling for testing purposes

## Prerequisites

- Node.js (v12 or higher)
- npm (comes with Node.js)

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

## Usage

Start the test server:
```bash
npm start
```

The server will start on port 8080 by default and serve:

- Viewer application at http://localhost:8080/viewer/
- Camera application at http://localhost:8080/camera/
- Health check endpoint at http://localhost:8080/health

## How It Works

The test server provides a minimal implementation of the WebRTC signaling protocol:

1. Clients connect to the WebSocket server
2. Clients are assigned unique IDs
3. Clients can join rooms
4. Basic message routing is implemented

This is intended for testing purposes only and does not provide full WebRTC functionality.

## Directory Structure

```
├── Camera/              # Standalone camera application
├── Viewer/              # Standalone viewer application
├── test-server.js       # Test server implementation
├── package.json         # Test server dependencies
```

## Testing the Applications

1. Start the test server:
   ```bash
   npm start
   ```

2. Open the camera application in one browser tab:
   http://localhost:8080/camera/

3. Open the viewer application in another browser tab:
   http://localhost:8080/viewer/

4. Configure both applications to use ws://localhost:8080 as the server URL

## Limitations

This test server is for development and testing purposes only. It has several limitations:

- No actual WebRTC media streaming
- Minimal message handling
- No persistence
- No security features
- No camera registration tracking

For production use, use the full WebRTC backend infrastructure.

## License

MIT
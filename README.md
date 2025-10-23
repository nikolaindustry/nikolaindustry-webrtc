# WebRTC Signaling Server

A lightweight WebRTC signaling server built with Node.js and WebSocket to facilitate peer-to-peer video streaming connections. This server handles the exchange of SDP offers/answers and ICE candidates between peers but does not relay the actual video streams.

## Features

- WebSocket-based real-time signaling
- Room-based client organization
- Exchange of SDP offers/answers for connection negotiation
- ICE candidate exchange for NAT traversal
- Simple web interface for testing

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
     "clientId": "joining-client-id"
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

## Deployment on Render.com

This server is configured for deployment on Render.com using the provided `render.yaml` file. Simply connect your GitHub repository to Render and it will automatically deploy the service.

Environment variables:
- `PORT` - The port to listen on (automatically set by Render)

## Testing

Open your browser to `http://localhost:8080` (or your deployed URL) to access the test interface. You'll need to open two browser windows or tabs to test the peer-to-peer connection.

## How It Works

1. Clients connect to the WebSocket server and are assigned unique IDs
2. Clients join rooms to find peers
3. When a client wants to connect to a peer:
   - They create an SDP offer and send it to the target client via the signaling server
   - The target client responds with an SDP answer
   - Both clients exchange ICE candidates to establish the peer-to-peer connection
4. Once the signaling process is complete, the video streams flow directly between peers

## Security Considerations

This is a basic implementation for demonstration purposes. For production use, consider adding:
- Authentication and authorization
- Rate limiting
- Input validation and sanitization
- TLS/SSL encryption
- CORS configuration

## License

MIT
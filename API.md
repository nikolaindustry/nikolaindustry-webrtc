# WebRTC Signaling Server API

## WebSocket Connection

Connect to the server using WebSocket protocol:
```
ws://localhost:8080
```

On production (Render.com):
```
wss://your-app-name.onrender.com
```

## Message Flow

1. Client connects to WebSocket server
2. Server sends `welcome` message with client ID
3. Client joins a room with `join` message
4. Clients exchange signaling messages:
   - `offer` - Initiates connection
   - `answer` - Responds to offer
   * `iceCandidate` - Exchanges network information

## Message Formats

All messages are JSON objects with a `type` field indicating the message type.

### Server to Client Messages

#### Welcome
Sent when a client first connects.
```json
{
  "type": "welcome",
  "clientId": "unique-client-id"
}
```

#### Joined
Sent when a client successfully joins a room.
```json
{
  "type": "joined",
  "room": "room-name"
}
```

#### Client Joined
Sent to all clients in a room when a new client joins.
```json
{
  "type": "clientJoined",
  "clientId": "joining-client-id"
}
```

#### Client Disconnected
Sent to all clients in a room when a client disconnects.
```json
{
  "type": "clientDisconnected",
  "clientId": "disconnected-client-id"
}
```

#### Offer
Sent when a peer wants to initiate a connection.
```json
{
  "type": "offer",
  "sender": "sender-client-id",
  "sdp": { /* RTCSessionDescription object */ }
}
```

#### Answer
Sent in response to an offer.
```json
{
  "type": "answer",
  "sender": "sender-client-id",
  "sdp": { /* RTCSessionDescription object */ }
}
```

#### ICE Candidate
Sent to exchange network connectivity information.
```json
{
  "type": "iceCandidate",
  "sender": "sender-client-id",
  "candidate": { /* RTCIceCandidate object */ }
}
```

### Client to Server Messages

#### Join Room
Join a specific room to find peers.
```json
{
  "type": "join",
  "room": "room-name"
}
```

#### Offer
Send an SDP offer to initiate a connection with a peer.
```json
{
  "type": "offer",
  "target": "target-client-id",
  "sdp": { /* RTCSessionDescription object */ }
}
```

#### Answer
Send an SDP answer in response to an offer.
```json
{
  "type": "answer",
  "target": "target-client-id",
  "sdp": { /* RTCSessionDescription object */ }
}
```

#### ICE Candidate
Send an ICE candidate to a peer.
```json
{
  "type": "iceCandidate",
  "target": "target-client-id",
  "candidate": { /* RTCIceCandidate object */ }
}
```

## HTTP Endpoints

### Health Check
```
GET /health
```
Returns server status information.

Example response:
```json
{
  "status": "OK",
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

### Main Page
```
GET /
```
Serves the test client interface.

## Error Handling

The server will log errors to the console. Common issues include:
- Invalid JSON messages
- Sending messages to non-existent clients
- Network connectivity issues

Clients should implement proper error handling for WebSocket connection events:
- `onerror` - Handle connection errors
- `onclose` - Handle disconnections
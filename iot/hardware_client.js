// WebRTC Hardware Client for IoT Devices
const WebSocket = require('ws');
const wrtc = require('wrtc');

class HardwareWebRTCClient {
  constructor(signalingServerUrl, deviceId) {
    this.signalingServerUrl = signalingServerUrl;
    this.deviceId = deviceId;
    this.ws = null;
    this.peerConnections = new Map();
    this.mediaStream = null;
  }

  // Connect to signaling server
  connect() {
    this.ws = new WebSocket(this.signalingServerUrl);
    
    this.ws.on('open', () => {
      console.log(`Hardware device ${this.deviceId} connected to signaling server`);
    });
    
    this.ws.on('message', (data) => {
      const message = JSON.parse(data);
      this.handleSignalingMessage(message);
    });
    
    this.ws.on('close', () => {
      console.log(`Hardware device ${this.deviceId} disconnected from signaling server`);
    });
    
    this.ws.on('error', (error) => {
      console.error(`WebSocket error for device ${this.deviceId}:`, error);
    });
  }

  // Join a room
  joinRoom(room) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'join',
        room: room
      }));
    }
  }

  // Handle signaling messages
  handleSignalingMessage(message) {
    switch (message.type) {
      case 'welcome':
        this.deviceId = message.clientId;
        console.log(`Assigned device ID: ${this.deviceId}`);
        break;
        
      case 'joined':
        console.log(`Joined room: ${message.room}`);
        break;
        
      case 'offer':
        this.handleOffer(message);
        break;
        
      case 'answer':
        this.handleAnswer(message);
        break;
        
      case 'iceCandidate':
        this.handleIceCandidate(message);
        break;
        
      case 'clientJoined':
        console.log(`Browser client ${message.clientId} joined the room`);
        // Auto-initiate connection to browser client
        this.createPeerConnection(message.clientId);
        this.createOffer(message.clientId);
        break;
    }
  }

  // Set media stream (from camera)
  setMediaStream(stream) {
    this.mediaStream = stream;
  }

  // Create peer connection
  createPeerConnection(clientId) {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
    
    const peerConnection = new wrtc.RTCPeerConnection(configuration);
    
    // Add media tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.mediaStream);
      });
    }
    
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.ws.send(JSON.stringify({
          type: 'iceCandidate',
          target: clientId,
          candidate: event.candidate
        }));
      }
    };
    
    // Store peer connection
    this.peerConnections.set(clientId, peerConnection);
    return peerConnection;
  }

  // Create offer
  async createOffer(clientId) {
    try {
      const peerConnection = this.peerConnections.get(clientId);
      if (!peerConnection) return;
      
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      this.ws.send(JSON.stringify({
        type: 'offer',
        target: clientId,
        sdp: offer
      }));
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }

  // Handle offer
  async handleOffer(message) {
    try {
      let peerConnection;
      if (this.peerConnections.has(message.sender)) {
        peerConnection = this.peerConnections.get(message.sender);
      } else {
        peerConnection = this.createPeerConnection(message.sender);
      }
      
      await peerConnection.setRemoteDescription(new wrtc.RTCSessionDescription(message.sdp));
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      this.ws.send(JSON.stringify({
        type: 'answer',
        target: message.sender,
        sdp: answer
      }));
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }

  // Handle answer
  async handleAnswer(message) {
    try {
      const peerConnection = this.peerConnections.get(message.sender);
      if (!peerConnection) return;
      
      await peerConnection.setRemoteDescription(new wrtc.RTCSessionDescription(message.sdp));
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }

  // Handle ICE candidate
  async handleIceCandidate(message) {
    try {
      const peerConnection = this.peerConnections.get(message.sender);
      if (!peerConnection) return;
      
      await peerConnection.addIceCandidate(new wrtc.RTCIceCandidate(message.candidate));
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  // Close all connections
  close() {
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();
    if (this.ws) {
      this.ws.close();
    }
  }
}

module.exports = HardwareWebRTCClient;
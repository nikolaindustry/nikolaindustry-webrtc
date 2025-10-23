// WebRTC Client for ESP32 CCTV Devices
const WebSocket = require('ws');
const wrtc = require('wrtc');

class ESP32WebRTCClient {
  constructor(signalingServerUrl, cameraId) {
    this.signalingServerUrl = signalingServerUrl;
    this.cameraId = cameraId;
    this.deviceId = null;
    this.ws = null;
    this.peerConnections = new Map();
    this.mediaStream = null;
    this.isStreaming = false;
  }

  // Connect to signaling server
  connect() {
    this.ws = new WebSocket(this.signalingServerUrl);
    
    this.ws.on('open', () => {
      console.log(`ESP32 camera ${this.cameraId} connected to signaling server`);
      
      // Join the CCTV room with camera device type
      this.ws.send(JSON.stringify({
        type: 'join',
        room: 'cctv',
        deviceType: 'camera',
        cameraId: this.cameraId
      }));
    });
    
    this.ws.on('message', (data) => {
      const message = JSON.parse(data);
      this.handleSignalingMessage(message);
    });
    
    this.ws.on('close', () => {
      console.log(`ESP32 camera ${this.cameraId} disconnected from signaling server`);
      // Attempt to reconnect
      setTimeout(() => {
        this.connect();
      }, 5000);
    });
    
    this.ws.on('error', (error) => {
      console.error(`WebSocket error for camera ${this.cameraId}:`, error);
    });
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
        
      case 'viewerRequest':
        console.log(`Viewer ${message.viewerId} requested stream`);
        this.handleViewerRequest(message);
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
    }
  }

  // Handle viewer request for stream
  handleViewerRequest(message) {
    console.log(`Creating connection for viewer ${message.viewerId}`);
    this.createPeerConnection(message.viewerId);
    this.createOffer(message.viewerId);
  }

  // Set media stream (from camera)
  setMediaStream(stream) {
    this.mediaStream = stream;
  }

  // Start streaming
  startStreaming() {
    this.isStreaming = true;
    console.log(`Camera ${this.cameraId} started streaming`);
  }

  // Stop streaming
  stopStreaming() {
    this.isStreaming = false;
    console.log(`Camera ${this.cameraId} stopped streaming`);
    
    // Close all peer connections
    this.peerConnections.forEach((pc, viewerId) => {
      pc.close();
    });
    this.peerConnections.clear();
  }

  // Create peer connection
  createPeerConnection(viewerId) {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
    
    const peerConnection = new wrtc.RTCPeerConnection(configuration);
    
    // Add media tracks (video only for CCTV)
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
          target: viewerId,
          candidate: event.candidate
        }));
      }
    };
    
    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state with viewer ${viewerId}: ${peerConnection.connectionState}`);
      if (peerConnection.connectionState === 'disconnected' || 
          peerConnection.connectionState === 'failed') {
        this.peerConnections.delete(viewerId);
      }
    };
    
    // Store peer connection
    this.peerConnections.set(viewerId, peerConnection);
    return peerConnection;
  }

  // Create offer
  async createOffer(viewerId) {
    try {
      const peerConnection = this.peerConnections.get(viewerId);
      if (!peerConnection) return;
      
      const offer = await peerConnection.createOffer({
        offerToReceiveVideo: false // Camera sends video, doesn't receive
      });
      
      await peerConnection.setLocalDescription(offer);
      
      this.ws.send(JSON.stringify({
        type: 'offer',
        target: viewerId,
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
      
      const answer = await peerConnection.createAnswer({
        offerToReceiveVideo: false // Camera sends video, doesn't receive
      });
      
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

module.exports = ESP32WebRTCClient;
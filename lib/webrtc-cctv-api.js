/**
 * WebRTC CCTV API
 * 
 * A programmatic interface for controlling camera connections, viewer requests,
 * room management, and streaming operations in a WebRTC-based CCTV system.
 * 
 * Cross-platform compatibility:
 * - Browser environments (Chrome, Firefox, Safari, Edge)
 * - Node.js environments (Windows, Linux, macOS)
 * - Embedded systems with Node.js support
 * 
 * @author Your Name
 * @version 1.1.0
 */

// Check if we're in a browser environment or Node.js
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

// Import required modules based on environment
let WebSocket, EventEmitter;
if (isNode) {
  WebSocket = require('ws');
  EventEmitter = require('events');
} else {
  // In browser, WebSocket and EventEmitter are available through window or native implementations
  WebSocket = window.WebSocket;
  // Simple EventEmitter implementation for browser
  EventEmitter = class extends EventTarget {
    constructor() {
      super();
    }
    
    emit(event, ...args) {
      const customEvent = new CustomEvent(event, { detail: args });
      this.dispatchEvent(customEvent);
    }
    
    on(event, listener) {
      this.addEventListener(event, (e) => listener(...e.detail));
    }
    
    once(event, listener) {
      this.addEventListener(event, (e) => listener(...e.detail), { once: true });
    }
    
    removeListener(event, listener) {
      this.removeEventListener(event, listener);
    }
  };
}

/**
 * Utility function to get media devices based on environment
 */
async function getMediaDevices(constraints) {
  if (isBrowser && navigator.mediaDevices) {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } else if (isNode) {
    // In Node.js, we don't have direct access to media devices
    // This would need to be implemented with a native addon or external service
    throw new Error('Media device access not available in Node.js environment');
  } else {
    throw new Error('Media device access not available in this environment');
  }
}

/**
 * WebRTC CCTV Client Base Class
 * @extends EventEmitter
 */
class WebRTCCCTVClient extends EventEmitter {
  /**
   * Create a new WebRTC CCTV client
   * @param {Object} options - Configuration options
   * @param {string} options.serverUrl - WebSocket server URL
   * @param {string} [options.room='cctv'] - Default room name
   * @param {Object} [options.iceServers] - ICE servers configuration
   */
  constructor(options = {}) {
    super();
    
    this.serverUrl = options.serverUrl || 'ws://localhost:8080';
    this.defaultRoom = options.room || 'cctv';
    this.iceServers = options.iceServers || [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ];
    
    this.ws = null;
    this.clientId = null;
    this.currentRoom = null;
    this.isConnected = false;
    this.isConnecting = false;
    
    // Bind event handlers
    this._handleWebSocketMessage = this._handleWebSocketMessage.bind(this);
    this._handleWebSocketOpen = this._handleWebSocketOpen.bind(this);
    this._handleWebSocketClose = this._handleWebSocketClose.bind(this);
    this._handleWebSocketError = this._handleWebSocketError.bind(this);
  }
  
  /**
   * Connect to the signaling server
   * @returns {Promise<void>}
   */
  async connect() {
    // Prevent multiple simultaneous connection attempts
    if (this.isConnecting) {
      throw new Error('Connection attempt already in progress');
    }
    
    if (this.isConnected) {
      return Promise.resolve();
    }
    
    this.isConnecting = true;
    
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl);
        
        this.ws.onopen = this._handleWebSocketOpen;
        this.ws.onmessage = this._handleWebSocketMessage;
        this.ws.onclose = this._handleWebSocketClose;
        this.ws.onerror = this._handleWebSocketError;
        
        // Set up resolution handlers
        const onConnected = () => {
          this.removeListener('error', onError);
          resolve();
        };
        
        const onError = (error) => {
          this.removeListener('connected', onConnected);
          reject(error);
        };
        
        this.once('connected', onConnected);
        this.once('error', onError);
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }
  
  /**
   * Disconnect from the signaling server
   * @returns {Promise<void>}
   */
  async disconnect() {
    return new Promise((resolve) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
        this.once('disconnected', resolve);
      } else {
        resolve();
      }
    });
  }
  
  /**
   * Join a room
   * @param {string} roomName - Name of the room to join
   * @param {Object} [roomOptions] - Additional room options
   * @returns {Promise<void>}
   */
  async joinRoom(roomName, roomOptions = {}) {
    if (!this.isConnected) {
      throw new Error('Not connected to server');
    }
    
    return new Promise((resolve, reject) => {
      const joinMessage = {
        type: 'join',
        room: roomName,
        ...roomOptions
      };
      
      const onJoined = (room) => {
        if (room === roomName) {
          this.removeListener('error', onError);
          resolve();
        }
      };
      
      const onError = (error) => {
        this.removeListener('roomJoined', onJoined);
        reject(error);
      };
      
      this.once('roomJoined', onJoined);
      this.once('error', onError);
      
      this.ws.send(JSON.stringify(joinMessage));
    });
  }
  
  /**
   * Leave current room
   * @returns {Promise<void>}
   */
  async leaveRoom() {
    if (!this.currentRoom) {
      throw new Error('Not in a room');
    }
    
    return this.joinRoom('default');
  }
  
  /**
   * Get list of available cameras in current room
   * @returns {Promise<Array>} Array of available camera objects
   */
  async getAvailableCameras() {
    if (!this.isConnected) {
      throw new Error('Not connected to server');
    }
    
    return new Promise((resolve) => {
      // Emit an event with the current available cameras
      const cameras = [];
      this.emit('availableCamerasList', cameras);
      resolve(cameras);
    });
  }
  
  /**
   * Handle WebSocket open event
   * @private
   */
  _handleWebSocketOpen() {
    this.isConnecting = false;
    this.isConnected = true;
    this.emit('connected');
  }
  
  /**
   * Handle WebSocket message event
   * @private
   * @param {MessageEvent|string} data - Message data
   */
  _handleWebSocketMessage(data) {
    try {
      // Handle both browser MessageEvent and Node.js Buffer/string
      const messageData = typeof data === 'string' ? data : (data.data || data);
      const message = JSON.parse(messageData);
      
      switch (message.type) {
        case 'welcome':
          this.clientId = message.clientId;
          this.emit('welcome', this.clientId);
          break;
          
        case 'joined':
          this.currentRoom = message.room;
          this.emit('roomJoined', message.room);
          break;
          
        case 'clientJoined':
          this.emit('clientJoined', message);
          break;
          
        case 'clientDisconnected':
          this.emit('clientDisconnected', message);
          break;
          
        case 'cameraAvailable':
          this.emit('cameraAvailable', message);
          break;
          
        case 'cameraUnavailable':
          this.emit('cameraUnavailable', message);
          break;
          
        case 'cameraNotFound':
          this.emit('cameraNotFound', message);
          break;
          
        default:
          this.emit('message', message);
      }
    } catch (error) {
      this.emit('error', error);
    }
  }
  
  /**
   * Handle WebSocket close event
   * @private
   */
  _handleWebSocketClose() {
    this.isConnecting = false;
    this.isConnected = false;
    this.clientId = null;
    this.currentRoom = null;
    this.emit('disconnected');
  }
  
  /**
   * Handle WebSocket error event
   * @private
   * @param {Error|Event} error - Error object
   */
  _handleWebSocketError(error) {
    this.isConnecting = false;
    this.emit('error', error);
  }
}

/**
 * Camera Client Class
 * @extends WebRTCCCTVClient
 */
class CameraClient extends WebRTCCCTVClient {
  /**
   * Create a new camera client
   * @param {Object} options - Configuration options
   * @param {string} options.cameraId - Unique camera identifier
   * @param {Object} [options.mediaConstraints] - Media constraints for getUserMedia
   */
  constructor(options = {}) {
    super(options);
    
    this.cameraId = options.cameraId || this._generateCameraId();
    this.mediaConstraints = options.mediaConstraints || { video: true, audio: false };
    this.localStream = null;
    this.peerConnections = new Map();
    this.isStreaming = false;
  }
  
  /**
   * Generate a unique camera ID
   * @private
   * @returns {string} Generated camera ID
   */
  _generateCameraId() {
    return 'camera-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
  
  /**
   * Register camera with the server
   * @param {string} [roomName] - Room to join (uses default if not provided)
   * @returns {Promise<void>}
   */
  async register(roomName = this.defaultRoom) {
    if (!this.isConnected) {
      await this.connect();
    }
    
    // Get local media stream
    if (!this.localStream) {
      try {
        this.localStream = await getMediaDevices(this.mediaConstraints);
      } catch (error) {
        this.emit('error', new Error(`Failed to access media devices: ${error.message}`));
        throw error;
      }
    }
    
    // Join room as camera
    await this.joinRoom(roomName, {
      deviceType: 'camera',
      cameraId: this.cameraId
    });
    
    this.emit('registered', { room: roomName, cameraId: this.cameraId });
  }
  
  /**
   * Start streaming
   * @returns {Promise<void>}
   */
  async startStreaming() {
    if (!this.localStream) {
      throw new Error('No local stream available. Call register() first.');
    }
    
    this.isStreaming = true;
    this.emit('streamingStarted');
  }
  
  /**
   * Stop streaming
   * @returns {Promise<void>}
   */
  async stopStreaming() {
    this.isStreaming = false;
    
    // Close all peer connections
    this.peerConnections.forEach(pc => {
      try {
        pc.close();
      } catch (e) {
        // Ignore errors when closing
      }
    });
    this.peerConnections.clear();
    
    this.emit('streamingStopped');
  }
  
  /**
   * Handle viewer request for stream
   * @param {Object} message - Viewer request message
   */
  handleViewerRequest(message) {
    this.emit('viewerRequest', message);
    
    // Create peer connection for viewer
    const peerConnection = this._createPeerConnection(message.viewerId);
    this.peerConnections.set(message.viewerId, peerConnection);
    
    // Create and send offer
    this._createOffer(message.viewerId);
  }
  
  /**
   * Create peer connection
   * @private
   * @param {string} viewerId - Viewer client ID
   * @returns {RTCPeerConnection} Peer connection instance
   */
  _createPeerConnection(viewerId) {
    // Check if RTCPeerConnection is available in this environment
    if (typeof RTCPeerConnection === 'undefined') {
      if (isNode) {
        throw new Error('WebRTC not available in Node.js environment. Consider using a WebRTC library like wrtc.');
      } else {
        throw new Error('WebRTC not supported in this browser.');
      }
    }
    
    const configuration = { iceServers: this.iceServers };
    const peerConnection = new RTCPeerConnection(configuration);
    
    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream);
      });
    }
    
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: 'iceCandidate',
            target: viewerId,
            candidate: event.candidate
          }));
        }
      }
    };
    
    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'disconnected' || 
          peerConnection.connectionState === 'failed') {
        this.peerConnections.delete(viewerId);
      }
    };
    
    // Handle ICE connection state changes
    peerConnection.oniceconnectionstatechange = () => {
      if (peerConnection.iceConnectionState === 'disconnected' || 
          peerConnection.iceConnectionState === 'failed') {
        this.peerConnections.delete(viewerId);
      }
    };
    
    return peerConnection;
  }
  
  /**
   * Create offer for viewer
   * @private
   * @param {string} viewerId - Viewer client ID
   */
  async _createOffer(viewerId) {
    try {
      const peerConnection = this.peerConnections.get(viewerId);
      if (!peerConnection) return;
      
      const offer = await peerConnection.createOffer({
        offerToReceiveVideo: false,
        offerToReceiveAudio: false
      });
      
      await peerConnection.setLocalDescription(offer);
      
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'offer',
          target: viewerId,
          sdp: offer
        }));
      }
    } catch (error) {
      this.emit('error', error);
    }
  }
  
  /**
   * Handle answer from viewer
   * @param {Object} message - Answer message
   */
  async handleAnswer(message) {
    try {
      const peerConnection = this.peerConnections.get(message.sender);
      if (!peerConnection) {
        throw new Error(`No peer connection found for viewer ${message.sender}`);
      }
      
      await peerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp));
    } catch (error) {
      this.emit('error', error);
    }
  }
  
  /**
   * Handle ICE candidate from viewer
   * @param {Object} message - ICE candidate message
   */
  async handleIceCandidate(message) {
    try {
      const peerConnection = this.peerConnections.get(message.sender);
      if (!peerConnection) {
        throw new Error(`No peer connection found for viewer ${message.sender}`);
      }
      
      await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
    } catch (error) {
      this.emit('error', error);
    }
  }
  
  /**
   * Override message handler to handle camera-specific messages
   * @private
   * @param {MessageEvent|string} data - Message data
   */
  _handleWebSocketMessage(data) {
    try {
      // Handle both browser MessageEvent and Node.js Buffer/string
      const messageData = typeof data === 'string' ? data : (data.data || data);
      const message = JSON.parse(messageData);
      
      switch (message.type) {
        case 'viewerRequest':
          this.handleViewerRequest(message);
          break;
          
        case 'answer':
          this.handleAnswer(message);
          break;
          
        case 'iceCandidate':
          this.handleIceCandidate(message);
          break;
          
        default:
          // Pass to parent class handler
          super._handleWebSocketMessage(data);
      }
    } catch (error) {
      this.emit('error', error);
    }
  }
  
  /**
   * Close the camera client and clean up resources
   * @returns {Promise<void>}
   */
  async close() {
    await this.stopStreaming();
    await this.disconnect();
    
    // Stop all tracks in the local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    this.emit('closed');
  }
}

/**
 * Viewer Client Class
 * @extends WebRTCCCTVClient
 */
class ViewerClient extends WebRTCCCTVClient {
  /**
   * Create a new viewer client
   */
  constructor(options = {}) {
    super(options);
    
    this.availableCameras = new Map();
    this.activeStreams = new Map();
    this.peerConnections = new Map();
  }
  
  /**
   * Request stream from a camera
   * @param {string} cameraId - Camera identifier
   * @returns {Promise<MediaStream>}
   */
  async requestStream(cameraId) {
    if (!this.isConnected) {
      throw new Error('Not connected to server');
    }
    
    if (!this.currentRoom) {
      throw new Error('Not in a room');
    }
    
    return new Promise((resolve, reject) => {
      // Check if camera is available
      if (!this.availableCameras.has(cameraId)) {
        const onError = (message) => {
          if (message.cameraId === cameraId) {
            this.removeListener('streamReceived', onStreamReceived);
            reject(new Error(`Camera ${cameraId} not found`));
          }
        };
        
        this.once('cameraNotFound', onError);
      }
      
      const onStreamReceived = (stream, camId) => {
        if (camId === cameraId) {
          this.removeListener('cameraNotFound', onError);
          resolve(stream);
        }
      };
      
      const onError = (error) => {
        this.removeListener('streamReceived', onStreamReceived);
        reject(error);
      };
      
      this.once('streamReceived', onStreamReceived);
      this.once('error', onError);
      
      // Send stream request
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'requestStream',
          cameraId: cameraId,
          requestId: Date.now().toString()
        }));
      }
    });
  }
  
  /**
   * Stop viewing a camera
   * @param {string} cameraId - Camera identifier
   * @returns {Promise<void>}
   */
  async stopViewing(cameraId) {
    // Close peer connection
    if (this.peerConnections.has(cameraId)) {
      try {
        this.peerConnections.get(cameraId).close();
      } catch (e) {
        // Ignore errors when closing
      }
      this.peerConnections.delete(cameraId);
    }
    
    // Remove stream
    if (this.activeStreams.has(cameraId)) {
      const stream = this.activeStreams.get(cameraId);
      try {
        stream.getTracks().forEach(track => track.stop());
      } catch (e) {
        // Ignore errors when stopping tracks
      }
      this.activeStreams.delete(cameraId);
    }
    
    this.emit('viewingStopped', cameraId);
  }
  
  /**
   * Handle offer from camera
   * @param {Object} message - Offer message
   */
  async handleOffer(message) {
    try {
      // Find camera ID for this sender
      let cameraId = null;
      for (const [id, clientId] of this.availableCameras.entries()) {
        if (clientId === message.sender) {
          cameraId = id;
          break;
        }
      }
      
      if (!cameraId) {
        throw new Error(`Could not find camera ID for sender ${message.sender}`);
      }
      
      // Create or get peer connection
      let peerConnection;
      if (this.peerConnections.has(cameraId)) {
        peerConnection = this.peerConnections.get(cameraId);
      } else {
        peerConnection = this._createPeerConnection(cameraId);
        this.peerConnections.set(cameraId, peerConnection);
      }
      
      await peerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp));
      
      // Create and send answer
      const answer = await peerConnection.createAnswer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: false
      });
      
      await peerConnection.setLocalDescription(answer);
      
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'answer',
          target: message.sender,
          sdp: answer
        }));
      }
    } catch (error) {
      this.emit('error', error);
    }
  }
  
  /**
   * Handle ICE candidate from camera
   * @param {Object} message - ICE candidate message
   */
  async handleIceCandidate(message) {
    try {
      // Find camera ID for this sender
      let cameraId = null;
      for (const [id, clientId] of this.availableCameras.entries()) {
        if (clientId === message.sender) {
          cameraId = id;
          break;
        }
      }
      
      if (!cameraId) {
        throw new Error(`Could not find camera ID for sender ${message.sender}`);
      }
      
      const peerConnection = this.peerConnections.get(cameraId);
      if (!peerConnection) {
        throw new Error(`No peer connection found for camera ${cameraId}`);
      }
      
      await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
    } catch (error) {
      this.emit('error', error);
    }
  }
  
  /**
   * Create peer connection
   * @private
   * @param {string} cameraId - Camera identifier
   * @returns {RTCPeerConnection} Peer connection instance
   */
  _createPeerConnection(cameraId) {
    // Check if RTCPeerConnection is available in this environment
    if (typeof RTCPeerConnection === 'undefined') {
      if (isNode) {
        throw new Error('WebRTC not available in Node.js environment. Consider using a WebRTC library like wrtc.');
      } else {
        throw new Error('WebRTC not supported in this browser.');
      }
    }
    
    const configuration = { iceServers: this.iceServers };
    const peerConnection = new RTCPeerConnection(configuration);
    
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // Find client ID for this camera
        const targetClientId = this.availableCameras.get(cameraId);
        if (targetClientId && this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: 'iceCandidate',
            target: targetClientId,
            candidate: event.candidate
          }));
        }
      }
    };
    
    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const stream = event.streams[0];
      this.activeStreams.set(cameraId, stream);
      this.emit('streamReceived', stream, cameraId);
    };
    
    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'disconnected' || 
          peerConnection.connectionState === 'failed') {
        this.peerConnections.delete(cameraId);
        if (this.activeStreams.has(cameraId)) {
          this.activeStreams.delete(cameraId);
        }
      }
    };
    
    // Handle ICE connection state changes
    peerConnection.oniceconnectionstatechange = () => {
      if (peerConnection.iceConnectionState === 'disconnected' || 
          peerConnection.iceConnectionState === 'failed') {
        this.peerConnections.delete(cameraId);
        if (this.activeStreams.has(cameraId)) {
          this.activeStreams.delete(cameraId);
        }
      }
    };
    
    return peerConnection;
  }
  
  /**
   * Override message handler to handle viewer-specific messages
   * @private
   * @param {MessageEvent|string} data - Message data
   */
  _handleWebSocketMessage(data) {
    try {
      // Handle both browser MessageEvent and Node.js Buffer/string
      const messageData = typeof data === 'string' ? data : (data.data || data);
      const message = JSON.parse(messageData);
      
      switch (message.type) {
        case 'offer':
          this.handleOffer(message);
          break;
          
        case 'iceCandidate':
          this.handleIceCandidate(message);
          break;
          
        case 'cameraAvailable':
          this.availableCameras.set(message.cameraId, message.clientId);
          this.emit('cameraAvailable', message);
          break;
          
        case 'cameraUnavailable':
          this.availableCameras.delete(message.cameraId);
          this.emit('cameraUnavailable', message);
          break;
          
        default:
          // Pass to parent class handler
          super._handleWebSocketMessage(data);
      }
    } catch (error) {
      this.emit('error', error);
    }
  }
  
  /**
   * Close the viewer client and clean up resources
   * @returns {Promise<void>}
   */
  async close() {
    // Stop all active streams
    for (const [cameraId, stream] of this.activeStreams.entries()) {
      try {
        stream.getTracks().forEach(track => track.stop());
      } catch (e) {
        // Ignore errors when stopping tracks
      }
    }
    
    // Close all peer connections
    for (const [cameraId, pc] of this.peerConnections.entries()) {
      try {
        pc.close();
      } catch (e) {
        // Ignore errors when closing
      }
    }
    
    this.activeStreams.clear();
    this.peerConnections.clear();
    this.availableCameras.clear();
    
    await this.disconnect();
    this.emit('closed');
  }
}

// Export classes for both Node.js and browser environments
if (isNode) {
  module.exports = {
    WebRTCCCTVClient,
    CameraClient,
    ViewerClient,
    isBrowser,
    isNode
  };
} else {
  // In browser, attach to window object
  window.WebRTCCCTVClient = WebRTCCCTVClient;
  window.CameraClient = CameraClient;
  window.ViewerClient = ViewerClient;
  window.WebRTCCCTVAPI = {
    WebRTCCCTVClient,
    CameraClient,
    ViewerClient,
    isBrowser,
    isNode
  };
}
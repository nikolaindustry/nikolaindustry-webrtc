/*
  ESP32-CAM WebRTC Signaling Client
  
  This sketch demonstrates how to connect an ESP32-CAM module to a WebRTC 
  signaling server to enable video streaming to viewers.
  
  Note: This implementation handles signaling only. Actual WebRTC media 
  streaming would require additional libraries and processing.
  
  Hardware:
  - ESP32-CAM module with OV2640 camera
  - FTDI programmer or similar for flashing
  
  Required Libraries:
  - ArduinoWebSockets (or WebSockets)
  - ESP32Camera
  - ArduinoJson (for JSON parsing)
*/

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <WiFiClientSecure.h>
#include <esp_camera.h>
#include <ArduinoJson.h>

// Replace with your network credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Replace with your signaling server details
const char* serverAddress = "192.168.1.100";  // Server IP address
const int serverPort = 8080;                  // Server port

// Camera ID - should be unique for each camera
const String cameraId = "ESP32-CAM-001";

// WebSocket client
WebSocketsClient webSocket;

// Camera configuration
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// Client state
String clientId = "";
String currentRoom = "cctv";
bool isConnected = false;
bool isStreaming = false;
unsigned long lastFrameTime = 0;
const long frameInterval = 100; // 10 FPS

// Viewer connections
struct Viewer {
  String id;
  bool connected;
};

Viewer viewers[5]; // Support up to 5 concurrent viewers
int viewerCount = 0;

void setup() {
  Serial.begin(115200);
  Serial.println("\nESP32-CAM WebRTC Signaling Client");
  
  // Initialize camera
  if (!initCamera()) {
    Serial.println("Failed to initialize camera");
    while (1) delay(1000); // Halt execution
  }
  
  // Initialize viewers array
  for (int i = 0; i < 5; i++) {
    viewers[i].id = "";
    viewers[i].connected = false;
  }
  
  // Connect to WiFi
  connectToWiFi();
  
  // Configure WebSocket
  webSocket.begin(serverAddress, serverPort, "/");
  webSocket.onEvent(webSocketEvent);
  
  Serial.println("ESP32-CAM WebRTC Client Started");
  Serial.print("Camera ID: ");
  Serial.println(cameraId);
  Serial.print("Server: ");
  Serial.print(serverAddress);
  Serial.print(":");
  Serial.println(serverPort);
}

void loop() {
  // Handle WebSocket events
  webSocket.loop();
  
  // Capture and send frames if streaming
  if (isStreaming && isConnected) {
    unsigned long currentTime = millis();
    if (currentTime - lastFrameTime > frameInterval) {
      captureAndSendFrame();
      lastFrameTime = currentTime;
    }
  }
  
  // Periodic status report
  static unsigned long lastStatus = 0;
  if (millis() - lastStatus > 10000) { // Every 10 seconds
    reportStatus();
    lastStatus = millis();
  }
}

// Initialize camera
bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  
  // Frame size (adjust based on your needs)
  config.frame_size = FRAMESIZE_VGA;  // 640x480
  config.jpeg_quality = 12;           // 0-63 lower means higher quality
  config.fb_count = 1;
  
  // Initialize camera
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    return false;
  }
  
  Serial.println("Camera initialized successfully");
  return true;
}

// Connect to WiFi
void connectToWiFi() {
  Serial.print("Connecting to WiFi");
  
  WiFi.begin(ssid, password);
  
  unsigned long startAttemptTime = millis();
  
  // Keep looping while we're not connected and haven't timed out
  while (WiFi.status() != WL_CONNECTED && 
         millis() - startAttemptTime < 10000) {
    delay(500);
    Serial.print(".");
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("Connected to WiFi network with IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("Failed to connect to WiFi");
  }
}

// WebSocket event handler
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_CONNECTED:
      Serial.println("Connected to WebSocket server");
      isConnected = true;
      sendJoinMessage();
      break;
      
    case WStype_DISCONNECTED:
      Serial.println("Disconnected from WebSocket server");
      isConnected = false;
      isStreaming = false;
      // Clear viewers
      for (int i = 0; i < 5; i++) {
        viewers[i].id = "";
        viewers[i].connected = false;
      }
      viewerCount = 0;
      break;
      
    case WStype_TEXT:
      handleSignalingMessage((char*)payload);
      break;
      
    default:
      break;
  }
}

// Send join message to server
void sendJoinMessage() {
  // Create JSON message
  DynamicJsonDocument doc(256);
  doc["type"] = "join";
  doc["room"] = currentRoom;
  doc["deviceType"] = "camera";
  doc["cameraId"] = cameraId;
  
  String output;
  serializeJson(doc, output);
  
  webSocket.sendTXT(output);
  Serial.println("Join message sent: " + output);
}

// Handle signaling messages from server
void handleSignalingMessage(char* message) {
  Serial.print("Received message: ");
  Serial.println(message);
  
  // Parse JSON message
  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, message);
  
  if (error) {
    Serial.print("JSON parsing failed: ");
    Serial.println(error.c_str());
    return;
  }
  
  String type = doc["type"];
  
  if (type == "welcome") {
    clientId = doc["clientId"].as<String>();
    Serial.print("Assigned client ID: ");
    Serial.println(clientId);
  }
  else if (type == "joined") {
    currentRoom = doc["room"].as<String>();
    Serial.println("Successfully joined room: " + currentRoom);
  }
  else if (type == "viewerRequest") {
    String viewerId = doc["viewerId"].as<String>();
    Serial.print("Viewer ");
    Serial.print(viewerId);
    Serial.println(" requested stream");
    
    // Add viewer to list
    addViewer(viewerId);
    
    // Start streaming
    isStreaming = true;
    Serial.println("Streaming started");
  }
  else if (type == "offer") {
    String sender = doc["sender"].as<String>();
    Serial.print("Received offer from ");
    Serial.println(sender);
    
    // In a full WebRTC implementation, you would:
    // 1. Parse the SDP offer
    // 2. Create an answer
    // 3. Send the answer back
    // For this example, we'll just acknowledge
    sendAnswer(sender);
  }
  else if (type == "iceCandidate") {
    String sender = doc["sender"].as<String>();
    Serial.print("Received ICE candidate from ");
    Serial.println(sender);
    
    // In a full WebRTC implementation, you would:
    // 1. Parse the ICE candidate
    // 2. Add it to the peer connection
  }
  else if (type == "cameraNotFound") {
    Serial.println("Camera not found by viewer");
  }
}

// Send answer to an offer
void sendAnswer(String target) {
  // Create JSON answer message
  DynamicJsonDocument doc(256);
  doc["type"] = "answer";
  doc["target"] = target;
  
  // In a real implementation, you would include SDP answer here
  // doc["sdp"] = sdpAnswer;
  
  String output;
  serializeJson(doc, output);
  
  webSocket.sendTXT(output);
  Serial.println("Answer sent to " + target);
}

// Add viewer to list
void addViewer(String viewerId) {
  // Check if viewer already exists
  for (int i = 0; i < viewerCount; i++) {
    if (viewers[i].id == viewerId) {
      return; // Already exists
    }
  }
  
  // Add new viewer if space available
  if (viewerCount < 5) {
    viewers[viewerCount].id = viewerId;
    viewers[viewerCount].connected = true;
    viewerCount++;
    Serial.print("Added viewer: ");
    Serial.println(viewerId);
  }
}

// Remove viewer from list
void removeViewer(String viewerId) {
  for (int i = 0; i < viewerCount; i++) {
    if (viewers[i].id == viewerId) {
      // Shift remaining viewers down
      for (int j = i; j < viewerCount - 1; j++) {
        viewers[j] = viewers[j + 1];
      }
      viewerCount--;
      Serial.print("Removed viewer: ");
      Serial.println(viewerId);
      break;
    }
  }
  
  // Stop streaming if no viewers
  if (viewerCount == 0) {
    isStreaming = false;
    Serial.println("No viewers left, streaming stopped");
  }
}

// Capture and send camera frame
void captureAndSendFrame() {
  camera_fb_t * fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed");
    return;
  }
  
  // Send frame information via WebSocket
  if (fb->len > 0) {
    // Create JSON message with frame info
    DynamicJsonDocument doc(256);
    doc["type"] = "frameInfo";
    doc["cameraId"] = cameraId;
    doc["size"] = fb->len;
    doc["width"] = fb->width;
    doc["height"] = fb->height;
    
    String output;
    serializeJson(doc, output);
    
    webSocket.sendTXT(output);
    
    // In a real WebRTC implementation, you would:
    // 1. Send the actual frame data via WebRTC data channel or RTP
    // 2. Handle proper streaming protocols
    // 3. Implement congestion control
    
    Serial.print("Captured frame: ");
    Serial.print(fb->len);
    Serial.println(" bytes");
  }
  
  esp_camera_fb_return(fb);
}

// Report status to server
void reportStatus() {
  if (!isConnected) return;
  
  // Create JSON status message
  DynamicJsonDocument doc(256);
  doc["type"] = "cameraStatus";
  doc["cameraId"] = cameraId;
  doc["streaming"] = isStreaming;
  doc["viewers"] = viewerCount;
  doc["timestamp"] = millis();
  
  String output;
  serializeJson(doc, output);
  
  webSocket.sendTXT(output);
  Serial.println("Status report sent");
}

// Start streaming
void startStreaming() {
  isStreaming = true;
  Serial.println("Started streaming");
}

// Stop streaming
void stopStreaming() {
  isStreaming = false;
  Serial.println("Stopped streaming");
}
const WebSocket = require('ws');

// Test the signaling server
async function testSignalingServer() {
  console.log('Testing WebRTC Signaling Server...');
  
  // Connect two clients
  const client1 = new WebSocket('ws://localhost:8080');
  const client2 = new WebSocket('ws://localhost:8080');
  
  let client1Id, client2Id;
  
  // Handle client1 messages
  client1.on('open', () => {
    console.log('Client 1 connected');
  });
  
  client1.on('message', (data) => {
    const message = JSON.parse(data);
    console.log('Client 1 received:', message.type);
    
    if (message.type === 'welcome') {
      client1Id = message.clientId;
      console.log('Client 1 ID:', client1Id);
      
      // Join a room
      client1.send(JSON.stringify({
        type: 'join',
        room: 'test-room'
      }));
    } else if (message.type === 'clientJoined') {
      console.log('Client 1 detected Client 2 joined');
      
      // Send an offer to client 2
      setTimeout(() => {
        client1.send(JSON.stringify({
          type: 'offer',
          target: client2Id,
          sdp: {
            type: 'offer',
            sdp: 'test-offer-sdp'
          }
        }));
      }, 100);
    } else if (message.type === 'answer') {
      console.log('Client 1 received answer from Client 2');
      console.log('Signaling test completed successfully!');
      
      // Close connections after a delay to see the result
      setTimeout(() => {
        client1.close();
        client2.close();
        process.exit(0);
      }, 500);
    }
  });
  
  // Handle client2 messages
  client2.on('open', () => {
    console.log('Client 2 connected');
  });
  
  client2.on('message', (data) => {
    const message = JSON.parse(data);
    console.log('Client 2 received:', message.type);
    
    if (message.type === 'welcome') {
      client2Id = message.clientId;
      console.log('Client 2 ID:', client2Id);
      
      // Join the same room
      client2.send(JSON.stringify({
        type: 'join',
        room: 'test-room'
      }));
    } else if (message.type === 'offer') {
      console.log('Client 2 received offer from Client 1');
      
      // Send an answer back
      client2.send(JSON.stringify({
        type: 'answer',
        target: client1Id,
        sdp: {
          type: 'answer',
          sdp: 'test-answer-sdp'
        }
      }));
    }
  });
}

// Run the test
testSignalingServer();
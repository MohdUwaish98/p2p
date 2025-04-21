// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, remove } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// Firebase config - Replace with your own config from Firebase console
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// DOM Elements
const createRoomBtn = document.getElementById('createRoomBtn');
const roomIdDisplay = document.getElementById('roomIdDisplay');
const roomIdSpan = document.getElementById('roomId');
const copyRoomIdBtn = document.getElementById('copyRoomId');
const joinRoomInput = document.getElementById('joinRoomInput');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const connectionStatus = document.getElementById('connectionStatus');
const fileTransfer = document.getElementById('fileTransfer');
const fileInput = document.getElementById('fileInput');
const sendFileBtn = document.getElementById('sendFileBtn');
const senderProgress = document.getElementById('senderProgress');
const senderProgressText = document.getElementById('senderProgressText');
const receiverProgress = document.getElementById('receiverProgress');
const receiverProgressText = document.getElementById('receiverProgressText');
const downloadLink = document.getElementById('downloadLink');

// WebRTC variables
let pc; // RTCPeerConnection
let dc; // DataChannel
let roomId;
let myId;
let signalsRef;
let isCaller = false;

// File transfer variables
let file;
let chunkSize = 16 * 1024; // 16KB chunks
let receivedSize = 0;
let expectedSize = 0;
let chunks = [];

// Generate a random 6-character room ID
function generateRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Initialize WebRTC connection
function initWebRTC() {
  pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  // Send ICE candidates to Firebase
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      sendSignal("ice", event.candidate);
    }
  };

  // Handle ICE connection state changes
  pc.oniceconnectionstatechange = () => {
    connectionStatus.textContent = `ICE Connection: ${pc.iceConnectionState}`;
    
    if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
      fileTransfer.classList.remove('hidden');
      connectionStatus.textContent = 'Connected';
      connectionStatus.style.backgroundColor = '#d4edda';
      connectionStatus.style.color = '#155724';
    } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
      fileTransfer.classList.add('hidden');
      connectionStatus.textContent = 'Disconnected';
      connectionStatus.style.backgroundColor = '#f8d7da';
      connectionStatus.style.color = '#721c24';
    }
  };

  if (isCaller) {
    // Create data channel if caller
    dc = pc.createDataChannel('file-transfer');
    setupDataChannel(dc);
    
    // Create offer
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .then(() => {
        sendSignal("offer", pc.localDescription);
      })
      .catch(error => console.error('Error creating offer:', error));
  } else {
    // Handle incoming data channel if callee
    pc.ondatachannel = (event) => {
      dc = event.channel;
      setupDataChannel(dc);
    };
  }
}

// Set up data channel event handlers
function setupDataChannel(dataChannel) {
  dataChannel.binaryType = 'arraybuffer';
  
  dataChannel.onopen = () => {
    console.log('Data channel is open');
    sendFileBtn.disabled = false;
  };
  
  dataChannel.onclose = () => {
    console.log('Data channel is closed');
    sendFileBtn.disabled = true;
  };
  
  dataChannel.onmessage = (event) => {
    receiveData(event.data);
  };
}

// Send signal to Firebase
function sendSignal(type, payload) {
  push(signalsRef, {
    from: myId,
    type,
    payload,
    timestamp: Date.now()
  });
}

// Handle incoming signals from Firebase
function setupSignalListener() {
  onChildAdded(signalsRef, (snapshot) => {
    const signal = snapshot.val();
    
    // Ignore messages from myself
    if (signal.from === myId) return;
    
    console.log('Received signal:', signal.type);
    
    switch (signal.type) {
      case 'offer':
        pc.setRemoteDescription(new RTCSessionDescription(signal.payload))
          .then(() => pc.createAnswer())
          .then(answer => pc.setLocalDescription(answer))
          .then(() => {
            sendSignal('answer', pc.localDescription);
          })
          .catch(error => console.error('Error handling offer:', error));
        break;
        
      case 'answer':
        pc.setRemoteDescription(new RTCSessionDescription(signal.payload))
          .catch(error => console.error('Error handling answer:', error));
        break;
        
      case 'ice':
        if (pc.remoteDescription) {
          pc.addIceCandidate(new RTCIceCandidate(signal.payload))
            .catch(error => console.error('Error adding ICE candidate:', error));
        }
        break;
    }
    
    // Remove processed signal
    remove(snapshot.ref);
  });
}

// Create a new room
createRoomBtn.addEventListener('click', () => {
  roomId = generateRoomId();
  roomIdSpan.textContent = roomId;
  roomIdDisplay.classList.remove('hidden');
  
  signalsRef = ref(db, `rooms/${roomId}/signals`);
  myId = 'peerA';
  isCaller = true;
  
  initWebRTC();
  setupSignalListener();
  
  connectionStatus.textContent = 'Waiting for peer...';
  connectionStatus.style.backgroundColor = '#fff3cd';
  connectionStatus.style.color = '#856404';
});

// Join an existing room
joinRoomBtn.addEventListener('click', () => {
  roomId = joinRoomInput.value.trim().toUpperCase();
  
  if (roomId.length !== 6) {
    alert('Please enter a valid 6-character room ID.');
    return;
  }
  
  signalsRef = ref(db, `rooms/${roomId}/signals`);
  myId = 'peerB';
  isCaller = false;
  
  initWebRTC();
  setupSignalListener();
  
  connectionStatus.textContent = 'Connecting...';
  connectionStatus.style.backgroundColor = '#fff3cd';
  connectionStatus.style.color = '#856404';
});

// Copy room ID to clipboard
copyRoomIdBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(roomId)
    .then(() => {
      copyRoomIdBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyRoomIdBtn.textContent = 'Copy';
      }, 2000);
    })
    .catch(err => console.error('Could not copy text: ', err));
});

// Send file button click handler
sendFileBtn.addEventListener('click', () => {
  if (!fileInput.files.length) {
    alert('Please select a file to send.');
    return;
  }
  
  file = fileInput.files[0];
  sendFile(file);
});

// File input change handler
fileInput.addEventListener('change', () => {
  if (fileInput.files.length) {
    const selectedFile = fileInput.files[0];
    console.log('Selected file:', selectedFile.name, 'Size:', selectedFile.size, 'bytes');
  }
});

// Send file in chunks
async function sendFile(file) {
  // First send file metadata
  dc.send(JSON.stringify({
    type: 'metadata',
    name: file.name,
    size: file.size,
    contentType: file.type
  }));

  const size = file.size;
  let offset = 0;
  
  // Reset progress
  senderProgress.style.width = '0%';
  senderProgressText.textContent = '0%';
  
  // Read and send file in chunks
  while (offset < size) {
    const slice = file.slice(offset, offset + chunkSize);
    const buffer = await slice.arrayBuffer();
    
    // Send the chunk
    dc.send(buffer);
    
    // Wait if buffer is getting full
    if (dc.bufferedAmount > dc.bufferedAmountLowThreshold) {
      await waitForDrain(dc);
    }
    
    // Update progress
    offset += buffer.byteLength;
    const percentComplete = Math.round((offset / size) * 100);
    senderProgress.style.width = `${percentComplete}%`;
    senderProgressText.textContent = `${percentComplete}%`;
  }
  
  // Send completion message
  dc.send(JSON.stringify({ type: 'complete' }));
  console.log('File sent successfully');
}

// Wait for buffer to drain
function waitForDrain(dataChannel) {
  return new Promise((resolve) => {
    const checkBuffer = () => {
      if (dataChannel.bufferedAmount <= dataChannel.bufferedAmountLowThreshold) {
        resolve();
      } else {
        setTimeout(checkBuffer, 100);
      }
    };
    checkBuffer();
  });
}

// Receive data (file chunks or metadata)
function receiveData(data) {
  // Check if the data is a string (metadata or complete message)
  if (typeof data === 'string') {
    const message = JSON.parse(data);
    
    if (message.type === 'metadata') {
      // Reset arrays and counters for new file
      chunks = [];
      receivedSize = 0;
      expectedSize = message.size;
      
      // Store file info
      downloadLink.download = message.name;
      downloadLink.type = message.contentType;
      
      console.log('Receiving file:', message.name, 'Size:', message.size, 'bytes');
      
      // Reset progress
      receiverProgress.style.width = '0%';
      receiverProgressText.textContent = '0%';
    } else if (message.type === 'complete') {
      finishDownload();
    }
  } else {
    // This is a chunk of the file
    chunks.push(data);
    receivedSize += data.byteLength;
    
    // Update progress
    const percentComplete = Math.round((receivedSize / expectedSize) * 100);
    receiverProgress.style.width = `${percentComplete}%`;
    receiverProgressText.textContent = `${percentComplete}%`;
  }
}

// Finish the download process
function finishDownload() {
  // Combine chunks into a single blob
  const blob = new Blob(chunks, { type: downloadLink.type });
  downloadLink.href = URL.createObjectURL(blob);
  
  // Trigger download
  receiverProgressText.textContent = '100% - Click to download';
  receiverProgressText.style.cursor = 'pointer';
  receiverProgressText.addEventListener('click', () => {
    downloadLink.click();
  });
  
  console.log('File received successfully');
} 
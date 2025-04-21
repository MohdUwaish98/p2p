# P2P File Transfer

A simple peer-to-peer file transfer application using WebRTC DataChannel with Firebase for signaling.

## Features

- Create or join a room to establish a P2P connection
- Send files directly between peers without server storage
- Real-time progress indicators for both sender and receiver
- Works on modern browsers that support WebRTC

## How It Works

1. The application uses WebRTC for direct peer-to-peer communication
2. Firebase Realtime Database is used only for signaling (establishing the connection)
3. Once the connection is established, files are transferred directly between peers
4. No files are stored on any server during the transfer

## Setup

1. Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Enable the Realtime Database in your project
3. Copy your Firebase configuration from the Firebase console
4. Replace the placeholder config in `public/main.js` with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## Deployment

You can deploy this application using Firebase Hosting:

1. Install Firebase CLI:
   ```
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```
   firebase login
   ```

3. Initialize Firebase in your project:
   ```
   firebase init
   ```
   - Select "Hosting" and "Realtime Database"
   - Choose your project
   - Use "public" as your public directory
   - Configure as a single-page app: "Yes"
   - Set up automatic builds and deploys: "No"

4. Deploy the application:
   ```
   firebase deploy
   ```

## Local Development

You can also run this application locally:

1. Install Firebase tools:
   ```
   npm install -g firebase-tools
   ```

2. Start the local server:
   ```
   firebase serve
   ```

3. Open your browser and navigate to `http://localhost:5000`

## How to Use

### To Send a Fil

1. Click "Create Room" to generate a room ID
2. Share the room ID with the recipient
3. Wait for the recipient to join (connection status will change to "Connected")
4. Select a file using the file picker
5. Click "Send" to start the transfer
6. Monitor the sending progress

### To Receive a File:

1. Enter the room ID shared by the sender
2. Click "Join Room" to connect
3. Wait for the connection to establish
4. When the sender initiates a file transfer, you'll see the receiving progress
5. Once the transfer is complete, the file will automatically download

## Browser Compatibility

This application works on all modern browsers that support WebRTC, including:
- Chrome 
- Firefox
- Edge
- Safari 11+
- Opera

## License

MIT 
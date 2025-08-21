// src/App.tsx
import './App.css';
// Import the AppKit button component correctly from '@reown/appkit/react'
import { AppKitButton } from '@reown/appkit/react';

function App() {
  return (
    <div className="app-container">
      <h1>ABOVE Wallet Connection Test</h1>
      <p>Click the button below to connect your wallet.</p>
      {/* Render the AppKit button */}
      {/* This component should trigger the modal */}
      <AppKitButton />
    </div>
  );
}

export default App;
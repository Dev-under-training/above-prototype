// src/App.tsx
import './App.css';
import { AppKitButton } from '@reown/appkit/react';
import WalletStatus from './components/WalletStatus'; // Import the new component
import VoterStatus from './components/VoterStatus'; // Import the new component

function App() {
  return (
    <div className="app-container">
      <h1 className="main-header">ABOVE</h1>
      <p className="sub-header">Auditable Ballots On a Verifiable Ecosystem</p>

      {/* Wallet Connection Button */}
      <div className="wallet-connect-button">
        <AppKitButton />
      </div>

      {/* Wallet Status Component */}
      <WalletStatus />

      {/* Voter Status Component */}
      <VoterStatus />

      {/* Placeholder for Campaign Display and Voting Interface */}
      <div className="campaign-section">
        <h2>Voting Campaigns</h2>
        <p>Campaign details and voting interface will appear here.</p>
      </div>
    </div>
  );
}

export default App;
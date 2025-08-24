// src/App.tsx
import './App.css';
import { AppKitButton } from '@reown/appkit/react';
import WalletStatus from './components/WalletStatus'; // Import the new component
import VoterStatus from './components/VoterStatus'; // Import the new component
import CampaignDisplay from './components/CampaignDisplay'; // Import the new component

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

      {/* Campaign Display Component */}
      <CampaignDisplay />

      {/* Placeholder for Voting Interface */}
      <div className="voting-interface-section">
        <h2>Voting Interface</h2>
        <p>Voting interface will appear here based on the active campaign type.</p>
      </div>
    </div>
  );
}

export default App;
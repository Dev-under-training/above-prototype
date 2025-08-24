// src/App.tsx
import './App.css';
import { AppKitButton } from '@reown/appkit/react';
import WalletStatus from './components/WalletStatus';
import VoterStatus from './components/VoterStatus';
import CampaignDisplay from './components/CampaignDisplay';
// --- Import the new VotingInterface component ---
import VotingInterface from './components/VotingInterface';
// --- End Import ---

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

      {/* --- Voting Interface Component --- */}
      <VotingInterface />
      {/* --- End Voting Interface Component --- */}

    </div>
  );
}

export default App;
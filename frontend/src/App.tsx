// frontend/src/App.tsx
import './App.css';
import React from 'react';
import { AppKitButton } from '@reown/appkit/react';
import WalletStatus from './components/WalletStatus';
import VoterStatus from './components/VoterStatus'; // Keep for voter management
import CampaignDisplay from './components/CampaignDisplay';
import VotingInterface from './components/VotingInterface';

// --- Temporary: Hardcoded campaign ID for testing ---
// Replace '1n' with the actual ID of a campaign you've created and activated
const TEST_CAMPAIGN_ID: bigint | null = 2n;
// --- End Temporary ---

function App() {
  return (
    <div className="app-container">
      <h1 className="main-header">ABOVE</h1>
      <p className="sub-header">Auditable Ballots On a Verifiable Ecosystem (Multi-Campaign)</p>

      {/* Wallet Connection Button */}
      <div className="wallet-connect-button">
        <AppKitButton />
      </div>

      {/* Wallet Status Component */}
      <WalletStatus />

      {/* Voter Status Component (for adding voters and managing campaigns) */}
      {/* Pass the test campaign ID so VoterStatus can manage it */}
      <VoterStatus campaignId={TEST_CAMPAIGN_ID} /> {/* <-- Updated this line */}

      {/* Campaign Display Component */}
      {/* Pass the test campaign ID */}
      <CampaignDisplay campaignId={TEST_CAMPAIGN_ID} />

      {/* Voting Interface Component */}
      {/* Pass the test campaign ID */}
      <VotingInterface campaignId={TEST_CAMPAIGN_ID} />

    </div>
  );
}

export default App;

// frontend/src/App.tsx
import './App.css';
import React, { useState, useEffect } from 'react';
// Import the AppKit button component
import { AppKitButton } from '@reown/appkit/react';
// Import the wallet status component
import WalletStatus from './components/WalletStatus';
// Import the voter status component
import VoterStatus from './components/VoterStatus';
// Import the campaign display component
import CampaignDisplay from './components/CampaignDisplay';
// Import the voting interface component
import VotingInterface from './components/VotingInterface';
// Import the hook to get nextCampaignId
import { useABOVEBallot } from './hooks/useABOVEBallot';
// --- NEW: Import the logo image ---
import aboveLogo from './assets/above-logo.png'; // Adjust the path if your assets folder is located differently relative to App.tsx
// --- END NEW ---

function App() {
  // State to hold the currently selected campaign ID
  const [selectedCampaignId, setSelectedCampaignId] = useState<bigint | null>(null);

  // Use the hook without a specific campaign ID to fetch global data like nextCampaignId
  const { nextCampaignId, isFetchingNextCampaignId, isNextCampaignIdError, nextCampaignIdError } = useABOVEBallot(null);

  // --- Logic to generate campaign ID options ---
  const [campaignIdOptions, setCampaignIdOptions] = useState<bigint[]>([]);

  useEffect(() => {
    if (nextCampaignId && !isFetchingNextCampaignId) {
      const options: bigint[] = [];
      // Campaign IDs start from 1 and go up to nextCampaignId - 1
      const maxId = nextCampaignId - 1n;
      for (let i = 1n; i <= maxId; i++) {
        options.push(i);
      }
      setCampaignIdOptions(options);
    } else {
      setCampaignIdOptions([]); // Reset if data is loading or unavailable
    }
  }, [nextCampaignId, isFetchingNextCampaignId]);
  // --- End Logic to generate campaign ID options ---

  // Handler for when the user selects a new ID
  const handleCampaignIdChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (value === "") {
      setSelectedCampaignId(null);
    } else {
      try {
        setSelectedCampaignId(BigInt(value)); // Convert string back to bigint
      } catch (e) {
        console.error("Invalid campaign ID selected:", value);
        setSelectedCampaignId(null);
      }
    }
  };

  return (
    <div className="app-container">
      {/* --- NEW: Replace text header with logo image --- */}
      <div className="app-logo-container">
        <img src={aboveLogo} alt="ABOVE Logo" className="app-logo" />
      </div>
      {/* --- END NEW: Replace text header with logo image --- */}

      {/* --- UPDATED: Sub-header text --- */}
      <p className="sub-header">Auditable Ballots On a Verifiable Ecosystem</p>
      {/* --- END UPDATED: Sub-header text --- */}

      {/* Wallet Connection Button */}
      <div className="wallet-connect-button">
        <AppKitButton />
      </div>

      {/* Wallet Status Component */}
      <WalletStatus />

      {/* --- Dynamic Campaign Selection UI --- */}
      <div className="campaign-selector">
        <label htmlFor="campaignSelector">Select Campaign: </label>
        {isNextCampaignIdError ? (
          <span style={{ color: 'red' }}>Error loading campaigns: {nextCampaignIdError?.message}</span>
        ) : isFetchingNextCampaignId ? (
          <span>Loading campaigns...</span>
        ) : (
          <>
            <select id="campaignSelector" onChange={handleCampaignIdChange} value={selectedCampaignId?.toString() ?? ""}>
              <option value="">-- Select a Campaign --</option>
              {campaignIdOptions.map((id) => (
                <option key={id.toString()} value={id.toString()}>
                  Campaign ID: {id.toString()}
                </option>
              ))}
            </select>
            {selectedCampaignId !== null && (
              <p>Selected Campaign ID: <strong>{selectedCampaignId.toString()}</strong></p>
            )}
          </>
        )}
      </div>
      {/* --- End Dynamic Campaign Selection UI --- */}

      {/* Voter Status Component (now receives the selected ID) */}
      <VoterStatus campaignId={selectedCampaignId} />

      {/* Campaign Display Component (now receives the selected ID) */}
      <CampaignDisplay campaignId={selectedCampaignId} />

      {/* Voting Interface Component (now receives the selected ID) */}
      <VotingInterface campaignId={selectedCampaignId} />

    </div>
  );
}

export default App;

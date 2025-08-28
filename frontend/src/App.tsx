// frontend/src/App.tsx
import './App.css';
import React, { useState, useEffect } from 'react'; // Import useState and useEffect
import { AppKitButton } from '@reown/appkit/react';
import WalletStatus from './components/WalletStatus';
import VoterStatus from './components/VoterStatus';
import CampaignDisplay from './components/CampaignDisplay';
import VotingInterface from './components/VotingInterface';
import { useABOVEBallot } from './hooks/useABOVEBallot'; // Import the hook to get nextCampaignId

function App() {
  // State to hold the currently selected campaign ID
  const [selectedCampaignId, setSelectedCampaignId] = useState<bigint | null>(null);

  // Use the hook without a specific campaign ID to fetch global data like nextCampaignId
  // Pass null or omit the argument if your hook expects it
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
      <h1 className="main-header">ABOVE</h1>
      <p className="sub-header">Auditable Ballots On a Verifiable Ecosystem (Multi-Campaign)</p>

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

// frontend/src/App.tsx
import './App.css';
import React, { useState, useEffect } from 'react';
// Import AppKitButton and useAppKitAccount for connection status
import { AppKitButton, useAppKitAccount } from '@reown/appkit/react';
// Import WalletStatus component
import WalletStatus from './components/WalletStatus';
// Import VoterStatus component
import VoterStatus from './components/VoterStatus';
// Import CampaignDisplay component
import CampaignDisplay from './components/CampaignDisplay';
// Import VotingInterface component
import VotingInterface from './components/VotingInterface';
// Import the hook to get nextCampaignId
import { useABOVEBallot } from './hooks/useABOVEBallot';
// Import the logo image
import aboveLogo from './assets/above-logo.png';

function App() {
  // Use AppKit's hook for account information
  const { address: userAddress, isConnected } = useAppKitAccount();

  // State to hold the currently selected campaign ID
  const [selectedCampaignId, setSelectedCampaignId] = useState<bigint | null>(null);

  // Use the hook without a specific campaign ID to fetch global data
  const {
    nextCampaignId,
    isFetchingNextCampaignId,
    isNextCampaignIdError,
    nextCampaignIdError,
    // --- Fetch Owner for potential future global admin (optional) ---
    contractOwner,
    isFetchingOwner,
    isOwnerError,
    ownerError
    // --- END Owner Fetch ---
  } = useABOVEBallot(null); // Pass null for global data

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
      {/* --- Header --- */}
      <header className="main-header">
        <div className="app-logo-container">
          <img src={aboveLogo} alt="ABOVE Logo" className="app-logo" />
        </div>
        <p className="sub-header">Auditable Ballots On a Verifiable Ecosystem</p>
      </header>
      {/* --- END Header --- */

      /* --- Wallet Connection --- */}
      <div className="wallet-connect-section">
        <AppKitButton />
      </div>
      {/* --- END Wallet Connection --- */}

      {/* Wallet Status Component - Always Visible if connected */}
      {isConnected && <WalletStatus />}

      {/* --- Campaign Selector - Visible to everyone connected --- */}
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
      {/* --- END Campaign Selector --- */}

      {/* --- Updated UI Logic: Visible to All Connected Users --- */}
      {isConnected && (
        <>
          {/* Voter Status Component (Campaign Creation & Setup for Any User) */}
          {/* The component internally handles showing relevant UI based on selected campaign creator */}
          <VoterStatus campaignId={selectedCampaignId} />

          {/* Campaign Display Component - Always visible for information to connected users */}
          <CampaignDisplay campaignId={selectedCampaignId} />
        </>
      )}

      {/* --- Voting Interface - Visible to Connected Users for Selected Campaign --- */}
      {/* Show VotingInterface if connected and a campaign is selected */}
      {/* VotingInterface.tsx should handle its own checks for eligibility and campaign state */}
      {isConnected && selectedCampaignId && (
        <VotingInterface campaignId={selectedCampaignId} />
      )}
      {/* --- END Voting Interface --- */}

    </div>
  );
}

export default App;

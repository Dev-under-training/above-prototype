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
// Import the hook to get nextCampaignId and owner
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
    // --- NEW: Fetch Owner ---
    contractOwner,
    isFetchingOwner,
    isOwnerError,
    ownerError
    // --- END NEW ---
  } = useABOVEBallot(null); // Pass null for global data

  // --- NEW: Determine User Role ---
  const [isOwner, setIsOwner] = useState(false);
  // Note: Voter registration status is typically checked per campaign or via VoterRegistry hook
  // For now, we assume components handle their own eligibility checks
  // const [isRegisteredVoter, setIsRegisteredVoter] = useState(false);

  useEffect(() => {
    if (userAddress && contractOwner && !isFetchingOwner) {
      // Check if connected user is the owner (case-insensitive comparison)
      setIsOwner(userAddress.toLowerCase() === contractOwner.toLowerCase());
    } else {
      setIsOwner(false);
    }
  }, [userAddress, contractOwner, isFetchingOwner]);

  // Optional: Log errors for debugging
  useEffect(() => {
    if (isOwnerError) {
      console.error("Error fetching contract owner:", ownerError);
    }
  }, [isOwnerError, ownerError]);
  // --- END NEW ---

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
      {/* --- END Header --- */}

      {/* --- Wallet Connection --- */}
      <div className="wallet-connect-section">
        <AppKitButton />
      </div>
      {/* --- END Wallet Connection --- */}

      {/* Wallet Status Component - Always Visible if connected */}
      {isConnected && <WalletStatus />}

      {/* --- Conditional Rendering based on Role --- */}

      {/* --- Visible to Everyone (if connected) --- */}
      {/* Campaign Selector - Visible to everyone connected */}
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

      {/* --- Visible Only to Owner --- */}
      {isConnected && isOwner && (
        <>
          {/* Voter Status Component (Owner Controls) */}
          <VoterStatus campaignId={selectedCampaignId} />

          {/* Campaign Display Component - Always visible to owner for management */}
          <CampaignDisplay campaignId={selectedCampaignId} />
        </>
      )}

      {/* --- Visible to Voters (and potentially Owner, unless explicitly hidden) --- */}
      {/* Show VotingInterface if connected, not the owner, and a campaign is selected */}
      {/* VotingInterface.tsx should handle its own checks for eligibility and campaign state */}
      {isConnected && !isOwner && selectedCampaignId && (
        <VotingInterface campaignId={selectedCampaignId} />
      )}

      {/* Optional: Show CampaignDisplay to voters as well (read-only view) */}
      {/* Uncomment the lines below if you want voters to see the campaign details/results */}
            {isConnected && !isOwner && selectedCampaignId && (
        <CampaignDisplay campaignId={selectedCampaignId} />
      )}

      {/* --- END Conditional Rendering --- */}

    </div>
  );
}

export default App;

// frontend/src/components/VoterStatus.tsx
import React from 'react';
// Import Wagmi hooks
import { useAccount, useReadContract } from 'wagmi';
// Import contract configuration
import { CONTRACT_ADDRESSES, VOTER_REGISTRY_ABI } from '../contracts/contractConfig';

const VoterStatus: React.FC = () => {
  // Get the connected wallet account information
  const { address, isConnected, isConnecting } = useAccount();

  // Use the useReadContract hook to call the 'isAllowed' function on VoterRegistry
  // This hook automatically refetches data when the address or contract changes
  const { data: isAllowed, isError, isLoading } = useReadContract({ // Renamed data to isAllowed for clarity
    address: CONTRACT_ADDRESSES.voterRegistry, // Use the address from config
    abi: VOTER_REGISTRY_ABI,                  // Use the ABI from config
    functionName: 'isAllowed',                // The function to call
    // Pass address only if it's defined (non-null and non-undefined)
    // The 'as const' assertion helps TypeScript understand the tuple type correctly
    args: address ? [address] : undefined,    // Pass [address] if connected, otherwise undefined
    // Only run the query if the user is connected AND an address is available
    query: {
      enabled: isConnected && !!address, // !!address converts address to a boolean (true if defined, false if undefined/null)
    },
  });

  // Render different UI based on the state
  if (isConnecting) {
    return <div>Connecting wallet...</div>;
  }

  if (!isConnected) {
    return <div>Please connect your wallet.</div>;
  }

  if (isLoading) {
    return <div>Checking voter status...</div>;
  }

  if (isError) {
    return <div>Error checking voter status. Please try again.</div>;
  }

  // If data is successfully fetched
  // Add a check to ensure isAllowed is defined (though enabled: true should guarantee this)
  if (isAllowed === undefined) {
      // This case should ideally not happen due to `enabled: isConnected && !!address`,
      // but it's good defensive programming.
      return <div>Unexpected state: Voter status check completed but result is undefined.</div>;
  }

  return (
    <div>
      <p>Connected Wallet: {address}</p>
      <p>
        Voter Status: <strong>{isAllowed ? 'Registered Voter' : 'Not Registered'}</strong>
      </p>
    </div>
  );
};

export default VoterStatus;
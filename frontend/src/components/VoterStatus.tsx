// src/components/VoterStatus.tsx
import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useVoterRegistry } from '../hooks/useVoterRegistry';
import { isAddress } from 'viem'; // Utility to validate Ethereum addresses

/**
 * Component to display voter registration status and provide owner controls.
 */
const VoterStatus: React.FC = () => {
  const { address: userAddress, isConnected } = useAccount();
  const {
    isAllowed,
    isCheckingAllowed,
    isAllowedError,
    allowedError,
    handleAddVoter,
    isAddingVoter,
    isAddVoterSuccess,
    isAddVoterError,
    addVoterError,
  } = useVoterRegistry();

  const [voterToAdd, setVoterToAdd] = useState<string>(''); // State for the input field
  const [addVoterMessage, setAddVoterMessage] = useState<string>(''); // State for feedback message

  const handleAddVoterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddVoterMessage(''); // Clear previous message

    if (!isAddress(voterToAdd)) {
      setAddVoterMessage('Invalid Ethereum address.');
      return;
    }

    // Call the handleAddVoter function from the hook
    handleAddVoter(voterToAdd as `0x${string}`);
    // Reset the input field
    setVoterToAdd('');
  };

  if (!isConnected) {
    return (
      <div className="voter-status">
        <p>Please connect your wallet to check voter status.</p>
      </div>
    );
  }

  return (
    <div className="voter-status">
      <h3>Voter Status</h3>
      {isCheckingAllowed ? (
        <p>Checking if you are registered...</p>
      ) : isAllowedError ? (
        <p>Error checking voter status: {allowedError?.message}</p>
      ) : (
        <p>
          <strong>Registered Voter:</strong> {isAllowed ? 'Yes' : 'No'}
        </p>
      )}

      {/* Owner Controls (Placeholder for simplicity) */}
      {/* In a real app, you'd check if the connected address is the owner */}
      <details>
        <summary>Owner Controls (Add Voter)</summary>
        <form onSubmit={handleAddVoterSubmit}>
          <label htmlFor="voterAddress">Voter Address:</label>
          <input
            type="text"
            id="voterAddress"
            value={voterToAdd}
            onChange={(e) => setVoterToAdd(e.target.value)}
            placeholder="0x..."
            required
          />
          <button type="submit" disabled={isAddingVoter}>
            {isAddingVoter ? 'Adding...' : 'Add Voter'}
          </button>
        </form>
        {isAddVoterSuccess && <p>Voter added successfully!</p>}
        {isAddVoterError && <p>Error adding voter: {addVoterError?.message}</p>}
        {addVoterMessage && <p>{addVoterMessage}</p>}
      </details>
    </div>
  );
};

export default VoterStatus;
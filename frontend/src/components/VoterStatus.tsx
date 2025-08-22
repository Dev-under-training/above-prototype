// src/components/VoterStatus.tsx
import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useVoterRegistry } from '../hooks/useVoterRegistry';
import { isAddress } from 'viem';

const VoterStatus: React.FC = () => {
  const { address: userAddress, isConnected } = useAccount();
  const {
    isAllowed,
    isCheckingAllowed,
    isAllowedError,
    allowedError,
    // Single add
    handleAddVoter,
    isAddingVoter,
    isAddVoterSuccess,
    isAddVoterError,
    addVoterError,
    // Batch add
    handleAddVoters,
    isAddingVoters,
    isAddVotersSuccess,
    isAddVotersError,
    addVotersError,
  } = useVoterRegistry();

  // State for single add
  const [voterToAdd, setVoterToAdd] = useState<string>('');
  const [addVoterMessage, setAddVoterMessage] = useState<string>('');

  // State for batch add
  const [votersToAddBatch, setVotersToAddBatch] = useState<string>('');
  const [addVotersBatchMessage, setAddVotersBatchMessage] = useState<string>('');

  // --- Single Add Handler ---
  const handleAddVoterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddVoterMessage('');

    if (!isAddress(voterToAdd)) {
      setAddVoterMessage('Invalid Ethereum address.');
      return;
    }

    handleAddVoter(voterToAdd as `0x${string}`);
    setVoterToAdd('');
  };

  // --- Batch Add Handler ---
  const handleAddVotersBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddVotersBatchMessage('');

    // Simple parsing: split by newlines or commas and trim whitespace
    const rawAddresses = votersToAddBatch.split(/[\n,]+/).map(addr => addr.trim()).filter(addr => addr !== '');
    const validAddresses: `0x${string}`[] = [];
    const invalidAddresses: string[] = [];

    rawAddresses.forEach(addr => {
        if (isAddress(addr)) {
            validAddresses.push(addr as `0x${string}`);
        } else {
            invalidAddresses.push(addr);
        }
    });

    if (invalidAddresses.length > 0) {
        setAddVotersBatchMessage(`Invalid addresses found: ${invalidAddresses.join(', ')}`);
        return;
    }

    if (validAddresses.length === 0) {
        setAddVotersBatchMessage('No valid addresses found.');
        return;
    }

    handleAddVoters(validAddresses);
    setVotersToAddBatch(''); // Clear the input field on success attempt
  };
  // --- End Handlers ---

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

      {/* Owner Controls */}
      <details>
        <summary>Owner Controls (Add Voter(s))</summary>

        {/* Single Add Form */}
        <h4>Add Single Voter</h4>
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
        {isAddVoterSuccess && <p>Single voter added successfully!</p>}
        {isAddVoterError && <p>Error adding single voter: {addVoterError?.message}</p>}
        {addVoterMessage && <p style={{ color: 'red' }}>{addVoterMessage}</p>}

        {/* Batch Add Form */}
        <h4 style={{ marginTop: '20px' }}>Add Multiple Voters (Batch)</h4>
        <p>Enter one Ethereum address per line or separated by commas.</p>
        <form onSubmit={handleAddVotersBatchSubmit}>
          <label htmlFor="votersBatch">Voter Addresses:</label>
          <textarea
            id="votersBatch"
            value={votersToAddBatch}
            onChange={(e) => setVotersToAddBatch(e.target.value)}
            placeholder="0xAddress1&#10;0xAddress2&#10;0xAddress3"
            rows={5}
            cols={50}
            required
          />
          <button type="submit" disabled={isAddingVoters}>
            {isAddingVoters ? 'Adding Voters...' : 'Add Voters (Batch)'}
          </button>
        </form>
        {isAddVotersSuccess && <p>Batch of voters added successfully!</p>}
        {isAddVotersError && <p>Error adding batch of voters: {addVotersError?.message}</p>}
        {addVotersBatchMessage && <p style={{ color: 'red' }}>{addVotersBatchMessage}</p>}

      </details>
    </div>
  );
};

export default VoterStatus;
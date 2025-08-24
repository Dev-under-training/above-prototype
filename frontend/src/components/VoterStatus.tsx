// src/components/VoterStatus.tsx
import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useVoterRegistry } from '../hooks/useVoterRegistry';
import { useABOVEBallot } from '../hooks/useABOVEBallot'; // Import the new hook
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

  // --- NEW: Destructure description functions and state from useABOVEBallot ---
  const {
    handleSetCampaignDescription,
    isSettingDescription,
    isSetDescriptionSuccess,
    isSetDescriptionError,
    setDescriptionError,
  } = useABOVEBallot();
  // --- END NEW ---

  // State for single add
  const [voterToAdd, setVoterToAdd] = useState<string>('');
  const [addVoterMessage, setAddVoterMessage] = useState<string>('');

  // State for batch add
  const [votersToAddBatch, setVotersToAddBatch] = useState<string>('');
  const [addVotersBatchMessage, setAddVotersBatchMessage] = useState<string>('');

  // --- NEW: State for campaign description input ---
  const [descriptionInput, setDescriptionInput] = useState<string>('');
  const [setDescriptionMessage, setSetDescriptionMessage] = useState<string>(''); // For general messages/errors
  // --- END NEW ---

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

  // --- NEW: Handler for Setting Campaign Description ---
  const handleSetDescriptionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSetDescriptionMessage(''); // Clear previous messages

    if (!descriptionInput.trim()) {
      setSetDescriptionMessage('Description cannot be empty.');
      return;
    }

    // Call the function from the hook
    handleSetCampaignDescription(descriptionInput);
    // Note: We don't clear the input here, as the user might want to edit/re-submit.
    // Clearing can be done on success if desired.
  };
  // --- END NEW ---

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
        <summary>Owner Controls (Add Voter(s) & Set Description)</summary> {/* Updated summary */}

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

        {/* --- NEW: Set Campaign Description Form --- */}
        <h4 style={{ marginTop: '20px' }}>Set Campaign Description</h4>
        <form onSubmit={handleSetDescriptionSubmit}>
          <label htmlFor="campaignDescription">Description:</label>
          <textarea
            id="campaignDescription"
            value={descriptionInput}
            onChange={(e) => setDescriptionInput(e.target.value)}
            placeholder="Provide details about this voting campaign..."
            rows={4}
            cols={50}
            required
          />
          <button type="submit" disabled={isSettingDescription}>
            {isSettingDescription ? 'Setting Description...' : 'Set Description'}
          </button>
        </form>
        {/* Display status messages for setting description */}
        {isSetDescriptionSuccess && (
          <p style={{ color: 'green' }}>
            Campaign description set successfully!
          </p>
        )}
        {isSetDescriptionError && (
          <p style={{ color: 'red' }}>
            Error setting campaign description: {setDescriptionError?.message}
          </p>
        )}
        {setDescriptionMessage && (
          <p style={{ color: 'orange' }}>{setDescriptionMessage}</p>
        )}
        {/* --- END NEW --- */}

      </details>
    </div>
  );
};

export default VoterStatus;
// src/components/VoterStatus.tsx
import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useVoterRegistry } from '../hooks/useVoterRegistry';
import { useABOVEBallot } from '../hooks/useABOVEBallot';
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

  // --- Destructure description functions and state from useABOVEBallot ---
  const {
    currentCampaignType,
    isBasicCampaignSet,
    isBallotCampaignFinalized,
    // Set Description
    handleSetCampaignDescription,
    isSettingDescription,
    isSetDescriptionSuccess,
    isSetDescriptionError,
    setDescriptionError,
    // --- NEW: Destructure campaign setup functions and state ---
    // Set Basic Campaign
    handleSetBasicCampaign,
    isSettingBasicCampaign,
    isSetBasicCampaignSuccess,
    isSetBasicCampaignError,
    setBasicCampaignError,
    // Add Ballot Position
    handleAddBallotPosition,
    isAddingBallotPosition,
    isAddBallotPositionSuccess,
    isAddBallotPositionError,
    addBallotPositionError,
    // Add Candidate
    handleAddCandidate,
    isAddingCandidate,
    isAddCandidateSuccess,
    isAddCandidateError,
    addCandidateError,
    // Finalize Ballot Setup
    handleFinalizeBallotSetup,
    isFinalizingBallotSetup,
    isFinalizeBallotSetupSuccess,
    isFinalizeBallotSetupError,
    finalizeBallotSetupError,
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

  // --- NEW: State for Basic Campaign Setup ---
  const [basicChoicesInput, setBasicChoicesInput] = useState<string>('');
  const [isBasicSingleVoteInput, setIsBasicSingleVoteInput] = useState<boolean>(true); // Default to single vote
  const [setBasicCampaignMessage, setSetBasicCampaignMessage] = useState<string>('');

  // --- NEW: State for Ballot Campaign Setup ---
  // For adding positions
  const [ballotPositionNameInput, setBallotPositionNameInput] = useState<string>('');
  const [ballotPositionMaxSelectionsInput, setBallotPositionMaxSelectionsInput] = useState<number>(1);
  const [addBallotPositionMessage, setAddBallotPositionMessage] = useState<string>('');

  // For adding candidates
  const [candidateNameInput, setCandidateNameInput] = useState<string>('');
  const [candidatePositionIndexInput, setCandidatePositionIndexInput] = useState<string>('0'); // Use string for input
  const [addCandidateMessage, setAddCandidateMessage] = useState<string>('');

  // --- NEW: State for Finalizing Ballot Campaign ---
  const [finalizeBallotMessage, setFinalizeBallotMessage] = useState<string>('');
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

  // --- NEW: Handlers for Campaign Setup ---

  // --- Handler for Setting Basic Campaign ---
  const handleSetBasicCampaignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSetBasicCampaignMessage('');

    const choicesArray = basicChoicesInput
      .split('\n')
      .map(choice => choice.trim())
      .filter(choice => choice !== '');

    if (choicesArray.length === 0) {
      setSetBasicCampaignMessage('Please provide at least one choice.');
      return;
    }

    handleSetBasicCampaign(choicesArray, isBasicSingleVoteInput);
    // Optionally clear inputs on success attempt via useEffect
  };

  // --- Handler for Adding Ballot Position ---
  const handleAddBallotPositionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddBallotPositionMessage('');

    const name = ballotPositionNameInput.trim();
    if (!name) {
      setAddBallotPositionMessage('Position name cannot be empty.');
      return;
    }

    if (ballotPositionMaxSelectionsInput < 1) {
        setAddBallotPositionMessage('Max selections must be at least 1.');
        return;
    }

    handleAddBallotPosition(name, ballotPositionMaxSelectionsInput);
    // Optionally clear inputs on success attempt via useEffect
  };

  // --- Handler for Adding Candidate ---
  const handleAddCandidateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddCandidateMessage('');

    const name = candidateNameInput.trim();
    if (!name) {
      setAddCandidateMessage('Candidate name cannot be empty.');
      return;
    }

    const positionIndex = parseInt(candidatePositionIndexInput, 10);
    if (isNaN(positionIndex) || positionIndex < 0) {
       setAddCandidateMessage('Please enter a valid position index (non-negative integer).');
       return;
    }

    // Convert to bigint for the contract call
    handleAddCandidate(name, BigInt(positionIndex));
    // Optionally clear inputs on success attempt via useEffect
  };

  // --- Handler for Finalizing Ballot Setup ---
  const handleFinalizeBallotSetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFinalizeBallotMessage('');
    handleFinalizeBallotSetup();
  };

  // --- NEW: useEffects to Clear Inputs and Show Messages on Success ---
  useEffect(() => {
    if (isSetBasicCampaignSuccess) {
        setBasicChoicesInput('');
        setSetBasicCampaignMessage('Basic campaign set successfully!');
    }
  }, [isSetBasicCampaignSuccess]);

  useEffect(() => {
    if (isAddBallotPositionSuccess) {
        setBallotPositionNameInput('');
        setAddBallotPositionMessage('Ballot position added successfully!');
    }
  }, [isAddBallotPositionSuccess]);

  useEffect(() => {
    if (isAddCandidateSuccess) {
        setCandidateNameInput('');
        // Keep position index input if user wants to add more to same position
        setAddCandidateMessage('Candidate added successfully!');
    }
  }, [isAddCandidateSuccess]);

  useEffect(() => {
    if (isFinalizeBallotSetupSuccess) {
        setFinalizeBallotMessage('Ballot campaign finalized successfully!');
    }
  }, [isFinalizeBallotSetupSuccess]);

  useEffect(() => {
      if (isSetDescriptionSuccess) {
          setDescriptionInput(''); // Clear input on successful description set
          setSetDescriptionMessage('Campaign description set successfully!');
      }
  }, [isSetDescriptionSuccess]);
  // --- END NEW: useEffects ---

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
        <summary>Owner Controls (Add Voter(s) & Set Description & Campaign Setup)</summary> {/* Updated summary */}

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

        {/* --- NEW: Separator --- */}
        <hr style={{ margin: '20px 0', borderTop: '1px solid #ccc' }} />

        {/* --- NEW: Basic Campaign Setup Form --- */}
        <h4>Setup Basic Voting Campaign</h4>
        {(currentCampaignType !== 0 || isBasicCampaignSet) && (
             <p style={{ color: 'orange' }}><em>A campaign is already set or partially set. Setting a new Basic campaign will overwrite it.</em></p>
        )}
        <form onSubmit={handleSetBasicCampaignSubmit}>
          <label htmlFor="basicChoices">Choices (one per line):</label>
          <textarea
            id="basicChoices"
            value={basicChoicesInput}
            onChange={(e) => setBasicChoicesInput(e.target.value)}
            placeholder={`Option A&#10;Option B&#10;Option C`}
            rows={5}
            cols={50}
            required
          />
          <br />
          <label>
            <input
              type="checkbox"
              checked={isBasicSingleVoteInput}
              onChange={(e) => setIsBasicSingleVoteInput(e.target.checked)}
            />
            Single Vote Only (Uncheck for multiple selections)
          </label>
          <br />
          <button type="submit" disabled={isSettingBasicCampaign}>
            {isSettingBasicCampaign ? 'Setting Campaign...' : 'Set Basic Campaign'}
          </button>
        </form>
        {setBasicCampaignMessage && <p style={{ color: setBasicCampaignMessage.includes('successfully') ? 'green' : 'red' }}>{setBasicCampaignMessage}</p>}
        {isSetBasicCampaignError && <p style={{ color: 'red' }}>Error setting basic campaign: {setBasicCampaignError?.message}</p>}

        {/* --- NEW: Separator --- */}
        <hr style={{ margin: '20px 0', borderTop: '1px solid #ccc' }} />

        {/* --- NEW: Ballot Campaign Setup Forms --- */}
        <h4>Setup Ballot Voting Campaign</h4>
        {(currentCampaignType !== 0 || isBallotCampaignFinalized) && (
             <p style={{ color: 'orange' }}><em>A campaign is already set or partially set. Adding positions/candidates will modify the current Ballot setup.</em></p>
        )}

        {/* --- Add Ballot Position Form --- */}
        <h5>Add Ballot Position</h5>
        <form onSubmit={handleAddBallotPositionSubmit}>
          <label htmlFor="ballotPositionName">Position Name:</label>
          <input
            type="text"
            id="ballotPositionName"
            value={ballotPositionNameInput}
            onChange={(e) => setBallotPositionNameInput(e.target.value)}
            placeholder="e.g., President"
            required
          />
          <br />
          <label htmlFor="ballotPositionMaxSelections">Max Selections:</label>
          <input
            type="number"
            id="ballotPositionMaxSelections"
            min="1"
            value={ballotPositionMaxSelectionsInput}
            onChange={(e) => setBallotPositionMaxSelectionsInput(Number(e.target.value))}
            required
          />
          <br />
          <button type="submit" disabled={isAddingBallotPosition}>
            {isAddingBallotPosition ? 'Adding Position...' : 'Add Position'}
          </button>
        </form>
        {addBallotPositionMessage && <p style={{ color: addBallotPositionMessage.includes('successfully') ? 'green' : 'red' }}>{addBallotPositionMessage}</p>}
        {isAddBallotPositionError && <p style={{ color: 'red' }}>Error adding ballot position: {addBallotPositionError?.message}</p>}

        {/* --- Add Candidate Form --- */}
        <h5 style={{ marginTop: '15px' }}>Add Candidate</h5>
        <form onSubmit={handleAddCandidateSubmit}>
          <label htmlFor="candidateName">Candidate Name:</label>
          <input
            type="text"
            id="candidateName"
            value={candidateNameInput}
            onChange={(e) => setCandidateNameInput(e.target.value)}
            placeholder="e.g., Alice Smith"
            required
          />
          <br />
          <label htmlFor="candidatePositionIndex">Position Index:</label>
          <input
            type="number"
            id="candidatePositionIndex"
            min="0"
            step="1"
            value={candidatePositionIndexInput}
            onChange={(e) => setCandidatePositionIndexInput(e.target.value)}
            placeholder="0"
            required
          />
          <br />
          <button type="submit" disabled={isAddingCandidate}>
            {isAddingCandidate ? 'Adding Candidate...' : 'Add Candidate'}
          </button>
        </form>
        {addCandidateMessage && <p style={{ color: addCandidateMessage.includes('successfully') ? 'green' : 'red' }}>{addCandidateMessage}</p>}
        {isAddCandidateError && <p style={{ color: 'red' }}>Error adding candidate: {addCandidateError?.message}</p>}

        {/* --- Finalize Ballot Setup Form --- */}
        <h5 style={{ marginTop: '15px' }}>Finalize Ballot Campaign</h5>
        <p>Once you have added all positions and candidates, click below to finalize the setup.</p>
        <form onSubmit={handleFinalizeBallotSetupSubmit}>
          <button type="submit" disabled={isFinalizingBallotSetup}>
            {isFinalizingBallotSetup ? 'Finalizing...' : 'Finalize Ballot Setup'}
          </button>
        </form>
        {finalizeBallotMessage && <p style={{ color: finalizeBallotMessage.includes('successfully') ? 'green' : 'red' }}>{finalizeBallotMessage}</p>}
        {isFinalizeBallotSetupError && <p style={{ color: 'red' }}>Error finalizing ballot setup: {finalizeBallotSetupError?.message}</p>}

        {/* --- END NEW: Ballot Campaign Setup Forms --- */}

      </details>
    </div>
  );
};

export default VoterStatus;
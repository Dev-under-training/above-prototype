// frontend/src/components/VoterStatus.tsx
import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useVoterRegistry } from '../hooks/useVoterRegistry';
import { useABOVEBallot } from '../hooks/useABOVEBallot';
import { isAddress } from 'viem';

const VoterStatus: React.FC<{ campaignId?: bigint | null }> = ({ campaignId = null }) => {
  const { address: userAddress, isConnected } = useAccount();
  const {
    // Read data from VoterRegistry
    isAllowed,
    isCheckingAllowed,
    isAllowedError,
    allowedError,
    allowedVoterCount,
    isFetchingVoterCount,
    isVoterCountError,
    voterCountError,
    // Single add Voter
    handleAddVoter,
    isAddingVoter,
    isAddVoterSuccess,
    isAddVoterError,
    addVoterError,
    // Batch add Voters
    handleAddVoters,
    isAddingVoters,
    isAddVotersSuccess,
    isAddVotersError,
    addVotersError,
  } = useVoterRegistry();

  // --- Destructure functions and state from useABOVEBallot ---
  const {
    campaign,
    isFetchingCampaign,
    isCampaignError,
    campaignError,
    // Set Description
    handleSetCampaignDescription,
    isSettingDescription,
    isSetDescriptionSuccess,
    isSetDescriptionError,
    setDescriptionError,
    // Create Campaign
    handleCreateCampaign,
    isCreatingCampaign,
    isCreateCampaignSuccess,
    isCreateCampaignError,
    createCampaignError,
    // Activate Campaign
    handleActivateCampaign,
    isActivatingCampaign,
    isActivateCampaignSuccess,
    isActivateCampaignError,
    activateCampaignError,
    // Deactivate Campaign
    handleDeactivateCampaign,
    isDeactivatingCampaign,
    isDeactivateCampaignSuccess,
    isDeactivateCampaignError,
    deactivateCampaignError,
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
    // Add Candidate (Single)
    handleAddCandidate,
    isAddingCandidate,
    isAddCandidateSuccess,
    isAddCandidateError,
    addCandidateError,
    // Add Candidates (Batch)
    handleAddCandidates, // New handler for batch add
    isAddingCandidates, // New loading state
    isAddCandidatesSuccess, // New success state
    isAddCandidatesError, // New error state
    addCandidatesError, // New error object
    // Finalize Ballot Setup
    handleFinalizeBallotSetup,
    isFinalizingBallotSetup,
    isFinalizeBallotSetupSuccess,
    isFinalizeBallotSetupError,
    finalizeBallotSetupError,
    // Get Next Campaign ID
    nextCampaignId,
    isFetchingNextCampaignId,
    isNextCampaignIdError,
    nextCampaignIdError,
  } = useABOVEBallot(campaignId);
  // --- END ---

  // --- State for Voter Management ---
  const [voterToAdd, setVoterToAdd] = useState<string>('');
  const [addVoterMessage, setAddVoterMessage] = useState<string>('');
  const [votersToAddBatch, setVotersToAddBatch] = useState<string>('');
  const [addVotersBatchMessage, setAddVotersBatchMessage] = useState<string>('');
  // --- END State for Voter Management ---

  // --- State for Campaign Description ---
  const [descriptionInput, setDescriptionInput] = useState<string>('');
  const [setDescriptionMessage, setSetDescriptionMessage] = useState<string>('');
  // --- END State for Campaign Description ---

  // --- State for Create Campaign ---
  const [createCampaignDescription, setCreateCampaignDescription] = useState<string>('');
  const [createCampaignType, setCreateCampaignType] = useState<'Basic' | 'Ballot'>('Basic');
  const [createCampaignMessage, setCreateCampaignMessage] = useState<string>('');
  // --- END State for Create Campaign ---

  // --- State for Basic Campaign Setup ---
  const [basicChoicesInput, setBasicChoicesInput] = useState<string>('');
  const [isBasicSingleVoteInput, setIsBasicSingleVoteInput] = useState<boolean>(true);
  const [setBasicCampaignMessage, setSetBasicCampaignMessage] = useState<string>('');
  // --- END State for Basic Campaign Setup ---

  // --- State for Ballot Campaign Setup (Strict Sequential Flow) ---
  // For adding positions
  const [ballotPositionNameInput, setBallotPositionNameInput] = useState<string>('');
  const [ballotPositionMaxSelectionsInput, setBallotPositionMaxSelectionsInput] = useState<number>(1);
  const [addBallotPositionMessage, setAddBallotPositionMessage] = useState<string>('');

  // --- NEW: Strict Sequential State Management ---
  // Track the index of the position that was *successfully* added last
  const [lastAddedPositionIndex, setLastAddedPositionIndex] = useState<number | null>(null);
  // Temporarily store the index we are *trying* to add, to use in useEffect
  const [pendingPositionIndex, setPendingPositionIndex] = useState<number | null>(null);
  // Track candidate names input for the currently active position input section
  const [candidateNamesForLastPosition, setCandidateNamesForLastPosition] = useState<string>('');
  // --- END NEW ---
  // --- END State for Ballot Campaign Setup ---

  // --- State for Finalizing Ballot Campaign ---
  const [finalizeBallotMessage, setFinalizeBallotMessage] = useState<string>('');
  // --- END State for Finalizing Ballot Campaign ---

  // --- Handlers for Voter Management ---
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

  const handleAddVotersBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddVotersBatchMessage('');

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
    setVotersToAddBatch('');
  };
  // --- END Handlers for Voter Management ---

  // --- Handler for Creating Campaign ---
  const handleCreateCampaignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateCampaignMessage('');

    if (!createCampaignDescription.trim()) {
      setCreateCampaignMessage('Campaign description cannot be empty.');
      return;
    }

    const typeEnum = createCampaignType === 'Basic' ? 1 : 2;
    handleCreateCampaign(createCampaignDescription, typeEnum);
  };
  // --- END Handler for Creating Campaign ---

  // --- Handler for Setting Campaign Description ---
  const handleSetDescriptionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSetDescriptionMessage('');

    if (!descriptionInput.trim()) {
      setSetDescriptionMessage('Description cannot be empty.');
      return;
    }

    if (campaignId === null) {
       setSetDescriptionMessage('No campaign selected to set description for.');
       return;
    }

    handleSetCampaignDescription(descriptionInput);
  };
  // --- END Handler for Setting Campaign Description ---

  // --- Handlers for Campaign Setup ---

  // --- Handler for Setting Basic Campaign ---
  const handleSetBasicCampaignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSetBasicCampaignMessage('');

    if (campaignId === null) {
        setSetBasicCampaignMessage('No campaign selected.');
        return;
    }

    const choicesArray = basicChoicesInput
      .split('\n')
      .map(choice => choice.trim())
      .filter(choice => choice !== '');

    if (choicesArray.length === 0) {
      setSetBasicCampaignMessage('Please provide at least one choice.');
      return;
    }

    handleSetBasicCampaign(choicesArray, isBasicSingleVoteInput);
  };

  // --- Handler for Adding Ballot Position (Strict Sequential) ---
  const handleAddBallotPositionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddBallotPositionMessage('');

    if (campaignId === null) {
        setAddBallotPositionMessage('No campaign selected.');
        return;
    }

    const name = ballotPositionNameInput.trim();
    if (!name) {
      setAddBallotPositionMessage('Position name cannot be empty.');
      return;
    }

    if (ballotPositionMaxSelectionsInput < 1) {
        setAddBallotPositionMessage('Max selections must be at least 1.');
        return;
    }

    // --- NEW: Set pending index for strict sequential flow ---
    // Calculate the next position index based on the last successfully added one.
    // This assumes positions are added sequentially starting from 0.
    const nextPositionIndex = lastAddedPositionIndex !== null ? lastAddedPositionIndex + 1 : 0;
    setPendingPositionIndex(nextPositionIndex);
    // --- END NEW ---

    // Call the hook function
    handleAddBallotPosition(name, ballotPositionMaxSelectionsInput);
  };

  // --- NEW: Handler for Adding Candidates (Batch) for the Last Added Position ---
  const handleAddCandidatesSubmit = () => { // No longer takes positionIndex as arg
    if (campaignId === null) {
        console.error("Cannot add candidates: campaignId is null");
        // Optionally set an error message in state
        return;
    }

    if (lastAddedPositionIndex === null) {
         console.error("Cannot add candidates: No position confirmed yet.");
         // Optionally set an error message in state
         return;
    }

    const namesInput = candidateNamesForLastPosition || '';
    const namesArray = namesInput
      .split('\n')
      .map(name => name.trim())
      .filter(name => name !== '');

    if (namesArray.length === 0) {
        console.error("No candidate names provided for position", lastAddedPositionIndex);
        // Optionally set an error message in state
        return;
    }

    // Call the new batch add function from the hook, using the tracked index
    handleAddCandidates(namesArray, BigInt(lastAddedPositionIndex));
    // Note: Clearing inputs handled by success useEffect
  };
  // --- END NEW Handler ---

  // --- Handler for Finalizing Ballot Setup ---
  const handleFinalizeBallotSetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFinalizeBallotMessage('');

    if (campaignId === null) {
        setFinalizeBallotMessage('No campaign selected.');
        return;
    }

    handleFinalizeBallotSetup();
  };

  // --- END Handlers for Campaign Setup ---

  // --- useEffects for Clearing Inputs and Showing Messages on Success ---
  useEffect(() => {
    if (isSetBasicCampaignSuccess) {
        setBasicChoicesInput('');
        setSetBasicCampaignMessage('Basic campaign set successfully!');
    }
  }, [isSetBasicCampaignSuccess]);

  // --- NEW: useEffect for Strict Sequential Ballot Position Addition ---
  useEffect(() => {
    if (isAddBallotPositionSuccess && pendingPositionIndex !== null) {
        // Clear position input fields
        setBallotPositionNameInput('');
        setBallotPositionMaxSelectionsInput(1);
        setAddBallotPositionMessage('Ballot position added successfully!');

        // --- UPDATED: Update state for strict sequential setup ---
        // Set the last added position index to the one we just confirmed
        setLastAddedPositionIndex(pendingPositionIndex);
        // Clear the pending index
        setPendingPositionIndex(null);
        // Clear the candidate names input for the new section
        setCandidateNamesForLastPosition('');
        // Note: The UI section for candidates will now render based on `lastAddedPositionIndex`
        // --- END UPDATED ---
    }
    // Reset message/error if the action fails or is reset
    if (isAddBallotPositionError) {
         // Optionally handle error state, e.g., keep the input section visible or show error
         // For now, we just log or could set a message, but the main state change happens on success.
    }
  }, [isAddBallotPositionSuccess, isAddBallotPositionError, pendingPositionIndex]); // Depend on success, error, and pending index

  // --- NEW: useEffect for Clearing Candidate Input after Successful Addition ---
  useEffect(() => {
    if (isAddCandidateSuccess || isAddCandidatesSuccess) { // Handle both single and batch success
        const successMessage = isAddCandidateSuccess ? 'Candidate added successfully!' : 'Candidates added successfully!';
        setAddBallotPositionMessage(successMessage); // Reuse message state or create a new one if needed

        // --- NEW: Clear candidate input after successful addition ---
        if (isAddCandidatesSuccess) {
             // Clear the candidate names input specifically for the last added position
             setCandidateNamesForLastPosition('');
             // Optionally, you might want to clear `lastAddedPositionIndex` here
             // to hide the section until the next position is added, enforcing strict sequence.
             // setLastAddedPositionIndex(null);
             // Let's not do this by default, keep the section visible after adding candidates
             // until the next position is added or finalized.
        }
        // --- END NEW ---
    }
    // Handle errors if needed (e.g., setAddBallotPositionMessage with error color)
  }, [isAddCandidateSuccess, isAddCandidatesSuccess]);
  // --- END NEW useEffect ---

  useEffect(() => {
    if (isFinalizeBallotSetupSuccess) {
        setFinalizeBallotMessage('Ballot campaign finalized successfully!');
        // Optionally, clear the last added position index upon finalization
        // if you want to enforce starting fresh after finalizing.
        // setLastAddedPositionIndex(null);
    }
  }, [isFinalizeBallotSetupSuccess]);

  useEffect(() => {
      if (isSetDescriptionSuccess) {
          setDescriptionInput('');
          setSetDescriptionMessage('Campaign description set successfully!');
      }
  }, [isSetDescriptionSuccess]);

  useEffect(() => {
      if (isCreateCampaignSuccess) {
          setCreateCampaignDescription('');
          setCreateCampaignMessage('Campaign created successfully!');
      }
  }, [isCreateCampaignSuccess]);

  useEffect(() => {
    if (isActivateCampaignSuccess) {
         setCreateCampaignMessage('Campaign activated successfully!');
    }
  }, [isActivateCampaignSuccess]);

  useEffect(() => {
    if (isDeactivateCampaignSuccess) {
         setCreateCampaignMessage('Campaign deactivated successfully!');
    }
  }, [isDeactivateCampaignSuccess]);
  // --- END useEffects ---

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
      {isFetchingVoterCount ? (
         <p>Loading voter count...</p>
      ) : isVoterCountError ? (
         <p>Error loading voter count: {voterCountError?.message}</p>
      ) : (
         <p><strong>Total Registered Voters:</strong> {(allowedVoterCount ?? 0n).toString()}</p>
      )}

      {/* Owner Controls */}
      <details>
        <summary>Owner Controls (Voter Management, Campaign Creation & Setup)</summary>

        {/* --- Create Campaign Form --- */}
        <h4>Create New Campaign</h4>
        <form onSubmit={handleCreateCampaignSubmit}>
          <label htmlFor="createCampaignDescription">Description:</label>
          <textarea
            id="createCampaignDescription"
            value={createCampaignDescription}
            onChange={(e) => setCreateCampaignDescription(e.target.value)}
            placeholder="Describe the new campaign..."
            rows={3}
            cols={50}
            required
          />
          <br />
          <label htmlFor="createCampaignType">Type:</label>
          <select
            id="createCampaignType"
            value={createCampaignType}
            onChange={(e) => setCreateCampaignType(e.target.value as 'Basic' | 'Ballot')}
          >
            <option value="Basic">Basic Voting</option>
            <option value="Ballot">Ballot Voting</option>
          </select>
          <br />
          <button type="submit" disabled={isCreatingCampaign}>
            {isCreatingCampaign ? 'Creating...' : 'Create Campaign'}
          </button>
        </form>
        {isCreateCampaignSuccess && <p style={{ color: 'green' }}>Campaign created successfully!</p>}
        {isCreateCampaignError && <p style={{ color: 'red' }}>Error creating campaign: {createCampaignError?.message}</p>}
        {createCampaignMessage && <p style={{ color: createCampaignMessage.includes('successfully') ? 'green' : 'red' }}>{createCampaignMessage}</p>}
        {/* --- END Create Campaign Form --- */}

        {/* --- Separator --- */}
        <hr style={{ margin: '20px 0', borderTop: '1px solid #ccc' }} />

        {/* --- Activate/Deactivate Campaign (if a campaignId is provided) --- */}
        {campaignId !== null && (
          <>
            <h4>Activate/Deactivate Campaign (ID: {campaignId.toString()})</h4>
            {isFetchingCampaign ? (
              <p>Loading campaign status...</p>
            ) : isCampaignError ? (
              <p style={{ color: 'red' }}>Error loading campaign status: {campaignError?.message}</p>
            ) : campaign ? (
              <>
                <p><strong>Status:</strong> {campaign.isActive ? 'Active' : (campaign.isFinalized ? 'Finalized' : 'Inactive')}</p>
                <button onClick={() => handleActivateCampaign()} disabled={isActivatingCampaign || campaign.isActive}>
                  {isActivatingCampaign ? 'Activating...' : 'Activate Campaign'}
                </button>
                <button onClick={() => handleDeactivateCampaign()} disabled={isDeactivatingCampaign || !campaign.isActive} style={{ marginLeft: '10px' }}>
                  {isDeactivatingCampaign ? 'Deactivating...' : 'Deactivate Campaign'}
                </button>
                {isActivateCampaignSuccess && <p style={{ color: 'green' }}>Campaign activated successfully!</p>}
                {isActivateCampaignError && <p style={{ color: 'red' }}>Error activating campaign: {activateCampaignError?.message}</p>}
                {isDeactivateCampaignSuccess && <p style={{ color: 'green' }}>Campaign deactivated successfully!</p>}
                {isDeactivateCampaignError && <p style={{ color: 'red' }}>Error deactivating campaign: {deactivateCampaignError?.message}</p>}
              </>
            ) : (
              <p>Campaign data not found.</p>
            )}
            {/* --- Separator --- */}
            <hr style={{ margin: '20px 0', borderTop: '1px solid #ccc' }} />
          </>
        )}

        {/* --- Add Voters --- */}
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
        {isAddVoterSuccess && <p style={{ color: 'green' }}>Single voter added successfully!</p>}
        {isAddVoterError && <p style={{ color: 'red' }}>Error adding single voter: {addVoterError?.message}</p>}
        {addVoterMessage && <p style={{ color: 'red' }}>{addVoterMessage}</p>}

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
        {isAddVotersSuccess && <p style={{ color: 'green' }}>Batch of voters added successfully!</p>}
        {isAddVotersError && <p style={{ color: 'red' }}>Error adding batch of voters: {addVotersError?.message}</p>}
        {addVotersBatchMessage && <p style={{ color: 'red' }}>{addVotersBatchMessage}</p>}
        {/* --- END Add Voters --- */}

        {/* --- Set Campaign Description (if campaignId is provided) --- */}
        {campaignId !== null && (
          <>
            <h4 style={{ marginTop: '20px' }}>Set Campaign Description (ID: {campaignId.toString()})</h4>
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
          </>
        )}
        {/* --- END Set Campaign Description --- */}

        {/* --- Separator --- */}
        <hr style={{ margin: '20px 0', borderTop: '1px solid #ccc' }} />

        {/* --- Basic Campaign Setup (if campaignId is provided) --- */}
        {campaignId !== null && (
          <>
            <h4>Setup Basic Voting Campaign (ID: {campaignId.toString()})</h4>
            {(campaign?.campaignType !== 1 || campaign?.isFinalized) && campaign?.campaignType !== 0 && (
                 <p style={{ color: 'orange' }}><em>A campaign is already set or finalized. Setting a new Basic campaign will overwrite it.</em></p>
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
          </>
        )}
        {/* --- END Basic Campaign Setup --- */}

        {/* --- Separator --- */}
        <hr style={{ margin: '20px 0', borderTop: '1px solid #ccc' }} />

        {/* --- Ballot Campaign Setup (if campaignId is provided) - Strict Sequential --- */}
        {campaignId !== null && (
          <>
            <h4>Setup Ballot Voting Campaign (ID: {campaignId.toString()})</h4>
            {(campaign?.campaignType !== 2 || campaign?.isFinalized) && campaign?.campaignType !== 0 && (
                 <p style={{ color: 'orange' }}><em>A campaign is already set or finalized. Adding positions/candidates will modify the current Ballot setup.</em></p>
            )}

            {/* --- Add Ballot Position Form --- */}
            <h5>Add Ballot Position</h5>
            <form onSubmit={(e) => { e.preventDefault(); handleAddBallotPositionSubmit(e); }}>
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

            {/* --- NEW: Dynamic Candidate Input Section (Only for the last added position) - Strict Sequential --- */}
            {/* Render input section ONLY if a position was successfully added */}
            {lastAddedPositionIndex !== null && (
              <div key={lastAddedPositionIndex} style={{ marginTop: '15px', padding: '10px', border: '1px solid #eee', borderRadius: '5px' }}>
                <h5>Add Candidates for Position Index: {lastAddedPositionIndex}</h5>
                <label htmlFor={`candidateNames-${lastAddedPositionIndex}`}>Candidate Names (one per line):</label>
                <textarea
                  id={`candidateNames-${lastAddedPositionIndex}`}
                  value={candidateNamesForLastPosition} // Bind to the specific state variable
                  onChange={(e) => setCandidateNamesForLastPosition(e.target.value)} // Update the specific state variable
                  placeholder={`Candidate 1&#10;Candidate 2&#10;...`}
                  rows={5}
                  cols={50}
                />
                <br />
                <button
                  type="button" // Important: type="button" to prevent form submission
                  onClick={handleAddCandidatesSubmit} // Call the updated handler
                  disabled={isAddingCandidates} // Disable while any batch add is in progress
                >
                  {isAddingCandidates ? 'Adding Candidates...' : 'Add Candidates'}
                </button>
                 {/* Display status messages for adding candidates for this position */}
                 {/* Note: Reusing addBallotPositionMessage for simplicity, consider a dedicated state */}
                 {/* The useEffect above handles success messages. Error messages could be added similarly. */}
                 {/* {isAddCandidatesSuccess && ( ... ) } */} {/* Handled by the useEffect above */}
                 {/* {isAddCandidatesError && ( ... ) */}
              </div>
            )}
            {/* --- END NEW: Dynamic Candidate Input Section --- */}

            {/* --- Finalize Ballot Setup Form --- */}
            <h5 style={{ marginTop: '15px' }}>Finalize Ballot Campaign</h5>
            <p>Once you have added all positions and candidates, click below to finalize the setup.</p>
            <form onSubmit={handleFinalizeBallotSetupSubmit}>
              <button type="submit" disabled={isFinalizingBallotSetup || (campaign?.isFinalized ?? false)}>
                {isFinalizingBallotSetup ? 'Finalizing...' : 'Finalize Ballot Setup'}
              </button>
            </form>
            {finalizeBallotMessage && <p style={{ color: finalizeBallotMessage.includes('successfully') ? 'green' : 'red' }}>{finalizeBallotMessage}</p>}
            {isFinalizeBallotSetupError && <p style={{ color: 'red' }}>Error finalizing ballot setup: {finalizeBallotSetupError?.message}</p>}
          </>
        )}
        {/* --- END Ballot Campaign Setup --- */}

      </details>
    </div>
  );
};

export default VoterStatus;

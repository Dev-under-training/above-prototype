// frontend/src/components/VoterStatus.tsx
import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useVoterRegistry } from '../hooks/useVoterRegistry';
import { useABOVEBallot } from '../hooks/useABOVEBallot';
import { isAddress, formatUnits } from 'viem';

const VoterStatus: React.FC<{ campaignId: bigint | null }> = ({ campaignId = null }) => {
  const { address: userAddress, isConnected } = useAccount();
  const {
    isAllowed,
    isCheckingAllowed,
    isAllowedError,
    allowedError,
    allowedVoterCount,
    isFetchingVoterCount,
    isVoterCountError,
    voterCountError,
    handleRegisterAsVoter,
    isRegisteringAsVoter,
    isRegisterAsVoterSuccess,
    isRegisterAsVoterError,
    registerAsVoterError,
  } = useVoterRegistry();

  const {
    campaign,
    isFetchingCampaign,
    isCampaignError,
    campaignError,
    handleSetCampaignDescription,
    isSettingDescription,
    isSetDescriptionSuccess,
    isSetDescriptionError,
    setDescriptionError,
    handleCreateCampaign,
    isCreatingCampaign,
    isCreateCampaignSuccess,
    isCreateCampaignError,
    createCampaignError,
    handleSetBasicCampaign,
    isSettingBasicCampaign,
    isSetBasicCampaignSuccess,
    isSetBasicCampaignError,
    setBasicCampaignError,
    handleAddBallotPosition,
    isAddingBallotPosition,
    isAddBallotPositionSuccess,
    isAddBallotPositionError,
    addBallotPositionError,
    handleAddCandidate,
    isAddingCandidate,
    isAddCandidateSuccess,
    isAddCandidateError,
    addCandidateError,
    handleAddCandidates,
    isAddingCandidates,
    isAddCandidatesSuccess,
    isAddCandidatesError,
    addCandidatesError,
    handleFinalizeBallotSetup,
    isFinalizingBallotSetup,
    isFinalizeBallotSetupSuccess,
    isFinalizeBallotSetupError,
    finalizeBallotSetupError,
    handleEndCampaign,
    isEndingCampaign,
    isEndCampaignSuccess,
    isEndCampaignError,
    endCampaignError,
    aboveTokenBalance,
    isFetchingAboveTokenBalance,
    aboveTokenAllowance,
    isFetchingAboveTokenAllowance,
    CAMPAIGN_CREATION_FEE,
    isFetchingCampaignCreationFee,
    handleApproveAboveTokens,
    isApprovingAboveTokens,
    isApproveAboveTokensSuccess,
    isApproveAboveTokensError,
    approveAboveTokensError,
  } = useABOVEBallot(campaignId);

  // --- Check if Connected User is Campaign Creator ---
  const isCampaignCreator = isConnected && campaign && userAddress && 
                           campaign.creator.toLowerCase() === userAddress.toLowerCase();

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
  const [ballotPositionNameInput, setBallotPositionNameInput] = useState<string>('');
  const [ballotPositionMaxSelectionsInput, setBallotPositionMaxSelectionsInput] = useState<number>(1);
  const [addBallotPositionMessage, setAddBallotPositionMessage] = useState<string>('');

  // --- Strict Sequential State Management ---
  const [lastAddedPositionIndex, setLastAddedPositionIndex] = useState<number | null>(null);
  const [pendingPositionIndex, setPendingPositionIndex] = useState<number | null>(null);
  const [candidateNamesForLastPosition, setCandidateNamesForLastPosition] = useState<string>('');
  // --- END State for Ballot Campaign Setup ---

  // --- State for Finalizing Ballot Campaign ---
  const [finalizeBallotMessage, setFinalizeBallotMessage] = useState<string>('');
  // --- END State for Finalizing Ballot Campaign ---

  // --- State for End Campaign Confirmation ---
  const [showEndConfirmation, setShowEndConfirmation] = useState<boolean>(false);
  const [endCampaignMessage, setEndCampaignMessage] = useState<string>('');
  // --- END NEW ---

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

    const nextPositionIndex = lastAddedPositionIndex !== null ? lastAddedPositionIndex + 1 : 0;
    setPendingPositionIndex(nextPositionIndex);
    handleAddBallotPosition(name, ballotPositionMaxSelectionsInput);
  };

  const handleAddCandidatesSubmit = () => {
    if (campaignId === null) {
      console.error("Cannot add candidates: campaignId is null");
      return;
    }

    if (lastAddedPositionIndex === null) {
         console.error("Cannot add candidates: No position confirmed yet.");
         return;
    }

    const namesInput = candidateNamesForLastPosition || '';
    const namesArray = namesInput
      .split('\n')
      .map(name => name.trim())
      .filter(name => name !== '');

    if (namesArray.length === 0) {
        console.error("No candidate names provided for position", lastAddedPositionIndex);
        return;
    }

    handleAddCandidates(namesArray, BigInt(lastAddedPositionIndex));
  };

  const handleFinalizeBallotSetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFinalizeBallotMessage('');

    if (campaignId === null) {
        setFinalizeBallotMessage('No campaign selected.');
        return;
    }

    handleFinalizeBallotSetup();
  };

  const handleEndCampaignClick = () => {
    setShowEndConfirmation(true);
    setEndCampaignMessage('');
  };

  const handleConfirmEndCampaign = () => {
    if (campaignId === null) {
        setEndCampaignMessage('No campaign selected.');
        setShowEndConfirmation(false);
        return;
    }
    handleEndCampaign(campaignId);
    setShowEndConfirmation(false);
  };

  const handleCancelEndCampaign = () => {
    setShowEndConfirmation(false);
    setEndCampaignMessage('');
  };

  // --- useEffects for Clearing Inputs and Showing Messages on Success ---
  useEffect(() => {
    if (isSetBasicCampaignSuccess) {
        setBasicChoicesInput('');
        setSetBasicCampaignMessage('Basic campaign set successfully!');
    }
  }, [isSetBasicCampaignSuccess]);

  useEffect(() => {
    if (isAddBallotPositionSuccess && pendingPositionIndex !== null) {
        setBallotPositionNameInput('');
        setBallotPositionMaxSelectionsInput(1);
        setAddBallotPositionMessage('Ballot position added successfully!');
        setLastAddedPositionIndex(pendingPositionIndex);
        setPendingPositionIndex(null);
        setCandidateNamesForLastPosition('');
    }
  }, [isAddBallotPositionSuccess, isAddBallotPositionError, pendingPositionIndex]);

  useEffect(() => {
    if (isAddCandidateSuccess || isAddCandidatesSuccess) {
        const successMessage = isAddCandidateSuccess ? 'Candidate added successfully!' : 'Candidates added successfully!';
        setAddBallotPositionMessage(successMessage);
        if (isAddCandidatesSuccess) {
             setCandidateNamesForLastPosition('');
        }
    }
  }, [isAddCandidateSuccess, isAddCandidatesSuccess]);

  useEffect(() => {
    if (isFinalizeBallotSetupSuccess) {
        setFinalizeBallotMessage('Ballot campaign finalized successfully!');
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

  // --- Removed activation/deactivation useEffects ---

  useEffect(() => {
    if (isEndCampaignSuccess) {
         setEndCampaignMessage('Campaign ended successfully!');
         setLastAddedPositionIndex(null);
         setPendingPositionIndex(null);
         setCandidateNamesForLastPosition('');
         setBasicChoicesInput('');
         setIsBasicSingleVoteInput(true);
         setSetBasicCampaignMessage('');
         setAddBallotPositionMessage('');
         setFinalizeBallotMessage('');
    }
    if (isEndCampaignError) {
         setEndCampaignMessage(`Error ending campaign: ${endCampaignError?.message || 'Unknown error'}`);
    }
  }, [isEndCampaignSuccess, isEndCampaignError, endCampaignError]);

  if (!isConnected) {
    return (
      <div className="voter-status">
        <p>Please connect your wallet to access campaign controls.</p>
      </div>
    );
  }

  return (
    <div className="voter-status">
      <h3>Campaign Controls</h3>
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

      {isConnected && !isAllowed && (
        <div style={{ marginTop: '15px', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
          <p><strong>Not registered to vote yet?</strong></p>
          <button
            onClick={handleRegisterAsVoter}
            disabled={isRegisteringAsVoter}
            style={{ padding: '8px 16px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            {isRegisteringAsVoter ? 'Registering...' : 'Register to Vote (Testnet)'}
          </button>
          {isRegisterAsVoterSuccess && (
            <p style={{ color: 'green', marginTop: '10px' }}>Registration successful! You can now create campaigns.</p>
          )}
          {isRegisterAsVoterError && (
            <p style={{ color: 'red', marginTop: '10px' }}>Registration failed: {registerAsVoterError?.message}</p>
          )}
        </div>
      )}

      <details>
        <summary>Campaign Controls (Create & Setup)</summary>

        <h4>Create New Campaign</h4>
        {isFetchingAboveTokenBalance ? (
          <p>Loading ABOVE token balance...</p>
        ) : (
          <p><strong>Your ABOVE Token Balance:</strong> {aboveTokenBalance !== undefined ? formatUnits(aboveTokenBalance, 18) : '0'} ABOVE</p>
        )}

        {isFetchingCampaignCreationFee ? (
          <p>Loading campaign creation fee...</p>
        ) : CAMPAIGN_CREATION_FEE !== undefined ? (
          <p><strong>Required Fee:</strong> {formatUnits(CAMPAIGN_CREATION_FEE, 18)} ABOVE</p>
        ) : null}

        {isFetchingAboveTokenAllowance || isFetchingAboveTokenBalance || isFetchingCampaignCreationFee ? (
          <p>Checking token status...</p>
        ) : (
          <>
            {aboveTokenBalance !== undefined && CAMPAIGN_CREATION_FEE !== undefined && aboveTokenBalance < CAMPAIGN_CREATION_FEE ? (
              <p style={{ color: 'red' }}>Insufficient ABOVE token balance to create a campaign.</p>
            ) : (
              <>
                {aboveTokenAllowance !== undefined && CAMPAIGN_CREATION_FEE !== undefined && aboveTokenAllowance < CAMPAIGN_CREATION_FEE ? (
                  <>
                    <p style={{ color: 'orange' }}>Insufficient token allowance for campaign creation fee. Please approve the ABOVEBallot contract.</p>
                    <button
                      onClick={() => handleApproveAboveTokens(CAMPAIGN_CREATION_FEE)}
                      disabled={isApprovingAboveTokens}
                      style={{ marginBottom: '10px' }}
                    >
                      {isApprovingAboveTokens ? 'Approving...' : 'Approve ABOVE Tokens'}
                    </button>
                    {isApproveAboveTokensSuccess && <p style={{ color: 'green' }}>Tokens approved successfully! You can now create a campaign.</p>}
                    {isApproveAboveTokensError && <p style={{ color: 'red' }}>Approval failed: {approveAboveTokensError?.message}</p>}
                  </>
                ) : (
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
                )}
              </>
            )}
          </>
        )}

        {isCreateCampaignSuccess && <p style={{ color: 'green' }}>Campaign created successfully!</p>}
        {isCreateCampaignError && <p style={{ color: 'red' }}>Error creating campaign: {createCampaignError?.message}</p>}
        {createCampaignMessage && <p style={{ color: createCampaignMessage.includes('successfully') ? 'green' : 'red' }}>{createCampaignMessage}</p>}

        <hr style={{ margin: '20px 0', borderTop: '1px solid #ccc' }} />

        {campaignId !== null && isCampaignCreator && (
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
              <p style={{ color: setDescriptionMessage.includes('successfully') ? 'green' : 'red' }}>{setDescriptionMessage}</p>
            )}
          </>
        )}

        <hr style={{ margin: '20px 0', borderTop: '1px solid #ccc' }} />

        {campaignId !== null && campaign?.campaignType === 1 && isCampaignCreator && (
          <>
            <h4>Setup Basic Voting Campaign (ID: {campaignId.toString()})</h4>
            {(campaign?.campaignType !== 1 || campaign?.isFinalized) && campaign?.campaignType !== 1 && (
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

        <hr style={{ margin: '20px 0', borderTop: '1px solid #ccc' }} />

        {campaignId !== null && campaign?.campaignType === 2 && isCampaignCreator && (
          <>
            <h4>Setup Ballot Voting Campaign (ID: {campaignId.toString()})</h4>
            {(campaign?.campaignType !== 2 || campaign?.isFinalized) && campaign?.campaignType !== 2 && (
                 <p style={{ color: 'orange' }}><em>A campaign is already set or finalized. Adding positions/candidates will modify the current Ballot setup.</em></p>
            )}

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

            {lastAddedPositionIndex !== null && (
              <div key={lastAddedPositionIndex} style={{ marginTop: '15px', padding: '10px', border: '1px solid #eee', borderRadius: '5px' }}>
                <h5>Add Candidates for Position Index: {lastAddedPositionIndex}</h5>
                <label htmlFor={`candidateNames-${lastAddedPositionIndex}`}>Candidate Names (one per line):</label>
                <textarea
                  id={`candidateNames-${lastAddedPositionIndex}`}
                  value={candidateNamesForLastPosition}
                  onChange={(e) => setCandidateNamesForLastPosition(e.target.value)}
                  placeholder={`Candidate 1&#10;Candidate 2&#10;...`}
                  rows={5}
                  cols={50}
                />
                <br />
                <button
                  type="button"
                  onClick={handleAddCandidatesSubmit}
                  disabled={isAddingCandidates}
                >
                  {isAddingCandidates ? 'Adding Candidates...' : 'Add Candidates'}
                </button>
              </div>
            )}

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

        <hr style={{ margin: '20px 0', borderTop: '1px solid #ccc' }} />

        {campaignId !== null && campaign?.isFinalized && isCampaignCreator && (
          <>
            <h4>Danger Zone: End Campaign (ID: {campaignId.toString()})</h4>
            <div style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', color: '#856404', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>
              <p><strong>⚠️ Caution:</strong></p>
              <ul>
                <li><strong>Irreversible Action:</strong> Ending this campaign will permanently record the final vote counts and candidate/choice data on-chain. It will prevent further voting and mark the campaign as concluded.</li>
                <li><strong>Scalability Limitation:</strong> The end campaign process involves recording data on the blockchain. While efficient for small campaigns (e.g., fewer than 100 choices/candidates), it can become extremely slow, expensive in gas fees, and potentially fail for large campaigns (e.g., hundreds or thousands of choices/candidates).</li>
                <li><strong>Recommendation for Large Campaigns:</strong> For large-scale elections or polls, it is strongly recommended to create a <em>new</em> campaign with a unique ID instead of ending an existing one if it contains vast amounts of data. This approach is more efficient, avoids potential gas issues, and provides a clearer historical record.</li>
                <li><strong>Data Persistence:</strong> Please note, while the contract state is cleared, the blockchain transaction history showing that this campaign existed and was voted on remains permanently immutable.</li>
              </ul>
            </div>

            {!showEndConfirmation ? (
              <button
                onClick={handleEndCampaignClick}
                disabled={isEndingCampaign}
                style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '4px', cursor: 'pointer' }}
              >
                {isEndingCampaign ? 'Ending Campaign...' : 'End Campaign'}
              </button>
            ) : (
              <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px', backgroundColor: '#f8f9fa' }}>
                <p><strong>Are you sure you want to end Campaign ID {campaignId.toString()}?</strong></p>
                <p style={{ color: 'red' }}><strong>This action cannot be undone and will record final results on-chain.</strong></p>
                <button
                  onClick={handleConfirmEndCampaign}
                  disabled={isEndingCampaign}
                  style={{ backgroundColor: '#dc3545', color: 'white', marginRight: '10px' }}
                >
                  {isEndingCampaign ? 'Ending...' : 'Yes, End Campaign'}
                </button>
                <button onClick={handleCancelEndCampaign} disabled={isEndingCampaign}>
                  Cancel
                </button>
              </div>
            )}

            {endCampaignMessage && (
              <p style={{ color: endCampaignMessage.includes('successfully') ? 'green' : 'red', marginTop: '10px' }}>
                {endCampaignMessage}
              </p>
            )}
          </>
        )}

      </details>
    </div>
  );
};

export default VoterStatus;
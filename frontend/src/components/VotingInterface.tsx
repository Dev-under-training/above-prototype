// frontend/src/components/VotingInterface.tsx
import React, { useState, useEffect } from 'react';
import { useABOVEBallot } from '../hooks/useABOVEBallot';

/**
 * Props for the VotingInterface component.
 */
interface VotingInterfaceProps {
  campaignId: bigint | null; // Accept campaignId as a prop
}

const VotingInterface: React.FC<VotingInterfaceProps> = ({ campaignId }) => {
  // Pass the campaignId to the hook
  const {
    campaign, // Get campaign metadata to check status
    hasVoted, // Check vote status for this specific campaign/user
    isCheckingVoteStatus,
    isVoteStatusError,
    // --- Voting Functions ---
    handleVoteBasic,
    isVotingBasic,
    isVoteBasicSuccess,
    isVoteBasicError,
    voteBasicError,
    handleVoteBallot,
    isVotingBallot,
    isVoteBallotSuccess,
    isVoteBallotError,
    voteBallotError,
    // --- Data needed for Voting UI ---
    isBasicSingleVote,
    basicChoices,
    ballotPositions,
    ballotCandidates,
    isFetchingCampaign,
    isCampaignError,
    campaignError,
    isFetchingBasicResults,
    isBasicResultsError,
    basicResultsError,
    isFetchingBallotResults,
    isBallotResultsError,
    ballotResultsError
  } = useABOVEBallot(campaignId); // Pass campaignId to the hook

  // --- State for Basic Voting ---
  const [selectedBasicChoices, setSelectedBasicChoices] = useState<number[]>([]);

  // --- State for Ballot Voting ---
  // Key: position index (number), Value: array of selected candidate indices (numbers) for that position
  const [selectedBallotChoices, setSelectedBallotChoices] = useState<Record<number, number[]>>({});

  // --- State for General Messages ---
  const [generalMessage, setGeneralMessage] = useState<string>('');

  // --- Effect to handle successful vote submission ---
  useEffect(() => {
    if (isVoteBasicSuccess || isVoteBallotSuccess) {
      setGeneralMessage('Vote submitted successfully!');
      // Clear selections
      setSelectedBasicChoices([]);
      setSelectedBallotChoices({});
      // Note: Consider refetching campaign data or results if needed for real-time updates
    }
  }, [isVoteBasicSuccess, isVoteBallotSuccess]);

  // --- Handler for Basic Voting Selection ---
  const handleBasicChoiceToggle = (index: number) => {
    if (!campaignId || !campaign || !campaign.isActive || hasVoted || isVotingBasic) return; // Prevent changes if conditions aren't met

    if (isBasicSingleVote) {
      // Radio button behavior: only one selection allowed
      setSelectedBasicChoices([index]);
    } else {
      // Checkbox behavior: toggle selection
      setSelectedBasicChoices(prev => {
        if (prev.includes(index)) {
          // Deselect
          return prev.filter(i => i !== index);
        } else {
          // Select
          return [...prev, index];
        }
      });
    }
  };

  // --- Handler for Ballot Voting Selection ---
  const handleBallotCandidateToggle = (positionIndex: number, candidateIndex: number) => {
     if (!campaignId || !campaign || !campaign.isActive || !campaign.isFinalized || hasVoted || isVotingBallot) return;

    const position = ballotPositions[positionIndex];
    const currentSelectionsForPosition = selectedBallotChoices[positionIndex] || [];

    setSelectedBallotChoices(prev => {
      const newSelections = { ...prev };
      const currentSelections = newSelections[positionIndex] || [];

      if (currentSelections.includes(candidateIndex)) {
        // Deselect
        newSelections[positionIndex] = currentSelections.filter(i => i !== candidateIndex);
      } else {
        // Check if max selections are reached
        // Ensure comparison is between numbers (hook likely converts bigint to number)
        if (currentSelections.length >= position.maxSelections) {
          setGeneralMessage(`You can only select up to ${position.maxSelections.toString()} candidate(s) for ${position.name}.`);
          return prev; // Don't update selection
        }
        // Select
        newSelections[positionIndex] = [...currentSelections, candidateIndex];
        setGeneralMessage(''); // Clear any previous message
      }
      return newSelections;
    });
  };

  // --- Handler for Submitting Basic Vote ---
  const handleSubmitBasicVote = (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralMessage('');

    if (!campaignId) {
      setGeneralMessage('No campaign selected.');
      return;
    }
    if (!campaign) {
       setGeneralMessage('Campaign data unavailable.');
       return;
    }
    if (!campaign.isActive) {
       setGeneralMessage('This campaign is not active for voting.');
       return;
    }
    if (hasVoted) {
      setGeneralMessage('You have already voted in this campaign.');
      return;
    }

    if (selectedBasicChoices.length === 0) {
      setGeneralMessage('Please select at least one option.');
      return;
    }

    // Convert number indices to bigint for the contract call
    const indicesAsBigint = selectedBasicChoices.map(i => BigInt(i));
    handleVoteBasic(indicesAsBigint);
  };

  // --- Handler for Submitting Ballot Vote ---
  const handleSubmitBallotVote = (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralMessage('');

     if (!campaignId) {
      setGeneralMessage('No campaign selected.');
      return;
    }
    if (!campaign) {
       setGeneralMessage('Campaign data unavailable.');
       return;
    }
    if (!campaign.isActive) {
       setGeneralMessage('This campaign is not active for voting.');
       return;
    }
    if (!campaign.isFinalized) {
        setGeneralMessage('This ballot campaign is not yet finalized.');
        return;
    }
    if (hasVoted) {
      setGeneralMessage('You have already voted in this campaign.');
      return;
    }

    // Flatten selected candidate indices from the Record<number, number[]>
    const allSelectedCandidateIndices: number[] = [];
    for (const posIdxStr in selectedBallotChoices) {
        const posIdx = parseInt(posIdxStr, 10);
        const candidatesForPosition = selectedBallotChoices[posIdx];
        if (candidatesForPosition && candidatesForPosition.length > 0) {
            allSelectedCandidateIndices.push(...candidatesForPosition);
        }
    }

    if (allSelectedCandidateIndices.length === 0) {
      setGeneralMessage('Please select at least one candidate.');
      return;
    }

    // Convert candidate indices to bigint for the contract call
    const candidateIdsAsBigint = allSelectedCandidateIndices.map(i => BigInt(i));
    handleVoteBallot(candidateIdsAsBigint);
  };

  // --- Render Logic ---

  // If no campaign is selected, show nothing or a placeholder
  if (campaignId === null) {
    return (
      <div className="voting-interface">
        <h3>Voting</h3>
        <p>Please select an active campaign to vote.</p>
      </div>
    );
  }

   if (isFetchingCampaign) {
      return (
        <div className="voting-interface">
          <h3>Voting (Campaign ID: {campaignId.toString()})</h3>
          <p>Loading campaign data...</p>
        </div>
      );
   }

   if (isCampaignError) {
       console.error("Error fetching campaign:", campaignError);
       return (
        <div className="voting-interface">
          <h3>Voting (Campaign ID: {campaignId.toString()})</h3>
          <p style={{ color: 'red' }}>Error loading campaign data.</p>
        </div>
       );
   }

  // If campaign data is loading or unavailable, show a message
  if (!campaign) {
    return (
      <div className="voting-interface">
        <h3>Voting (Campaign ID: {campaignId.toString()})</h3>
        <p>Campaign data unavailable.</p>
      </div>
    );
  }

  // If user has already voted, show a message
  if (hasVoted) {
    return (
      <div className="voting-interface">
        <h3>Voting (Campaign ID: {campaignId.toString()})</h3>
        <p>You have already cast your vote in this campaign.</p>
        <p>Thank you for participating!</p>
      </div>
    );
  }

  // If campaign is not active, show a message
  if (!campaign.isActive) {
     return (
      <div className="voting-interface">
        <h3>Voting (Campaign ID: {campaignId.toString()})</h3>
        <p>This campaign is not currently active for voting.</p>
      </div>
    );
  }

  // Render Basic Voting Interface
  if (campaign.campaignType === 1) {
    if (isFetchingBasicResults) {
       return (
        <div className="voting-interface">
          <h3>Cast Your Vote - Basic Campaign (ID: {campaignId.toString()})</h3>
          <p><em>Loading choices...</em></p>
        </div>
      );
    }
    if (isBasicResultsError) {
         console.error("Error fetching basic results:", basicResultsError);
         return (
            <div className="voting-interface">
              <h3>Cast Your Vote - Basic Campaign (ID: {campaignId.toString()})</h3>
              <p style={{ color: 'red' }}>Error loading campaign choices.</p>
            </div>
          );
    }

    return (
      <div className="voting-interface">
        <h3>Cast Your Vote - Basic Campaign (ID: {campaignId.toString()})</h3>
        <form onSubmit={handleSubmitBasicVote}>
          <fieldset>
            <legend>Select your choice{isBasicSingleVote ? '' : '(s)'}</legend>
            {basicChoices.length > 0 ? (
              basicChoices.map((choice, index) => {
                const isSelected = selectedBasicChoices.includes(index);
                return (
                  <div key={index}>
                    <label>
                      <input
                        type={isBasicSingleVote ? "radio" : "checkbox"}
                        name="basic-vote" // Group name for radio buttons
                        checked={isSelected}
                        onChange={() => handleBasicChoiceToggle(index)}
                        disabled={hasVoted || isVotingBasic || !campaign.isActive}
                      />
                      {choice}
                    </label>
                  </div>
                );
              })
            ) : (
              <p>No choices available for voting.</p>
            )}
          </fieldset>
          <button type="submit" disabled={hasVoted || isVotingBasic || selectedBasicChoices.length === 0 || !campaign.isActive}>
            {isVotingBasic ? 'Submitting Vote...' : 'Submit Vote'}
          </button>
        </form>

        {/* Status Messages */}
        {generalMessage && <p style={{ color: generalMessage.includes('successfully') ? 'green' : 'orange' }}>{generalMessage}</p>}
        {isVoteBasicError && <p style={{ color: 'red' }}>Error submitting vote: {voteBasicError?.message}</p>}
        {isVoteBasicSuccess && <p style={{ color: 'green' }}>Vote submitted successfully!</p>}
      </div>
    );
  }

  // Render Ballot Voting Interface
  if (campaign.campaignType === 2) {
     if (!campaign.isFinalized) {
         return (
          <div className="voting-interface">
            <h3>Voting (Campaign ID: {campaignId.toString()})</h3>
            <p>This ballot campaign is not yet finalized and is not open for voting.</p>
          </div>
        );
     }

     if (isFetchingBallotResults) {
       return (
        <div className="voting-interface">
          <h3>Cast Your Vote - Ballot Campaign (ID: {campaignId.toString()})</h3>
          <p><em>Loading positions and candidates...</em></p>
        </div>
      );
    }
    if (isBallotResultsError) {
         console.error("Error fetching ballot results:", ballotResultsError);
         return (
            <div className="voting-interface">
              <h3>Cast Your Vote - Ballot Campaign (ID: {campaignId.toString()})</h3>
              <p style={{ color: 'red' }}>Error loading campaign positions/candidates.</p>
            </div>
          );
    }

    return (
      <div className="voting-interface">
        <h3>Cast Your Vote - Ballot Campaign (ID: {campaignId.toString()})</h3>
        <form onSubmit={handleSubmitBallotVote}>
          {ballotPositions.length > 0 ? (
            ballotPositions.map((position, posIndex) => {
              const posIndexNum = Number(posIndex); // Ensure it's a number
              const candidatesForPosition = ballotCandidates.filter(
                cand => Number(cand.positionIndex) === posIndexNum
              );
              const currentSelectionsForPosition = selectedBallotChoices[posIndexNum] || [];
              const isAtMaxSelections = currentSelectionsForPosition.length >= position.maxSelections;

              return (
                <fieldset key={posIndex}>
                  <legend>
                    {/* FIX: Safely handle potential undefined values and ensure correct type comparison */}
                    {position.name} (Select up to {(position.maxSelections ?? 0).toString()} candidate{(position.maxSelections ?? 0n) !== 1n ? 's' : ''})
                  </legend>
                  {candidatesForPosition.length > 0 ? (
                    candidatesForPosition.map((candidate, candIndex) => {
                      // Find the original index in the full ballotCandidates array
                      // This is necessary because selectedBallotChoices uses indices relative to the filtered list
                      // but we need the global index for the contract call
                      const globalCandidateIndex = ballotCandidates.findIndex(
                        c => c.name === candidate.name && c.positionIndex === candidate.positionIndex
                      );
                      const isCandidateSelected = currentSelectionsForPosition.includes(candIndex); // Use local index for UI state

                      return (
                        <div key={candIndex}>
                          <label>
                            <input
                              type="checkbox"
                              checked={isCandidateSelected}
                              onChange={() => handleBallotCandidateToggle(posIndexNum, candIndex)} // Pass local index for UI logic
                              disabled={
                                hasVoted ||
                                isVotingBallot ||
                                !campaign.isActive ||
                                !campaign.isFinalized ||
                                (!isCandidateSelected && isAtMaxSelections) // Disable if at max and trying to select
                              }
                            />
                            {candidate.name}
                          </label>
                        </div>
                      );
                    })
                  ) : (
                    <p>No candidates available for this position.</p>
                  )}
                </fieldset>
              );
            })
          ) : (
            <p>No positions defined for this ballot campaign.</p>
          )}
          <button type="submit" disabled={hasVoted || isVotingBallot || !campaign.isActive || !campaign.isFinalized}>
            {isVotingBallot ? 'Submitting Vote...' : 'Submit Vote'}
          </button>
        </form>

        {/* Status Messages */}
        {generalMessage && <p style={{ color: generalMessage.includes('successfully') ? 'green' : 'orange' }}>{generalMessage}</p>}
        {isVoteBallotError && <p style={{ color: 'red' }}>Error submitting vote: {voteBallotError?.message}</p>}
        {isVoteBallotSuccess && <p style={{ color: 'green' }}>Vote submitted successfully!</p>}
      </div>
    );
  }

  // Fallback if campaign type is somehow unrecognized
  return (
    <div className="voting-interface">
      <h3>Voting (Campaign ID: {campaignId.toString()})</h3>
      <p>Unable to determine the active campaign type.</p>
    </div>
  );
};

export default VotingInterface;

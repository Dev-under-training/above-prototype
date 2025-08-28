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
    voteStatusError,
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
    ballotCandidates, // This is the key data: Array of all candidates with name & positionIndex
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
  const [selectedBasicChoices, setSelectedBasicChoices] = useState<number[]>([]); // Stores indices in basicChoices array

  // --- State for Ballot Voting ---
  // Key Change: Store selected global candidate IDs (from ballotCandidates array)
  // This is a Set for efficient lookup and automatic deduplication
  const [selectedGlobalCandidateIds, setSelectedGlobalCandidateIds] = useState<Set<number>>(new Set());

  // --- State for General Messages ---
  const [generalMessage, setGeneralMessage] = useState<string>('');

  // --- Effect to handle successful vote submission ---
  useEffect(() => {
    if (isVoteBasicSuccess || isVoteBallotSuccess) {
      setGeneralMessage('Vote submitted successfully!');
      // Clear selections
      setSelectedBasicChoices([]);
      setSelectedGlobalCandidateIds(new Set()); // Clear ballot selections
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
  // Key Change: This handler now works with global candidate IDs
  const handleBallotCandidateToggle = (globalCandidateId: number) => {
    if (!campaignId || !campaign || !campaign.isActive || !campaign.isFinalized || hasVoted || isVotingBallot) return;

    setSelectedGlobalCandidateIds(prevSelectedIds => {
      const newSelectedIds = new Set(prevSelectedIds);
      if (newSelectedIds.has(globalCandidateId)) {
        // Deselect: Remove the ID from the set
        newSelectedIds.delete(globalCandidateId);
      } else {
        // Select: Add the ID to the set
        newSelectedIds.add(globalCandidateId);
      }
      return newSelectedIds;
    });
    setGeneralMessage(''); // Clear any previous message
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

    // Key Change: Prepare the list of selected global candidate IDs
    const selectedIdsArray = Array.from(selectedGlobalCandidateIds);
    if (selectedIdsArray.length === 0) {
      setGeneralMessage('Please select at least one candidate.');
      return;
    }

    // Convert global candidate indices to bigint for the contract call
    const candidateIdsAsBigint = selectedIdsArray.map(i => BigInt(i));
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
  // Check if it's a valid Basic campaign (type 1) and has choices
  if (campaign.campaignType === 1 && basicChoices.length > 0) {
    // Assume basic campaign data is available if choices exist

    if (isFetchingBasicResults) {
       return (
        <div className="voting-interface">
          <h3>Cast Your Vote - Basic Campaign (ID: {campaignId.toString()})</h3>
          <p><em>Loading choices...</em></p>
        </div>
      );
    }
    if(isBasicResultsError) {
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
            {basicChoices.map((choice, index) => {
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
            })}
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
  // Check if it's a valid Ballot campaign (type 2) and is finalized
  if (campaign.campaignType === 2 && campaign.isFinalized) {
     // Assume ballot campaign data is available if campaign is finalized

     if (isFetchingBallotResults) {
       return (
        <div className="voting-interface">
          <h3>Cast Your Vote - Ballot Campaign (ID: {campaignId.toString()})</h3>
          <p><em>Loading positions and candidates...</em></p>
        </div>
      );
    }
    if(isBallotResultsError) {
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
          {ballotPositions.map((position, posIndex) => {
            const posIndexNum = Number(posIndex); // Ensure it's a number
            // Filter candidates belonging to this specific position
            const candidatesForPosition = ballotCandidates.filter(
              cand => Number(cand.positionIndex) === posIndexNum
            );

            // --- Enforce maxSelections ---
            // Count how many selected candidates belong to this position
            const selectedCountForThisPosition = Array.from(selectedGlobalCandidateIds).filter(selectedId => {
                 const candidate = ballotCandidates[selectedId];
                 return candidate && Number(candidate.positionIndex) === posIndexNum;
            }).length;
            const isAtMaxSelections = selectedCountForThisPosition >= position.maxSelections;
            // --- End Enforce maxSelections ---

            return (
              <fieldset key={posIndex}>
                <legend>
                  {/* Fix: Ensure correct type for comparison and display */}
                  {(() => {
                    // Explicitly convert to bigint for safe comparison and display
                    const maxSelectionsBigint = BigInt(position.maxSelections);
                    return (
                      <>
                        {position.name} (Select up to {maxSelectionsBigint.toString()} candidate{maxSelectionsBigint !== 1n ? 's' : ''})
                      </>
                    );
                  })()}
                </legend>
                {candidatesForPosition.length > 0 ? (
                  candidatesForPosition.map((candidate, candIndex) => {
                    // Key Change: Use the global index from the original ballotCandidates array
                    // Find the original global index of this candidate
                    const globalCandidateIndex = ballotCandidates.findIndex(
                       c => c.name === candidate.name && c.positionIndex === candidate.positionIndex
                    );
                    // Check if this specific candidate is selected
                    const isCandidateSelected = selectedGlobalCandidateIds.has(globalCandidateIndex);

                    return (
                      <div key={globalCandidateIndex}> {/* Use global index as key */}
                        <label>
                          <input
                            type="checkbox"
                            checked={isCandidateSelected}
                            // Pass the global ID to the handler
                            onChange={() => handleBallotCandidateToggle(globalCandidateIndex)}
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
          })}
          <button type="submit" disabled={hasVoted || isVotingBallot || !campaign.isActive || !campaign.isFinalized || selectedGlobalCandidateIds.size === 0}>
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

  // Fallback if campaign type is somehow unrecognized or data is missing/empty
  return (
    <div className="voting-interface">
      <h3>Voting (Campaign ID: {campaignId.toString()})</h3>
      <p>Campaign data is incomplete or type is unrecognized.</p>
      {/* Optionally display more details for debugging */}
    </div>
  );
};

export default VotingInterface;

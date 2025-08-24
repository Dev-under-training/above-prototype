// src/components/VotingInterface.tsx
import React, { useState, useEffect } from 'react';
import { useABOVEBallot } from '../hooks/useABOVEBallot';

const VotingInterface: React.FC = () => {
  const {
    currentCampaignType,
    isBasicCampaignSet,
    isBasicSingleVote,
    basicChoices,
    // isFetchingBasicResults, // Might be useful for loading state
    isBallotCampaignFinalized,
    ballotPositions,
    ballotCandidates,
    // isFetchingBallotResults, // Might be useful for loading state
    hasVoted,
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
    // --- Refetch Functions (Potentially useful for real-time updates) ---
    // refetchBasicResults, // Assuming your hook exposes these or you use queryClient
    // refetchBallotResults,
  } = useABOVEBallot();

  // --- State for Basic Voting ---
  const [selectedBasicChoices, setSelectedBasicChoices] = useState<number[]>([]);

  // --- State for Ballot Voting ---
  // Key: position index (number), Value: array of selected candidate indices (numbers) for that position
  const [selectedBallotChoices, setSelectedBallotChoices] = useState<Record<number, number[]>>({});

  // --- State for General Messages ---
  const [generalMessage, setGeneralMessage] = useState<string>('');

  // --- Effect to handle successful vote submission ---
  // This can trigger UI updates or data refetching
  useEffect(() => {
    if (isVoteBasicSuccess || isVoteBallotSuccess) {
      // Optionally, show a success message
      setGeneralMessage('Vote submitted successfully!');
      // Clear selections
      setSelectedBasicChoices([]);
      setSelectedBallotChoices({});
      // Invalidate/Refetch queries related to results to update the display
      // This depends on how your useABOVEBallot hook is set up.
      // Example using queryClient (requires importing it):
      /*
      queryClient.invalidateQueries({ queryKey: ['aboveBallot', 'getBasicResults'] });
      queryClient.invalidateQueries({ queryKey: ['aboveBallot', 'getBallotResults'] });
      queryClient.invalidateQueries({ queryKey: ['aboveBallot', 'totalVotesCast'] });
      queryClient.invalidateQueries({ queryKey: ['aboveBallot', 'hasVoted'] }); // If needed
      */
      // Or, if your hook exposes refetch functions:
      // refetchBasicResults?.();
      // refetchBallotResults?.();
    }
  }, [isVoteBasicSuccess, isVoteBallotSuccess]); // Dependencies

  // --- Handler for Basic Voting Selection ---
  const handleBasicChoiceToggle = (index: number) => {
    if (hasVoted) return; // Prevent changes if already voted

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
    if (hasVoted) return; // Prevent changes if already voted

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
        if (currentSelections.length >= position.maxSelections) {
          setGeneralMessage(`You can only select up to ${position.maxSelections} candidate(s) for ${position.name}.`);
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

    if (hasVoted) {
      setGeneralMessage('You have already voted.');
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

    if (hasVoted) {
      setGeneralMessage('You have already voted.');
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

  // If no campaign is set or not finalized, show nothing or a placeholder
  if ((!isBasicCampaignSet && !isBallotCampaignFinalized) || currentCampaignType === 0) {
    return (
      <div className="voting-interface">
        <h3>Voting</h3>
        <p>No active voting campaign is available at this time.</p>
      </div>
    );
  }

  // If user has already voted, show a message
  if (hasVoted) {
    return (
      <div className="voting-interface">
        <h3>Voting</h3>
        <p>You have already cast your vote in this campaign.</p>
        <p>Thank you for participating!</p>
      </div>
    );
  }

  // Render Basic Voting Interface
  if (currentCampaignType === 1 && isBasicCampaignSet) {
    return (
      <div className="voting-interface">
        <h3>Cast Your Vote - Basic Campaign</h3>
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
                      disabled={hasVoted || isVotingBasic}
                    />
                    {choice}
                  </label>
                </div>
              );
            })}
          </fieldset>
          <button type="submit" disabled={hasVoted || isVotingBasic || selectedBasicChoices.length === 0}>
            {isVotingBasic ? 'Submitting Vote...' : 'Submit Vote'}
          </button>
        </form>

        {/* Status Messages */}
        {generalMessage && <p style={{ color: 'orange' }}>{generalMessage}</p>}
        {isVoteBasicError && <p style={{ color: 'red' }}>Error submitting vote: {voteBasicError?.message}</p>}
        {isVoteBasicSuccess && <p style={{ color: 'green' }}>Vote submitted successfully!</p>}
      </div>
    );
  }

  // Render Ballot Voting Interface
  if (currentCampaignType === 2 && isBallotCampaignFinalized) {
    return (
      <div className="voting-interface">
        <h3>Cast Your Vote - Ballot Campaign</h3>
        <form onSubmit={handleSubmitBallotVote}>
          {ballotPositions.map((position, posIndex) => {
            const posIndexNum = Number(posIndex); // Ensure it's a number
            const candidatesForPosition = ballotCandidates.filter(
              cand => Number(cand.positionIndex) === posIndexNum
            );
            const currentSelectionsForPosition = selectedBallotChoices[posIndexNum] || [];
            const isAtMaxSelections = currentSelectionsForPosition.length >= position.maxSelections;

            return (
              <fieldset key={posIndex}>
                <legend>
                  {position.name} (Select up to {position.maxSelections} candidate{position.maxSelections !== 1 ? 's' : ''})
                </legend>
                {candidatesForPosition.length > 0 ? (
                  candidatesForPosition.map((candidate) => {
                    const candIndexNum = ballotCandidates.findIndex(
                      c => c.name === candidate.name && c.positionIndex === candidate.positionIndex
                    );
                    const isCandidateSelected = currentSelectionsForPosition.includes(candIndexNum);

                    return (
                      <div key={candIndexNum}>
                        <label>
                          <input
                            type="checkbox"
                            checked={isCandidateSelected}
                            onChange={() => handleBallotCandidateToggle(posIndexNum, candIndexNum)}
                            disabled={
                              hasVoted ||
                              isVotingBallot ||
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
          <button type="submit" disabled={hasVoted || isVotingBallot}>
            {isVotingBallot ? 'Submitting Vote...' : 'Submit Vote'}
          </button>
        </form>

        {/* Status Messages */}
        {generalMessage && <p style={{ color: 'orange' }}>{generalMessage}</p>}
        {isVoteBallotError && <p style={{ color: 'red' }}>Error submitting vote: {voteBallotError?.message}</p>}
        {isVoteBallotSuccess && <p style={{ color: 'green' }}>Vote submitted successfully!</p>}
      </div>
    );
  }

  // Fallback if campaign type is somehow unrecognized
  return (
    <div className="voting-interface">
      <h3>Voting</h3>
      <p>Unable to determine the active campaign type.</p>
    </div>
  );
};

export default VotingInterface;
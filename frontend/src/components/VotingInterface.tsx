// frontend/src/components/VotingInterface.tsx
import React, { useState, useEffect } from 'react';
import { useABOVEBallot } from '../hooks/useABOVEBallot';

interface VotingInterfaceProps {
  campaignId: bigint | null;
}

const VotingInterface: React.FC<VotingInterfaceProps> = ({ campaignId }) => {
  const {
    campaign,
    hasVoted,
    isCheckingVoteStatus,
    isVoteStatusError,
    voteStatusError,
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
    ballotResultsError,
  } = useABOVEBallot(campaignId);

  const [selectedBasicChoices, setSelectedBasicChoices] = useState<number[]>([]);
  const [selectedGlobalCandidateIds, setSelectedGlobalCandidateIds] = useState<Set<number>>(new Set());
  const [generalMessage, setGeneralMessage] = useState<string>('');

  useEffect(() => {
    if (isVoteBasicSuccess || isVoteBallotSuccess) {
      setGeneralMessage('Vote submitted successfully!');
      setSelectedBasicChoices([]);
      setSelectedGlobalCandidateIds(new Set());
    }
  }, [isVoteBasicSuccess, isVoteBallotSuccess]);

  const handleBasicChoiceToggle = (index: number) => {
    if (!campaignId || !campaign || !campaign.isFinalized || hasVoted || isVotingBasic) return;

    if (isBasicSingleVote) {
      setSelectedBasicChoices([index]);
    } else {
      setSelectedBasicChoices(prev => {
        if (prev.includes(index)) {
          return prev.filter(i => i !== index);
        } else {
          return [...prev, index];
        }
      });
    }
  };

  const handleBallotCandidateToggle = (globalCandidateId: number) => {
    if (!campaignId || !campaign || !campaign.isFinalized || hasVoted || isVotingBallot) return;

    setSelectedGlobalCandidateIds(prevSelectedIds => {
      const newSelectedIds = new Set(prevSelectedIds);
      if (newSelectedIds.has(globalCandidateId)) {
        newSelectedIds.delete(globalCandidateId);
      } else {
        newSelectedIds.add(globalCandidateId);
      }
      return newSelectedIds;
    });
    setGeneralMessage('');
  };

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
    if (!campaign.isFinalized) {
       setGeneralMessage('This campaign is not yet finalized for voting.');
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

    const indicesAsBigint = selectedBasicChoices.map(i => BigInt(i));
    handleVoteBasic(indicesAsBigint);
  };

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
    if (!campaign.isFinalized) {
       setGeneralMessage('This campaign is not yet finalized for voting.');
       return;
    }
    if (hasVoted) {
      setGeneralMessage('You have already voted in this campaign.');
      return;
    }

    const selectedIdsArray = Array.from(selectedGlobalCandidateIds);
    if (selectedIdsArray.length === 0) {
      setGeneralMessage('Please select at least one candidate.');
      return;
    }

    const candidateIdsAsBigint = selectedIdsArray.map(i => BigInt(i));
    handleVoteBallot(candidateIdsAsBigint);
  };

  if (campaignId === null) {
    return (
      <div className="voting-interface">
        <h3>Voting</h3>
        <p>Please select a campaign to vote.</p>
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

  if (!campaign) {
    return (
      <div className="voting-interface">
        <h3>Voting (Campaign ID: {campaignId.toString()})</h3>
        <p>Campaign data unavailable.</p>
      </div>
    );
  }

  if (hasVoted) {
    return (
      <div className="voting-interface">
        <h3>Voting (Campaign ID: {campaignId.toString()})</h3>
        <p>You have already cast your vote in this campaign.</p>
        <p>Thank you for participating!</p>
      </div>
    );
  }

  // Check if the campaign is finalized for voting
  if (!campaign.isFinalized) {
     return (
      <div className="voting-interface">
        <h3>Voting (Campaign ID: {campaignId.toString()})</h3>
        <p>This campaign is not yet finalized for voting.</p>
      </div>
    );
  }

  if (campaign.campaignType === 1 && basicChoices.length > 0) {
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
                      name="basic-vote"
                      checked={isSelected}
                      onChange={() => handleBasicChoiceToggle(index)}
                      disabled={hasVoted || isVotingBasic || !campaign.isFinalized}
                    />
                    {choice}
                  </label>
                </div>
              );
            })}
          </fieldset>
          <button type="submit" disabled={hasVoted || isVotingBasic || selectedBasicChoices.length === 0 || !campaign.isFinalized}>
            {isVotingBasic ? 'Submitting Vote...' : 'Submit Vote'}
          </button>
        </form>

        {generalMessage && <p style={{ color: generalMessage.includes('successfully') ? 'green' : 'orange' }}>{generalMessage}</p>}
        {isVoteBasicError && <p style={{ color: 'red' }}>Error submitting vote: {voteBasicError?.message}</p>}
        {isVoteBasicSuccess && <p style={{ color: 'green' }}>Vote submitted successfully!</p>}
      </div>
    );
  }

  if (campaign.campaignType === 2 && campaign.isFinalized) {
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
            const posIndexNum = Number(posIndex);
            const candidatesForPosition = ballotCandidates.filter(
              cand => Number(cand.positionIndex) === posIndexNum
            );

            const selectedCountForThisPosition = Array.from(selectedGlobalCandidateIds).filter(selectedId => {
                 const candidate = ballotCandidates[selectedId];
                 return candidate && Number(candidate.positionIndex) === posIndexNum;
            }).length;
            const isAtMaxSelections = selectedCountForThisPosition >= position.maxSelections;

            return (
              <fieldset key={posIndex}>
                <legend>
                  {(() => {
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
                    const globalCandidateIndex = ballotCandidates.findIndex(
                       c => c.name === candidate.name && c.positionIndex === candidate.positionIndex
                    );
                    const isCandidateSelected = selectedGlobalCandidateIds.has(globalCandidateIndex);

                    return (
                      <div key={globalCandidateIndex}>
                        <label>
                          <input
                            type="checkbox"
                            checked={isCandidateSelected}
                            onChange={() => handleBallotCandidateToggle(globalCandidateIndex)}
                            disabled={
                              hasVoted ||
                              isVotingBallot ||
                              !campaign.isFinalized ||
                              !campaign.isFinalized ||
                              (!isCandidateSelected && isAtMaxSelections)
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
          <button type="submit" disabled={hasVoted || isVotingBallot || !campaign.isFinalized || !campaign.isFinalized || selectedGlobalCandidateIds.size === 0}>
            {isVotingBallot ? 'Submitting Vote...' : 'Submit Vote'}
          </button>
        </form>

        {generalMessage && <p style={{ color: generalMessage.includes('successfully') ? 'green' : 'orange' }}>{generalMessage}</p>}
        {isVoteBallotError && <p style={{ color: 'red' }}>Error submitting vote: {voteBallotError?.message}</p>}
        {isVoteBallotSuccess && <p style={{ color: 'green' }}>Vote submitted successfully!</p>}
      </div>
    );
  }

  return (
    <div className="voting-interface">
      <h3>Voting (Campaign ID: {campaignId.toString()})</h3>
      <p>Campaign data is incomplete or type is unrecognized.</p>
    </div>
  );
};

export default VotingInterface;
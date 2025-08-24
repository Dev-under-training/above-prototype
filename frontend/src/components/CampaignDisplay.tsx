// src/components/CampaignDisplay.tsx
import React from 'react';
import { useABOVEBallot } from '../hooks/useABOVEBallot';

/**
 * Component to display the details of the currently active voting campaign.
 */
const CampaignDisplay: React.FC = () => {
  const {
    currentCampaignType,
    isBasicCampaignSet,
    isBasicSingleVote,
    basicChoices,
    basicVotes,
    isBallotCampaignFinalized,
    ballotPositions,
    ballotCandidates,
    ballotCandidateVotes,
    hasVoted,
  } = useABOVEBallot();

  // Helper function to format the vote count
  const formatVoteCount = (votes: bigint): string => {
    return votes.toString();
  };

  if (!isBasicCampaignSet && !isBallotCampaignFinalized) {
    return (
      <div className="campaign-display">
        <h3>Campaign Setup</h3>
        <p>No active campaign has been set up yet.</p>
      </div>
    );
  }

  if (currentCampaignType === 1 && isBasicCampaignSet) {
    // Basic Campaign Display
    return (
      <div className="campaign-display">
        <h3>Basic Voting Campaign</h3>
        <p><strong>Type:</strong> {isBasicSingleVote ? 'Single Vote' : 'Multiple Selections'}</p>
        <table className="choices-table">
          <thead>
            <tr>
              <th>Choice</th>
              <th>Votes</th>
            </tr>
          </thead>
          <tbody>
            {basicChoices.map((choice, index) => {
              // Ensure index is within bounds for basicVotes
              const voteCount = index < basicVotes.length ? basicVotes[index] : 0n;
              return (
                <tr key={index}>
                  <td>{choice}</td>
                  <td>{formatVoteCount(voteCount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {/* Add a button to cast a vote here later */}
      </div>
    );
  }

  if (currentCampaignType === 2 && isBallotCampaignFinalized) {
    // Ballot Campaign Display
    return (
      <div className="campaign-display">
        <h3>Ballot Type Voting Campaign</h3>
        <p><strong>Status:</strong> Finalized</p>
        <h4>Positions & Candidates</h4>
        <ul className="positions-list">
          {ballotPositions.map((position, posIndex) => {
            // Ensure maxSelections is treated as a bigint for comparison
            // Convert posIndex (number) to bigint for comparison with position fields (bigint)
            const maxSelectionsBigint = BigInt(position.maxSelections);
            const posIndexBigInt = BigInt(posIndex);
            return (
              <li key={posIndex}>
                {/* Use .toString() for bigint display and 1n for bigint comparison */}
                <strong>{position.name}</strong> (Max {maxSelectionsBigint.toString()} selection{maxSelectionsBigint !== 1n ? 's' : ''})
                <ul className="candidates-list">
                  {ballotCandidates
                    .filter(cand => cand.positionIndex === posIndexBigInt) // Compare bigints
                    .map((candidate, candIndex) => {
                      // Find the original index in the full ballotCandidates array
                      // This is necessary because ballotCandidateVotes corresponds to the full array indices
                      const originalCandidateIndex = ballotCandidates.findIndex(
                        (c) => c.name === candidate.name && c.positionIndex === candidate.positionIndex
                      );
                      // Get vote count using the original index, defaulting to 0n if not found or out of bounds
                      const votesForCandidate =
                        originalCandidateIndex !== -1 && originalCandidateIndex < ballotCandidateVotes.length
                          ? ballotCandidateVotes[originalCandidateIndex]
                          : 0n;

                      return (
                        <li key={candIndex}>
                          {candidate.name}
                          <span className="vote-count"> ({formatVoteCount(votesForCandidate)} votes)</span>
                        </li>
                      );
                    })}
                </ul>
              </li>
            );
          })}
        </ul>
        {/* Add a button to cast a vote here later */}
      </div>
    );
  }

  return (
    <div className="campaign-display">
      <h3>Campaign Status</h3>
      <p>An unknown or inactive campaign type is active.</p>
    </div>
  );
};

export default CampaignDisplay;
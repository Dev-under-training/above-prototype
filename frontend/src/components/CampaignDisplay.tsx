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
    // --- NEW: Destructure description data ---
    campaignDescription,
    isFetchingDescription,
    isDescriptionError,
    descriptionError,
    // --- END NEW ---
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

  // --- NEW: Render Description if available ---
  const renderDescription = () => {
    if (isFetchingDescription) {
      return <p><em>Loading description...</em></p>;
    }
    if (isDescriptionError) {
      // Optionally log the error or show a less detailed message
      console.error("Error fetching campaign description:", descriptionError);
      // return <p><em>Error loading description.</em></p>; // Uncomment if you want to show an error message in UI
      return null; // Or just don't show anything if there's an error fetching
    }
    if (campaignDescription && campaignDescription.trim() !== '') {
      return (
        <div className="campaign-description">
          <h4>About this Campaign:</h4>
          <p>{campaignDescription}</p>
        </div>
      );
    }
    return null; // Don't render anything if description is empty or null
  };
  // --- END NEW ---

  if (currentCampaignType === 1 && isBasicCampaignSet) {
    // Basic Campaign Display
    return (
      <div className="campaign-display">
        <h3>Basic Voting Campaign</h3>
        {/* --- NEW: Render Description --- */}
        {renderDescription()}
        {/* --- END NEW --- */}
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
        {/* --- NEW: Render Description --- */}
        {renderDescription()}
        {/* --- END NEW --- */}
        <p><strong>Status:</strong> Finalized</p>
        <h4>Positions & Candidates</h4>
        <ul className="positions-list">
          {ballotPositions.map((position, posIndex) => {
            // Convert posIndex (number) to bigint for comparison with position fields (bigint)
            const posIndexBigInt = BigInt(posIndex);
            // Explicitly convert maxSelections to string for display and bigint for comparison
            const maxSelectionsBigint = BigInt(position.maxSelections); // Convert to bigint
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
                      // Get vote count using the original index, defaulting to 0n if not found
                      const votesForCandidate = originalCandidateIndex !== -1 && originalCandidateIndex < ballotCandidateVotes.length
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
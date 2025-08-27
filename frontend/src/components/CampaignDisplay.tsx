// frontend/src/components/CampaignDisplay.tsx
import React from 'react';
import { useABOVEBallot } from '../hooks/useABOVEBallot';
// Import the CampaignType if you still want to use it, otherwise remove this line and the type annotation below
// Make sure the path is correct relative to THIS file's location
import type { CampaignType } from '../hooks/useABOVEBallot'; // Import the type

/**
 * Props for the CampaignDisplay component.
 */
interface CampaignDisplayProps {
  campaignId: bigint | null; // Accept campaignId as a prop
}

/**
 * Component to display the details of a specific voting campaign.
 * @param campaignId The ID of the campaign to display. If null, a placeholder is shown.
 */
const CampaignDisplay: React.FC<CampaignDisplayProps> = ({ campaignId }) => {
  // Pass the campaignId to the hook
  const {
    campaign, // This is the metadata fetched by getCampaign
    isFetchingCampaign,
    isCampaignError,
    campaignError,
    isBasicSingleVote, // Fetched based on campaign type and ID
    basicChoices, // Fetched based on campaign type and ID
    basicVotes, // Fetched based on campaign type and ID
    ballotPositions, // Fetched based on campaign type and ID
    ballotCandidates, // Fetched based on campaign type and ID
    ballotCandidateVotes, // Fetched based on campaign type and ID
    isFetchingBasicResults,
    isFetchingBallotResults,
    isBasicResultsError,
    isBallotResultsError,
    basicResultsError,
    ballotResultsError,
  } = useABOVEBallot(campaignId); // Pass campaignId to the hook

  // Helper function to format the vote count
  const formatVoteCount = (votes: bigint): string => {
    return votes.toString();
  };

  // --- Loading and Error States ---
  if (campaignId === null) {
    return (
      <div className="campaign-display">
        <h3>Campaign Display</h3>
        <p>Please select a campaign to view details.</p>
      </div>
    );
  }

  if (isFetchingCampaign) {
    return (
      <div className="campaign-display">
        <h3>Campaign Display</h3>
        <p><em>Loading campaign details...</em></p>
      </div>
    );
  }

  if (isCampaignError) {
    console.error("Error fetching campaign:", campaignError);
    return (
      <div className="campaign-display">
        <h3>Campaign Display</h3>
        <p style={{ color: 'red' }}>Error loading campaign details.</p>
        {/* Optionally display error.message if available and safe */}
      </div>
    );
  }

  if (!campaign) {
     // This case handles if campaignId was valid but getCampaign returned nothing unexpected
     return (
      <div className="campaign-display">
        <h3>Campaign Display</h3>
        <p>Campaign data not found.</p>
      </div>
    );
  }

  // --- Render Campaign Details ---

  // --- Render Description ---
  const renderDescription = () => {
    const description = campaign.description;
    if (description && description.trim() !== '') {
      return (
        <div className="campaign-description">
          <h4>About this Campaign:</h4>
          <p>{description}</p>
        </div>
      );
    }
    return <p><em>No description provided.</em></p>;
  };

  // --- Render Based on Campaign Type ---
  if (campaign.campaignType === 1) { // Basic Campaign
    // Check if results are being fetched or errored specifically for this type
    if (isFetchingBasicResults) {
       return (
        <div className="campaign-display">
          <h3>Basic Voting Campaign (ID: {campaignId.toString()})</h3>
          {renderDescription()}
          <p><em>Loading results...</em></p>
        </div>
      );
    }
    if(isBasicResultsError) {
         console.error("Error fetching basic results:", basicResultsError);
         return (
            <div className="campaign-display">
              <h3>Basic Voting Campaign (ID: {campaignId.toString()})</h3>
              {renderDescription()}
              <p style={{ color: 'red' }}>Error loading basic campaign results.</p>
            </div>
          );
    }

    return (
      <div className="campaign-display">
        <h3>Basic Voting Campaign (ID: {campaignId.toString()})</h3>
        {renderDescription()}
        <p><strong>Status:</strong> {campaign.isFinalized ? 'Finalized' : (campaign.isActive ? 'Active' : 'Inactive')}</p>
        <p><strong>Type:</strong> {isBasicSingleVote ? 'Single Vote' : 'Multiple Selections'}</p>
        <h4>Choices & Votes:</h4>
        <table className="choices-table">
          <thead>
            <tr>
              <th>Choice</th>
              <th>Votes</th>
            </tr>
          </thead>
          <tbody>
            {basicChoices.length > 0 ? (
              basicChoices.map((choice: string, index: number) => { // <-- Explicit types added here
                // Ensure index is within bounds for basicVotes
                const voteCount = index < basicVotes.length ? basicVotes[index] : 0n;
                return (
                  <tr key={index}>
                    <td>{choice}</td>
                    <td>{formatVoteCount(voteCount)}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={2}>No choices available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  if (campaign.campaignType === 2) { // Ballot Campaign
    // Check if results are being fetched or errored specifically for this type
     if (isFetchingBallotResults) {
       return (
        <div className="campaign-display">
          <h3>Ballot Type Voting Campaign (ID: {campaignId.toString()})</h3>
          {renderDescription()}
          <p><em>Loading results...</em></p>
        </div>
      );
    }
    if(isBallotResultsError) {
         console.error("Error fetching ballot results:", ballotResultsError);
         return (
            <div className="campaign-display">
              <h3>Ballot Type Voting Campaign (ID: {campaignId.toString()})</h3>
              {renderDescription()}
              <p style={{ color: 'red' }}>Error loading ballot campaign results.</p>
            </div>
          );
    }

    return (
      <div className="campaign-display">
        <h3>Ballot Type Voting Campaign (ID: {campaignId.toString()})</h3>
        {renderDescription()}
        <p><strong>Status:</strong> {campaign.isFinalized ? 'Finalized' : (campaign.isActive ? 'Active' : 'Inactive')}</p>
        <h4>Positions & Candidates</h4>
        <ul className="positions-list">
          {ballotPositions.length > 0 ? (
            ballotPositions.map((position: { name: string; maxSelections: bigint; candidateCount: bigint; }, posIndex: number) => { // <-- Explicit types added here
              // Convert posIndex (number) to bigint for comparison with position fields (bigint)
              const posIndexBigInt = BigInt(posIndex);
              // Explicitly convert maxSelections to bigint for comparison
              const maxSelectionsBigint = position.maxSelections; // Already bigint from hook
              return (
                <li key={posIndex}>
                  {/* Use .toString() for bigint display */}
                  <strong>{position.name}</strong> (Max {maxSelectionsBigint.toString()} selection{maxSelectionsBigint !== 1n ? 's' : ''})
                  <ul className="candidates-list">
                    {ballotCandidates
                      .filter((cand: { positionIndex: bigint; name: string; }) => cand.positionIndex === posIndexBigInt) // <-- Explicit type added here
                      .map((candidate: { name: string; positionIndex: bigint; }, candIndex: number) => { // <-- Explicit types added here
                        // Find the original index in the full ballotCandidates array
                        // This is necessary because ballotCandidateVotes corresponds to the full array indices
                        const originalCandidateIndex = ballotCandidates.findIndex(
                          (c: { name: string; positionIndex: bigint; }) => c.name === candidate.name && c.positionIndex === candidate.positionIndex // <-- Explicit type added here
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
            })
          ) : (
            <li>No positions defined.</li>
          )}
        </ul>
      </div>
    );
  }

  // Handle Undefined or unexpected campaign type
  return (
    <div className="campaign-display">
      <h3>Campaign Details (ID: {campaignId.toString()})</h3>
      {renderDescription()}
      <p><strong>Status:</strong> {campaign.isFinalized ? 'Finalized' : (campaign.isActive ? 'Active' : 'Inactive')}</p>
      <p>Unknown or inactive campaign type.</p>
    </div>
  );
};

export default CampaignDisplay;
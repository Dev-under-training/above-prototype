// frontend/src/components/CampaignDisplay.tsx
import React from 'react';
import { useABOVEBallot } from '../hooks/useABOVEBallot';
// Import specific types if needed and if they are exported from the hook
// import type { Position, Candidate } from '../hooks/useABOVEBallot';

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
    ballotPositions, // Fetched based on campaign type and ID (type Position[])
    ballotCandidates, // Fetched based on campaign type and ID (type Candidate[])
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
              basicChoices.map((choice, index) => { // Let TypeScript infer or use string if needed
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
            ballotPositions.map((position, posIndex) => { // Use the Position type from hook, let TS infer types for callback params
              // Convert posIndex (number) to bigint for comparison with position fields (bigint)
              const posIndexBigInt = BigInt(posIndex);
              // Access maxSelections. If the hook returns it as number, use it directly for display/comparison.
              // If you are sure it's bigint from the contract/hook, convert it. Let's assume hook provides correct type.
              // The key is consistency with how the hook types it.
              // For display and comparison with numbers (like 1), convert if necessary.
              // Let's assume the hook correctly types it based on ABI. If ABI says uint8, viem often maps to number.
              const maxSelectionsValue = position.maxSelections; // This should be number or bigint based on hook
              // To compare with 1 (number), if maxSelectionsValue is bigint, compare with 1n
              // If maxSelectionsValue is number, compare with 1
              // Let's use a safe comparison by converting to BigInt if needed, or assume hook handles it.
              // For now, let's assume the hook returns it correctly typed. If error persists, cast explicitly.
              // Example safe cast: const maxSelBigint = BigInt(maxSelectionsValue);
              return (
                <li key={posIndex}>
                  {/* Use .toString() for display, ensure correct type comparison */}
                  <strong>{position.name}</strong> (Max {maxSelectionsValue.toString()} selection{maxSelectionsValue !== 1 ? 's' : ''}) {/* Compare with 1 or 1n based on type */}
                  <ul className="candidates-list">
                    {ballotCandidates
                      .filter((cand) => cand.positionIndex === posIndexBigInt) // Compare bigints
                      .map((candidate, candIndex) => { // Let TS infer types
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

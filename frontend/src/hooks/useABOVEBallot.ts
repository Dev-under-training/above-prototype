// frontend/src/hooks/useABOVEBallot.ts
import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { CONTRACT_ADDRESSES, ABOVE_BALLOT_ABI } from '../contracts/contractConfig';
// Import specific types from viem if needed for better typing, but avoid 'any'
import type { Address } from 'viem'; // Safer import for Address type

// --- Define TypeScript types for complex contract structures ---
// These should ideally match your Solidity structs as closely as possible.
type Position = {
  name: string;
  maxSelections: number; // Maps to uint8 in Solidity
  candidateCount: bigint; // Maps to uint256
  // Add other fields from the Solidity struct if needed
  [key: string]: any; // Catch-all for potential ABI mismatch
};

type Candidate = {
  name: string;
  positionIndex: bigint; // uint256
  // Add other fields from the Solidity struct if needed
  [key: string]: any;
};

// Define the Campaign type to match the Solidity struct
type Campaign = {
  id: bigint; // uint256
  campaignType: 0 | 1 | 2; // CampaignType enum (0: Undefined, 1: Basic, 2: Ballot) // uint8
  description: string; // string
  isActive: boolean; // bool
  isFinalized: boolean; // bool
  createdAt: bigint; // uint256
  finalizedAt: bigint; // uint256
  creator: Address; // address - Add the creator field
  [key: string]: any; // Catch-all for potential ABI mismatch
};

// Enum values from Solidity (0: Undefined, 1: Basic, 2: Ballot)
// Using a union type for better type safety where possible
// type CampaignType = 0 | 1 | 2; // Defined inline above as part of Campaign type

/**
 * Custom hook for interacting with the ABOVEBallot contract.
 * Provides functions to get campaign info, check vote status, cast votes, and manage campaigns.
 * This version aims for better compatibility with TypeScript/Viem/Wagmi typing.
 * Includes logic to fetch the contract owner.
 * Integrates with the native ABOVE token for fees and rewards.
 * Supports decentralized campaign creation and management.
 * Voter eligibility is simplified for testnet (must hold ABOVE tokens).
 * Introduces an 'endCampaign' function for formal conclusion and result recording.
 */
export const useABOVEBallot = (campaignId: bigint | null) => {
  const { address: userAddress } = useAccount();

  // --- Read Functions ---

  // --- NEW: Fetch Contract Owner Address ---
  const {
    data: contractOwnerData,
    isLoading: isFetchingOwner,
    isError: isOwnerError,
    error: ownerError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveBallot,
    abi: ABOVE_BALLOT_ABI,
    functionName: 'owner', // This is the standard Ownable function
  });
  const contractOwner = contractOwnerData as Address | undefined;
  // --- END NEW ---

  // --- 1. voterRegistry Address ---
  const {
    data: voterRegistryAddressData,
    isLoading: isFetchingVoterRegistry,
    isError: isVoterRegistryError,
    error: voterRegistryError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveBallot,
    abi: ABOVE_BALLOT_ABI,
    functionName: 'voterRegistry',
  });
  // Type assertion for the specific return type if needed, or rely on inferred type
  const voterRegistryAddress = voterRegistryAddressData as Address | undefined;


  // --- 2. hasVotedInCampaign (per user, per campaign) ---
  const {
    data: hasVotedData,
    isLoading: isCheckingVoteStatus,
    isError: isVoteStatusError,
    error: voteStatusError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveBallot,
    abi: ABOVE_BALLOT_ABI,
    functionName: 'hasVotedInCampaign',
    args: campaignId !== null && userAddress ? [campaignId, userAddress] : undefined,
    query: {
      enabled: campaignId !== null && !!userAddress, // Only run if campaignId and user is connected
    },
  });
  const hasVoted = hasVotedData as boolean | undefined;


  // --- 3. totalVotesPerCampaign ---
  const {
    data: totalVotesCastData,
    isLoading: isFetchingTotalVotes,
    isError: isTotalVotesError,
    error: totalVotesError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveBallot,
    abi: ABOVE_BALLOT_ABI,
    functionName: 'totalVotesPerCampaign',
    args: campaignId !== null ? [campaignId] : undefined,
    query: {
      enabled: campaignId !== null, // Only run if campaignId is provided
    },
  });
  const totalVotesCast = totalVotesCastData as bigint | undefined;


  // --- 4. getCampaign (metadata for a specific campaign) ---
  const {
    data: campaignData,
    isLoading: isFetchingCampaign,
    isError: isCampaignError,
    error: campaignError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveBallot,
    abi: ABOVE_BALLOT_ABI,
    functionName: 'getCampaign',
    args: campaignId !== null ? [campaignId] : undefined,
    query: {
      enabled: campaignId !== null, // Only run if campaignId is provided
    },
  });
  const campaign = campaignData as Campaign | undefined;


  // --- 5. isBasicSingleVoteByCampaign (per campaign) ---
  const {
    data: isBasicSingleVoteData,
    isLoading: isCheckingSingleVote,
    isError: isSingleVoteError,
    error: singleVoteError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveBallot,
    abi: ABOVE_BALLOT_ABI,
    functionName: 'isBasicSingleVoteByCampaign',
    args: campaignId !== null && campaign?.campaignType === 1 ? [campaignId] : undefined, // Only fetch if Basic campaign
    query: {
      enabled: campaignId !== null && campaign?.campaignType === 1, // Only fetch if Basic campaign
    },
  });
  const isBasicSingleVote = isBasicSingleVoteData as boolean | undefined;


  // --- 6. getBasicResults (Choices & Votes for a specific Basic campaign) ---
  const {
    data: basicResultsData, // This will be a tuple [string[], bigint[]]
    isLoading: isFetchingBasicResults,
    isError: isBasicResultsError,
    error: basicResultsError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveBallot,
    abi: ABOVE_BALLOT_ABI,
    functionName: 'getBasicResults',
    args: campaignId !== null && campaign?.campaignType === 1 && campaign?.isFinalized ? [campaignId] : undefined,
    query: {
      enabled: campaignId !== null && campaign?.campaignType === 1 && campaign?.isFinalized, // Only fetch if Basic and finalized
    },
  });
  // Destructure the tuple data safely
  const basicChoices = (basicResultsData?.[0] as string[] | undefined) ?? [];
  const basicVotes = (basicResultsData?.[1] as bigint[] | undefined) ?? [];


  // --- 7. getBallotResults (Positions, Candidates, Votes for a specific Ballot campaign) ---
  const {
    data: ballotResultsData, // This will be a tuple [Position[], Candidate[], bigint[]]
    isLoading: isFetchingBallotResults,
    isError: isBallotResultsError,
    error: ballotResultsError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveBallot,
    abi: ABOVE_BALLOT_ABI,
    functionName: 'getBallotResults',
    args: campaignId !== null && campaign?.campaignType === 2 && campaign?.isFinalized ? [campaignId] : undefined,
    query: {
      enabled: campaignId !== null && campaign?.campaignType === 2 && campaign?.isFinalized, // Only fetch if Ballot and finalized
    },
  });
  // Destructure the tuple data safely
  const ballotPositions = (ballotResultsData?.[0] as Position[] | undefined) ?? [];
  const ballotCandidates = (ballotResultsData?.[1] as Candidate[] | undefined) ?? [];
  const ballotCandidateVotes = (ballotResultsData?.[2] as bigint[] | undefined) ?? [];

  // --- NEW: 8. Read Next Campaign ID (Global) ---
  const {
    data: nextCampaignIdData,
    isLoading: isFetchingNextCampaignId,
    isError: isNextCampaignIdError,
    error: nextCampaignIdError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveBallot,
    abi: ABOVE_BALLOT_ABI,
    functionName: 'getNextCampaignId',
  });
  const nextCampaignId = nextCampaignIdData as bigint | undefined;
  // --- END NEW ---


  // --- Write Functions ---

  // --- Existing: Voting Functions ---
  const {
    writeContract: voteBasicWrite,
    isPending: isVotingBasic,
    isSuccess: isVoteBasicSuccess,
    isError: isVoteBasicError,
    error: voteBasicError,
  } = useWriteContract();

  const handleVoteBasic = (selectedChoiceIndices: bigint[]) => {
    if (campaignId === null) {
      console.error("Cannot vote: campaignId is null");
      return;
    }
    voteBasicWrite({
      address: CONTRACT_ADDRESSES.aboveBallot,
      abi: ABOVE_BALLOT_ABI,
      functionName: 'voteBasic',
      args: [campaignId, selectedChoiceIndices],
    });
  };

  const {
    writeContract: voteBallotWrite,
    isPending: isVotingBallot,
    isSuccess: isVoteBallotSuccess,
    isError: isVoteBallotError,
    error: voteBallotError,
  } = useWriteContract();

  const handleVoteBallot = (selectedCandidateIds: bigint[]) => {
    if (campaignId === null) {
      console.error("Cannot vote: campaignId is null");
      return;
    }
    voteBallotWrite({
      address: CONTRACT_ADDRESSES.aboveBallot,
      abi: ABOVE_BALLOT_ABI,
      functionName: 'voteBallot',
      args: [campaignId, selectedCandidateIds],
    });
  };
  // --- END Existing: Voting Functions ---

  // --- NEW: Campaign Management Functions ---

  // --- 1. createCampaign ---
  const {
    writeContract: createCampaignWrite,
    isPending: isCreatingCampaign,
    isSuccess: isCreateCampaignSuccess,
    isError: isCreateCampaignError,
    error: createCampaignError,
  } = useWriteContract();

  const handleCreateCampaign = (description: string, type: 0 | 1 | 2) => { // Use inline type or CampaignType if exported
    createCampaignWrite({
      address: CONTRACT_ADDRESSES.aboveBallot,
      abi: ABOVE_BALLOT_ABI,
      functionName: 'createCampaign',
      args: [description, type],
    });
  };

  // --- 2. setCampaignDescription ---
  const {
    writeContract: setCampaignDescriptionWrite,
    isPending: isSettingDescription,
    isSuccess: isSetDescriptionSuccess,
    isError: isSetDescriptionError,
    error: setDescriptionError,
  } = useWriteContract();

  const handleSetCampaignDescription = (description: string) => {
    if (campaignId === null) {
      console.error("Cannot set description: campaignId is null");
      return;
    }
    setCampaignDescriptionWrite({
      address: CONTRACT_ADDRESSES.aboveBallot,
      abi: ABOVE_BALLOT_ABI,
      functionName: 'setCampaignDescription',
      args: [campaignId, description],
    });
  };

  // --- 3. activateCampaign ---
  const {
    writeContract: activateCampaignWrite,
    isPending: isActivatingCampaign,
    isSuccess: isActivateCampaignSuccess,
    isError: isActivateCampaignError,
    error: activateCampaignError,
  } = useWriteContract();

  const handleActivateCampaign = () => {
    if (campaignId === null) {
      console.error("Cannot activate: campaignId is null");
      return;
    }
    activateCampaignWrite({
      address: CONTRACT_ADDRESSES.aboveBallot,
      abi: ABOVE_BALLOT_ABI,
      functionName: 'activateCampaign',
      args: [campaignId],
    });
  };

  // --- 4. deactivateCampaign ---
  const {
    writeContract: deactivateCampaignWrite,
    isPending: isDeactivatingCampaign,
    isSuccess: isDeactivateCampaignSuccess,
    isError: isDeactivateCampaignError,
    error: deactivateCampaignError,
  } = useWriteContract();

  const handleDeactivateCampaign = () => {
    if (campaignId === null) {
      console.error("Cannot deactivate: campaignId is null");
      return;
    }
    deactivateCampaignWrite({
      address: CONTRACT_ADDRESSES.aboveBallot,
      abi: ABOVE_BALLOT_ABI,
      functionName: 'deactivateCampaign',
      args: [campaignId],
    });
  };

  // --- 5. setBasicCampaign ---
  const {
    writeContract: setBasicCampaignWrite,
    isPending: isSettingBasicCampaign,
    isSuccess: isSetBasicCampaignSuccess,
    isError: isSetBasicCampaignError,
    error: setBasicCampaignError,
  } = useWriteContract();

  const handleSetBasicCampaign = (choices: string[], isSingleVote: boolean) => {
    if (campaignId === null) {
      console.error("Cannot set basic campaign: campaignId is null");
      return;
    }
    setBasicCampaignWrite({
      address: CONTRACT_ADDRESSES.aboveBallot,
      abi: ABOVE_BALLOT_ABI,
      functionName: 'setBasicCampaign',
      args: [campaignId, choices, isSingleVote],
    });
  };

  // --- 6. addBallotPosition ---
  const {
    writeContract: addBallotPositionWrite,
    isPending: isAddingBallotPosition,
    isSuccess: isAddBallotPositionSuccess,
    isError: isAddBallotPositionError,
    error: addBallotPositionError,
  } = useWriteContract();

  const handleAddBallotPosition = (name: string, maxSelections: number) => {
    if (campaignId === null) {
      console.error("Cannot add ballot position: campaignId is null");
      return;
    }
    addBallotPositionWrite({
      address: CONTRACT_ADDRESSES.aboveBallot,
      abi: ABOVE_BALLOT_ABI,
      functionName: 'addBallotPosition',
      args: [campaignId, name, maxSelections],
    });
  };

  // --- 7. addCandidate ---
  const {
    writeContract: addCandidateWrite,
    isPending: isAddingCandidate,
    isSuccess: isAddCandidateSuccess,
    isError: isAddCandidateError,
    error: addCandidateError,
  } = useWriteContract();

  const handleAddCandidate = (name: string, positionIndex: bigint) => {
    if (campaignId === null) {
      console.error("Cannot add candidate: campaignId is null");
      return;
    }
    addCandidateWrite({
      address: CONTRACT_ADDRESSES.aboveBallot,
      abi: ABOVE_BALLOT_ABI,
      functionName: 'addCandidate',
      args: [campaignId, name, positionIndex],
    });
  };

  // --- NEW: 8. addCandidates (Batch Add Candidates) ---
  const {
    writeContract: addCandidatesWrite,
    isPending: isAddingCandidates, // <-- This is the new loading state
    isSuccess: isAddCandidatesSuccess, // <-- This is the new success state
    isError: isAddCandidatesError, // <-- This is the new error state
    error: addCandidatesError, // <-- This is the new error object
  } = useWriteContract();

  const handleAddCandidates = (names: string[], positionIndex: bigint) => {
    if (campaignId === null) {
      console.error("Cannot add candidates: campaignId is null");
      return;
    }
    addCandidatesWrite({
      address: CONTRACT_ADDRESSES.aboveBallot,
      abi: ABOVE_BALLOT_ABI,
      functionName: 'addCandidates',
      args: [campaignId, names, positionIndex],
    });
  };
  // --- END NEW: addCandidates ---

  // --- 9. finalizeBallotSetup ---
  const {
    writeContract: finalizeBallotSetupWrite,
    isPending: isFinalizingBallotSetup,
    isSuccess: isFinalizeBallotSetupSuccess,
    isError: isFinalizeBallotSetupError,
    error: finalizeBallotSetupError,
  } = useWriteContract();

  const handleFinalizeBallotSetup = () => {
    if (campaignId === null) {
      console.error("Cannot finalize ballot: campaignId is null");
      return;
    }
    finalizeBallotSetupWrite({
      address: CONTRACT_ADDRESSES.aboveBallot,
      abi: ABOVE_BALLOT_ABI,
      functionName: 'finalizeBallotSetup',
      args: [campaignId],
    });
  };

  // --- NEW: 10. endCampaign ---
  /**
   * @dev Hook function to trigger the endCampaign transaction on the blockchain.
   *      Only the campaign creator can call this.
   * @param campaignIdToFinalize The ID of the campaign to end.
   */
  const {
    writeContract: endCampaignWrite,
    isPending: isEndingCampaign, // <-- New loading state
    isSuccess: isEndCampaignSuccess, // <-- New success state
    isError: isEndCampaignError, // <-- New error state
    error: endCampaignError, // <-- New error object
  } = useWriteContract();

  /**
   * @dev Handler function to prepare and execute the endCampaign write contract call.
   * @param campaignIdToFinalize The ID of the campaign to end.
   */
  const handleEndCampaign = (campaignIdToFinalize: bigint) => { // Accept campaignId as argument
    // Use the argument passed to the handler function
    if (campaignIdToFinalize === null) {
        console.error("Cannot end campaign: campaignId is null");
        return;
    }
    endCampaignWrite({
      address: CONTRACT_ADDRESSES.aboveBallot,
      abi: ABOVE_BALLOT_ABI,
      functionName: 'endCampaign',
      args: [campaignIdToFinalize], // Pass the argument received by the handler
    });
  };
  // --- END NEW: endCampaign ---

  // --- END NEW: Campaign Management Functions ---

  // --- Return Values ---
  return {
    // --- NEW: Owner Data ---
    contractOwner,
    isFetchingOwner,
    isOwnerError,
    ownerError,
    // --- END NEW ---

    // --- Read data (with defaults) ---
    voterRegistryAddress: voterRegistryAddress ?? '0x0000000000000000000000000000000000000000',
    isFetchingVoterRegistry,
    isVoterRegistryError,
    voterRegistryError,

    hasVoted: hasVoted ?? false,
    isCheckingVoteStatus,
    isVoteStatusError,
    voteStatusError,

    totalVotesCast: totalVotesCast ?? 0n,
    isFetchingTotalVotes,
    isTotalVotesError,
    totalVotesError,

    campaign: campaign ?? null, // Return null if no campaignId provided or campaign not found
    isFetchingCampaign,
    isCampaignError,
    campaignError,

    isBasicSingleVote: isBasicSingleVote ?? false,
    isCheckingSingleVote,
    isSingleVoteError,
    singleVoteError,

    // Basic Results
    basicChoices,
    basicVotes,
    isFetchingBasicResults,
    isBasicResultsError,
    basicResultsError,

    // Ballot Results
    ballotPositions,
    ballotCandidates,
    ballotCandidateVotes,
    isFetchingBallotResults,
    isBallotResultsError,
    ballotResultsError,

    // --- NEW Global Reads ---
    nextCampaignId: nextCampaignId ?? 1n, // Default to 1 if not fetched
    isFetchingNextCampaignId,
    isNextCampaignIdError,
    nextCampaignIdError,
    // --- END NEW ---

    // --- Write functions and state ---

    // --- Voting ---
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
    // --- END Voting ---

    // --- Campaign Management Functions and States ---
    handleCreateCampaign,
    isCreatingCampaign,
    isCreateCampaignSuccess,
    isCreateCampaignError,
    createCampaignError,

    handleSetCampaignDescription,
    isSettingDescription,
    isSetDescriptionSuccess,
    isSetDescriptionError,
    setDescriptionError,

    handleActivateCampaign,
    isActivatingCampaign,
    isActivateCampaignSuccess,
    isActivateCampaignError,
    activateCampaignError,

    handleDeactivateCampaign,
    isDeactivatingCampaign,
    isDeactivateCampaignSuccess,
    isDeactivateCampaignError,
    deactivateCampaignError,

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

    // --- NEW: Batch Add Candidates ---
    handleAddCandidates, // <-- Export the new handler
    isAddingCandidates, // <-- Export the new loading state
    isAddCandidatesSuccess, // <-- Export the new success state
    isAddCandidatesError, // <-- Export the new error state
    addCandidatesError, // <-- Export the new error object
    // --- END NEW ---

    handleFinalizeBallotSetup,
    isFinalizingBallotSetup,
    isFinalizeBallotSetupSuccess,
    isFinalizeBallotSetupError,
    finalizeBallotSetupError,

    // --- NEW: End Campaign ---
    handleEndCampaign, // <-- Export the new handler
    isEndingCampaign, // <-- Export the new loading state
    isEndCampaignSuccess, // <-- Export the new success state
    isEndCampaignError, // <-- Export the new error state
    endCampaignError, // <-- Export the new error object
    // --- END NEW ---
    // --- END Campaign Management ---
  };
};

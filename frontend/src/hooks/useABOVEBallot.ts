// src/hooks/useABOVEBallot.ts
import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { CONTRACT_ADDRESSES, ABOVE_BALLOT_ABI } from '../contracts/contractConfig';
// Import specific types from viem if needed for better typing, but avoid 'any'
import type { Address } from 'viem'; // Safer import for Address type

// --- Define TypeScript types for complex contract structures ---
// These should ideally match your Solidity structs as closely as possible.
// Using `any` for internal fields if exact typing is problematic.
type Position = {
  name: string;
  maxSelections: number; // Maps to uint8 in Solidity
  candidateCount: bigint; // Maps to uint256
  // Add other fields from the Solidity struct if needed and if type issues arise
  [key: string]: any; // Catch-all for potential ABI mismatch or additional fields
};

type Candidate = {
  name: string;
  positionIndex: bigint; // uint256
  // Add other fields from the Solidity struct if needed
  [key: string]: any;
};

// Enum values from Solidity (0: Undefined, 1: Basic, 2: Ballot)
// Using a union type for better type safety where possible
type CampaignType = 0 | 1 | 2;

/**
 * Custom hook for interacting with the ABOVEBallot contract.
 * Provides functions to get campaign info, check vote status, cast votes, and manage campaigns.
 * This version aims for better compatibility with TypeScript/Viem/Wagmi typing.
 */
export const useABOVEBallot = () => {
  const { address: userAddress } = useAccount();

  // --- Read Functions ---

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


  // --- 2. hasVoted (per user) ---
  const {
    data: hasVotedData,
    isLoading: isCheckingVoteStatus,
    isError: isVoteStatusError,
    error: voteStatusError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveBallot,
    abi: ABOVE_BALLOT_ABI,
    functionName: 'hasVoted',
    args: [userAddress || '0x0000000000000000000000000000000000000000'],
    query: {
      enabled: !!userAddress, // Only run if user is connected
    },
  });
  const hasVoted = hasVotedData as boolean | undefined;


  // --- 3. totalVotesCast ---
  const {
    data: totalVotesCastData,
    isLoading: isFetchingTotalVotes,
    isError: isTotalVotesError,
    error: totalVotesError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveBallot,
    abi: ABOVE_BALLOT_ABI,
    functionName: 'totalVotesCast',
  });
  const totalVotesCast = totalVotesCastData as bigint | undefined;


  // --- 4. currentCampaignType ---
  const {
    data: currentCampaignTypeData,
    isLoading: isFetchingCampaignType,
    isError: isCampaignTypeError,
    error: campaignTypeError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveBallot,
    abi: ABOVE_BALLOT_ABI,
    functionName: 'currentCampaignType',
  });
  const currentCampaignType = currentCampaignTypeData as CampaignType | undefined;


  // --- 5. isBasicCampaignSet ---
  const {
    data: isBasicCampaignSetData,
    isLoading: isCheckingBasicSet,
    isError: isBasicSetError,
    error: basicSetError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveBallot,
    abi: ABOVE_BALLOT_ABI,
    functionName: 'isBasicCampaignSet',
  });
  const isBasicCampaignSet = isBasicCampaignSetData as boolean | undefined;


  // --- 6. isBasicSingleVote ---
  const {
    data: isBasicSingleVoteData,
    isLoading: isCheckingSingleVote,
    isError: isSingleVoteError,
    error: singleVoteError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveBallot,
    abi: ABOVE_BALLOT_ABI,
    functionName: 'isBasicSingleVote',
    query: {
      enabled: !!isBasicCampaignSet, // Only fetch if a basic campaign is set
    },
  });
  const isBasicSingleVote = isBasicSingleVoteData as boolean | undefined;


  // --- 7. getBasicResults (Choices & Votes) ---
  const {
    data: basicResultsData, // This will be a tuple [string[], bigint[]]
    isLoading: isFetchingBasicResults,
    isError: isBasicResultsError,
    error: basicResultsError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveBallot,
    abi: ABOVE_BALLOT_ABI,
    functionName: 'getBasicResults',
    query: {
      enabled: currentCampaignType === 1, // Only fetch if current campaign is Basic (1)
    },
  });
  // Destructure the tuple data safely
  const basicChoices = (basicResultsData?.[0] as string[] | undefined) ?? [];
  const basicVotes = (basicResultsData?.[1] as bigint[] | undefined) ?? [];


  // --- 8. isBallotCampaignFinalized ---
  const {
    data: isBallotCampaignFinalizedData,
    isLoading: isCheckingBallotFinalized,
    isError: isBallotFinalizedError,
    error: ballotFinalizedError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveBallot,
    abi: ABOVE_BALLOT_ABI,
    functionName: 'isBallotCampaignFinalized',
  });
  const isBallotCampaignFinalized = isBallotCampaignFinalizedData as boolean | undefined;


  // --- 9. getBallotResults (Positions, Candidates, Votes) ---
  const {
    data: ballotResultsData, // This will be a tuple [Position[], Candidate[], bigint[]]
    isLoading: isFetchingBallotResults,
    isError: isBallotResultsError,
    error: ballotResultsError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveBallot,
    abi: ABOVE_BALLOT_ABI,
    functionName: 'getBallotResults',
    query: {
      enabled: currentCampaignType === 2 && isBallotCampaignFinalized, // Only fetch if Ballot (2) and finalized
    },
  });
  // Destructure the tuple data safely
  const ballotPositions = (ballotResultsData?.[0] as Position[] | undefined) ?? [];
  const ballotCandidates = (ballotResultsData?.[1] as Candidate[] | undefined) ?? [];
  const ballotCandidateVotes = (ballotResultsData?.[2] as bigint[] | undefined) ?? [];

  // --- NEW: 10. campaignDescription ---
  const {
    data: campaignDescriptionData,
    isLoading: isFetchingDescription,
    isError: isDescriptionError,
    error: descriptionError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveBallot,
    abi: ABOVE_BALLOT_ABI,
    functionName: 'campaignDescription',
  });
  const campaignDescription = campaignDescriptionData as string | undefined;
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
    voteBasicWrite({
      address: CONTRACT_ADDRESSES.aboveBallot,
      abi: ABOVE_BALLOT_ABI,
      functionName: 'voteBasic',
      args: [selectedChoiceIndices],
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
    voteBallotWrite({
      address: CONTRACT_ADDRESSES.aboveBallot,
      abi: ABOVE_BALLOT_ABI,
      functionName: 'voteBallot',
      args: [selectedCandidateIds],
    });
  };
  // --- END Existing: Voting Functions ---

  // --- NEW: Campaign Setup Functions ---

  // --- 1. setBasicCampaign ---
  const {
    writeContract: setBasicCampaignWrite,
    isPending: isSettingBasicCampaign,
    isSuccess: isSetBasicCampaignSuccess,
    isError: isSetBasicCampaignError,
    error: setBasicCampaignError,
  } = useWriteContract();

  const handleSetBasicCampaign = (choices: string[], isSingleVote: boolean) => {
    setBasicCampaignWrite({
      address: CONTRACT_ADDRESSES.aboveBallot,
      abi: ABOVE_BALLOT_ABI,
      functionName: 'setBasicCampaign',
      args: [choices, isSingleVote],
    });
  };

  // --- 2. addBallotPosition ---
  const {
    writeContract: addBallotPositionWrite,
    isPending: isAddingBallotPosition,
    isSuccess: isAddBallotPositionSuccess,
    isError: isAddBallotPositionError,
    error: addBallotPositionError,
  } = useWriteContract();

  const handleAddBallotPosition = (name: string, maxSelections: number) => {
    addBallotPositionWrite({
      address: CONTRACT_ADDRESSES.aboveBallot,
      abi: ABOVE_BALLOT_ABI,
      functionName: 'addBallotPosition',
      args: [name, maxSelections],
    });
  };

  // --- 3. addCandidate ---
  const {
    writeContract: addCandidateWrite,
    isPending: isAddingCandidate,
    isSuccess: isAddCandidateSuccess,
    isError: isAddCandidateError,
    error: addCandidateError,
  } = useWriteContract();

  const handleAddCandidate = (name: string, positionIndex: bigint) => {
    addCandidateWrite({
      address: CONTRACT_ADDRESSES.aboveBallot,
      abi: ABOVE_BALLOT_ABI,
      functionName: 'addCandidate',
      args: [name, positionIndex],
    });
  };

  // --- 4. finalizeBallotSetup ---
  const {
    writeContract: finalizeBallotSetupWrite,
    isPending: isFinalizingBallotSetup,
    isSuccess: isFinalizeBallotSetupSuccess,
    isError: isFinalizeBallotSetupError,
    error: finalizeBallotSetupError,
  } = useWriteContract();

  const handleFinalizeBallotSetup = () => {
    finalizeBallotSetupWrite({
      address: CONTRACT_ADDRESSES.aboveBallot,
      abi: ABOVE_BALLOT_ABI,
      functionName: 'finalizeBallotSetup',
    });
  };

  // --- 5. setCampaignDescription (Ensure included) ---
  const {
    writeContract: setCampaignDescriptionWrite,
    isPending: isSettingDescription,
    isSuccess: isSetDescriptionSuccess,
    isError: isSetDescriptionError,
    error: setDescriptionError, // Renamed from potential conflict
  } = useWriteContract();

  const handleSetCampaignDescription = (description: string) => {
    setCampaignDescriptionWrite({
      address: CONTRACT_ADDRESSES.aboveBallot,
      abi: ABOVE_BALLOT_ABI,
      functionName: 'setCampaignDescription',
      args: [description],
    });
  };
  // --- END NEW: Campaign Setup Functions ---

  // --- Return Values ---
  return {
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

    currentCampaignType: (currentCampaignType ?? 0) as CampaignType, // Default to Undefined
    isFetchingCampaignType,
    isCampaignTypeError,
    campaignTypeError,

    isBasicCampaignSet: isBasicCampaignSet ?? false,
    isCheckingBasicSet,
    isBasicSetError,
    basicSetError,

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

    isBallotCampaignFinalized: isBallotCampaignFinalized ?? false,
    isCheckingBallotFinalized,
    isBallotFinalizedError,
    ballotFinalizedError,

    // Ballot Results
    ballotPositions,
    ballotCandidates,
    ballotCandidateVotes,
    isFetchingBallotResults,
    isBallotResultsError,
    ballotResultsError,

    // --- NEW: Campaign Description ---
    campaignDescription: campaignDescription ?? '',
    isFetchingDescription,
    isDescriptionError,
    descriptionError,
    // --- END NEW ---

    // --- Write functions and state ---

    // --- Existing: Voting ---
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
    // --- END Existing: Voting ---

    // --- NEW: Campaign Setup Functions and States ---
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

    handleFinalizeBallotSetup,
    isFinalizingBallotSetup,
    isFinalizeBallotSetupSuccess,
    isFinalizeBallotSetupError,
    finalizeBallotSetupError,

    handleSetCampaignDescription,
    isSettingDescription,
    isSetDescriptionSuccess,
    isSetDescriptionError,
    setDescriptionError, // Use the renamed error variable
    // --- END NEW ---
  };
};
// frontend/src/hooks/useABOVEBallot.ts
import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { CONTRACT_ADDRESSES, ABOVE_BALLOT_ABI } from '../contracts/contractConfig';
import type { Address } from 'viem';

// --- Define TypeScript types for complex contract structures ---
// Align these with the structs in your Solidity contract
type Position = {
  name: string;
  maxSelections: bigint; // uint8 maps to bigint
  candidateCount: bigint; // uint256 maps to bigint
  [key: string]: any; // Catch potential ABI mismatches
};

type Candidate = {
  name: string;
  positionIndex: bigint; // uint256 maps to bigint
  [key: string]: any;
};

// Enum values from Solidity (0: Undefined, 1: Basic, 2: Ballot)
export type CampaignType = 0 | 1 | 2; // added 'export' here

type Campaign = {
  id: bigint; // uint256
  campaignType: CampaignType; // uint8 enum
  description: string; // string
  isActive: boolean; // bool
  isFinalized: boolean; // bool
  createdAt: bigint; // uint256 (timestamp)
  finalizedAt: bigint; // uint256 (timestamp)
  [key: string]: any; // Catch potential ABI mismatches
};

/**
 * Custom hook for interacting with the multi-campaign ABOVEBallot contract.
 * Provides functions to get campaign info, check vote status, cast votes, and manage campaigns.
 * This version is designed for the multi-campaign structure.
 */
export const useABOVEBallot = (campaignId: bigint | null) => { // Accept campaignId as a parameter
  const { address: userAddress } = useAccount();
  const isConnected = !!userAddress;

  // --- Read Functions (Conditional on campaignId being provided) ---

  // --- 1. voterRegistry Address (Global) ---
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
    args: campaignId !== null && isConnected ? [campaignId, userAddress] : undefined,
    query: {
      enabled: campaignId !== null && isConnected, // Only run if campaignId and user are connected
    },
  });
  const hasVoted = hasVotedData as boolean | undefined;

  // --- 3. totalVotesPerCampaign (per campaign) ---
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

  // --- NEW: Read Next Campaign ID (Global) ---
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

  // --- Voting Functions ---
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
  // --- END Voting Functions ---

  // --- Campaign Management Functions (Owner Only) ---

  // --- 1. createCampaign ---
  const {
    writeContract: createCampaignWrite,
    isPending: isCreatingCampaign,
    isSuccess: isCreateCampaignSuccess,
    isError: isCreateCampaignError,
    error: createCampaignError,
  } = useWriteContract();

  const handleCreateCampaign = (description: string, type: CampaignType) => {
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

  // --- 8. finalizeBallotSetup ---
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
  // --- END Campaign Management Functions ---

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

    handleFinalizeBallotSetup,
    isFinalizingBallotSetup,
    isFinalizeBallotSetupSuccess,
    isFinalizeBallotSetupError,
    finalizeBallotSetupError,
    // --- END Campaign Management ---
  };
};
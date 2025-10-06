// frontend/src/hooks/useABOVEBallot.ts
import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { CONTRACT_ADDRESSES, ABOVE_BALLOT_ABI, ABOVE_TOKEN_ABI } from '../contracts/contractConfig';
import type { Address } from 'viem';

// --- Define TypeScript types for complex contract structures ---
type Position = {
  name: string;
  maxSelections: number;
  candidateCount: bigint;
  [key: string]: any;
};

type Candidate = {
  name: string;
  positionIndex: bigint;
  [key: string]: any;
};

type Campaign = {
  id: bigint;
  campaignType: 0 | 1 | 2;
  description: string;
  isFinalized: boolean;
  createdAt: bigint;
  finalizedAt: bigint;
  creator: Address;
  [key: string]: any;
};

/**
 * Custom hook for interacting with the ABOVEBallot contract.
 * Provides functions to get campaign info, check vote status, cast votes, and manage campaigns.
 * This version is updated for the simplified flow where finalization enables voting.
 */
export const useABOVEBallot = (campaignId: bigint | null) => {
  const { address: userAddress } = useAccount();
  const queryClient = useQueryClient();

  // --- Read Functions ---

  const {
    data: contractOwnerData,
    isLoading: isFetchingOwner,
    isError: isOwnerError,
    error: ownerError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveBallot,
    abi: ABOVE_BALLOT_ABI,
    functionName: 'owner',
  });
  const contractOwner = contractOwnerData as Address | undefined;

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
      enabled: campaignId !== null && !!userAddress,
    },
  });
  const hasVoted = hasVotedData as boolean | undefined;

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
      enabled: campaignId !== null,
    },
  });
  const totalVotesCast = totalVotesCastData as bigint | undefined;

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
      enabled: campaignId !== null,
    },
  });
  const campaign = campaignData as Campaign | undefined;

  const {
    data: isBasicSingleVoteData,
    isLoading: isCheckingSingleVote,
    isError: isSingleVoteError,
    error: singleVoteError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveBallot,
    abi: ABOVE_BALLOT_ABI,
    functionName: 'isBasicSingleVoteByCampaign',
    args: campaignId !== null && campaign?.campaignType === 1 ? [campaignId] : undefined,
    query: {
      enabled: campaignId !== null && campaign?.campaignType === 1,
    },
  });
  const isBasicSingleVote = isBasicSingleVoteData as boolean | undefined;

  const {
    data: basicResultsData,
    isLoading: isFetchingBasicResults,
    isError: isBasicResultsError,
    error: basicResultsError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveBallot,
    abi: ABOVE_BALLOT_ABI,
    functionName: 'getBasicResults',
    args: campaignId !== null && campaign?.campaignType === 1 && campaign?.isFinalized ? [campaignId] : undefined,
    query: {
      enabled: campaignId !== null && campaign?.campaignType === 1 && campaign?.isFinalized,
    },
  });
  const basicChoices = (basicResultsData?.[0] as string[] | undefined) ?? [];
  const basicVotes = (basicResultsData?.[1] as bigint[] | undefined) ?? [];

  const {
    data: ballotResultsData,
    isLoading: isFetchingBallotResults,
    isError: isBallotResultsError,
    error: ballotResultsError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveBallot,
    abi: ABOVE_BALLOT_ABI,
    functionName: 'getBallotResults',
    args: campaignId !== null && campaign?.campaignType === 2 && campaign?.isFinalized ? [campaignId] : undefined,
    query: {
      enabled: campaignId !== null && campaign?.campaignType === 2 && campaign?.isFinalized,
    },
  });
  const ballotPositions = (ballotResultsData?.[0] as Position[] | undefined) ?? [];
  const ballotCandidates = (ballotResultsData?.[1] as Candidate[] | undefined) ?? [];
  const ballotCandidateVotes = (ballotResultsData?.[2] as bigint[] | undefined) ?? [];

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

  const {
    data: aboveTokenBalanceData,
    isLoading: isFetchingAboveTokenBalance,
    isError: isAboveTokenBalanceError,
    error: aboveTokenBalanceError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveToken,
    abi: ABOVE_TOKEN_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });
  const aboveTokenBalance = aboveTokenBalanceData as bigint | undefined;

  const {
    data: aboveTokenAllowanceData,
    isLoading: isFetchingAboveTokenAllowance,
    isError: isAboveTokenAllowanceError,
    error: aboveTokenAllowanceError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveToken,
    abi: ABOVE_TOKEN_ABI,
    functionName: 'allowance',
    args: userAddress && CONTRACT_ADDRESSES.aboveBallot ? [userAddress, CONTRACT_ADDRESSES.aboveBallot] : undefined,
    query: {
      enabled: !!(userAddress && CONTRACT_ADDRESSES.aboveBallot),
    },
  });
  const aboveTokenAllowance = aboveTokenAllowanceData as bigint | undefined;

  const {
    data: campaignCreationFeeData,
    isLoading: isFetchingCampaignCreationFee,
    isError: isCampaignCreationFeeError,
    error: campaignCreationFeeError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveBallot,
    abi: ABOVE_BALLOT_ABI,
    functionName: 'CAMPAIGN_CREATION_FEE',
  });
  const CAMPAIGN_CREATION_FEE = campaignCreationFeeData as bigint | undefined;

  // --- Write Functions ---

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

  const {
    writeContract: approveAboveTokensWrite,
    isPending: isApprovingAboveTokens,
    isSuccess: isApproveAboveTokensSuccess,
    isError: isApproveAboveTokensError,
    error: approveAboveTokensError,
  } = useWriteContract();

  const handleApproveAboveTokens = (amount: bigint) => {
    approveAboveTokensWrite({
      address: CONTRACT_ADDRESSES.aboveToken,
      abi: ABOVE_TOKEN_ABI,
      functionName: 'approve',
      args: [CONTRACT_ADDRESSES.aboveBallot, amount],
    });
  };

  const {
    writeContract: createCampaignWrite,
    isPending: isCreatingCampaign,
    isSuccess: isCreateCampaignSuccess,
    isError: isCreateCampaignError,
    error: createCampaignError,
  } = useWriteContract();

  const handleCreateCampaign = (description: string, type: 0 | 1 | 2) => {
    createCampaignWrite({
      address: CONTRACT_ADDRESSES.aboveBallot,
      abi: ABOVE_BALLOT_ABI,
      functionName: 'createCampaign',
      args: [description, type],
    });
  };

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

  const {
    writeContract: addCandidatesWrite,
    isPending: isAddingCandidates,
    isSuccess: isAddCandidatesSuccess,
    isError: isAddCandidatesError,
    error: addCandidatesError,
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

  const {
    writeContract: endCampaignWrite,
    isPending: isEndingCampaign,
    isSuccess: isEndCampaignSuccess,
    isError: isEndCampaignError,
    error: endCampaignError,
  } = useWriteContract();

  const handleEndCampaign = (campaignIdToFinalize: bigint) => {
    if (campaignIdToFinalize === null) {
        console.error("Cannot end campaign: campaignId is null");
        return;
    }
    endCampaignWrite({
      address: CONTRACT_ADDRESSES.aboveBallot,
      abi: ABOVE_BALLOT_ABI,
      functionName: 'endCampaign',
      args: [campaignIdToFinalize],
    });
  };

  return {
    contractOwner,
    isFetchingOwner,
    isOwnerError,
    ownerError,

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

    campaign: campaign ?? null,
    isFetchingCampaign,
    isCampaignError,
    campaignError,

    isBasicSingleVote: isBasicSingleVote ?? false,
    isCheckingSingleVote,
    isSingleVoteError,
    singleVoteError,

    basicChoices,
    basicVotes,
    isFetchingBasicResults,
    isBasicResultsError,
    basicResultsError,

    ballotPositions,
    ballotCandidates,
    ballotCandidateVotes,
    isFetchingBallotResults,
    isBallotResultsError,
    ballotResultsError,

    nextCampaignId: nextCampaignId ?? 1n,
    isFetchingNextCampaignId,
    isNextCampaignIdError,
    nextCampaignIdError,

    aboveTokenBalance: aboveTokenBalance ?? 0n,
    isFetchingAboveTokenBalance,
    isAboveTokenBalanceError,
    aboveTokenBalanceError,

    aboveTokenAllowance: aboveTokenAllowance ?? 0n,
    isFetchingAboveTokenAllowance,
    isAboveTokenAllowanceError,
    aboveTokenAllowanceError,

    CAMPAIGN_CREATION_FEE: CAMPAIGN_CREATION_FEE ?? 0n,
    isFetchingCampaignCreationFee,
    isCampaignCreationFeeError,
    campaignCreationFeeError,

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

    handleApproveAboveTokens,
    isApprovingAboveTokens,
    isApproveAboveTokensSuccess,
    isApproveAboveTokensError,
    approveAboveTokensError,

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

    handleAddCandidates,
    isAddingCandidates,
    isAddCandidatesSuccess,
    isAddCandidatesError,
    addCandidatesError,

    handleFinalizeBallotSetup,
    isFinalizingBallotSetup,
    isFinalizeBallotSetupSuccess,
    isFinalizeBallotSetupError,
    finalizeBallotSetupError,

    handleEndCampaign,
    isEndingCampaign,
    isEndCampaignSuccess,
    isEndCampaignError,
    endCampaignError,
  };
};

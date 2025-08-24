// src/hooks/useABOVEBallot.ts
import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { CONTRACT_ADDRESSES, ABOVE_BALLOT_ABI } from '../contracts/contractConfig';
import { type Address } from 'viem'; // Import Address type

// Define TypeScript types for the complex return structures from the contract
// These match the structs defined in your Solidity contract
type Position = {
  name: string;
  maxSelections: number; // uint8 in Solidity maps to number in TypeScript
  candidateCount: bigint; // uint256 in Solidity maps to bigint in TypeScript
};

type Candidate = {
  name: string;
  positionIndex: bigint; // uint256
};

// Enum values from Solidity (0: Undefined, 1: Basic, 2: Ballot)
type CampaignType = 0 | 1 | 2;

/**
 * Custom hook for interacting with the ABOVEBallot contract.
 * Provides functions to get campaign info, check vote status, and cast votes.
 */
export const useABOVEBallot = () => {
  const { address: userAddress } = useAccount();

  // --- Read Functions ---

  /**
   * Gets the address of the linked VoterRegistry contract.
   */
  const {
    data: voterRegistryAddress,
    isLoading: isFetchingVoterRegistry,
    isError: isVoterRegistryError,
    error: voterRegistryError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveBallot,
    abi: ABOVE_BALLOT_ABI,
    functionName: 'voterRegistry',
  }) as unknown as { data: Address | undefined; isLoading: boolean; isError: boolean; error: Error | null }; // Explicit typing

  /**
   * Checks if the connected address has already voted.
   */
  const {
    data: hasVoted,
    isLoading: isCheckingVoteStatus,
    isError: isVoteStatusError,
    error: voteStatusError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveBallot,
    abi: ABOVE_BALLOT_ABI,
    functionName: 'hasVoted',
    args: [userAddress || '0x0000000000000000000000000000000000000000'],
    query: {
      enabled: !!userAddress,
    },
  }) as unknown as { data: boolean | undefined; isLoading: boolean; isError: boolean; error: Error | null }; // Explicit typing

  /**
   * Gets the total number of votes cast so far.
   */
  const {
    data: totalVotesCast,
    isLoading: isFetchingTotalVotes,
    isError: isTotalVotesError,
    error: totalVotesError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveBallot,
    abi: ABOVE_BALLOT_ABI,
    functionName: 'totalVotesCast',
  }) as unknown as { data: bigint | undefined; isLoading: boolean; isError: boolean; error: Error | null }; // Explicit typing

  /**
   * Gets the current type of active campaign.
   */
  const {
    data: currentCampaignType,
    isLoading: isFetchingCampaignType,
    isError: isCampaignTypeError,
    error: campaignTypeError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveBallot,
    abi: ABOVE_BALLOT_ABI,
    functionName: 'currentCampaignType',
  }) as unknown as { data: CampaignType | undefined; isLoading: boolean; isError: boolean; error: Error | null }; // Explicit typing

  /**
   * Checks if the basic campaign is set.
   */
  const {
    data: isBasicCampaignSet,
    isLoading: isCheckingBasicSet,
    isError: isBasicSetError,
    error: basicSetError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveBallot,
    abi: ABOVE_BALLOT_ABI,
    functionName: 'isBasicCampaignSet',
  }) as unknown as { data: boolean | undefined; isLoading: boolean; isError: boolean; error: Error | null }; // Explicit typing

  /**
   * Checks if the basic campaign is single vote only.
   */
  const {
    data: isBasicSingleVote,
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
  }) as unknown as { data: boolean | undefined; isLoading: boolean; isError: boolean; error: Error | null }; // Explicit typing

  /**
   * Fetches basic campaign choices and their current vote counts.
   * @returns An object containing choices (string[]) and votes (bigint[]).
   */
  const {
    data: basicResults,
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
  }) as unknown as {
    data: readonly [readonly string[], readonly bigint[]] | undefined;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
  }; // Explicit typing for tuple return

  /**
   * Checks if the ballot campaign is finalized.
   */
  const {
    data: isBallotCampaignFinalized,
    isLoading: isCheckingBallotFinalized,
    isError: isBallotFinalizedError,
    error: ballotFinalizedError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveBallot,
    abi: ABOVE_BALLOT_ABI,
    functionName: 'isBallotCampaignFinalized',
  }) as unknown as { data: boolean | undefined; isLoading: boolean; isError: boolean; error: Error | null }; // Explicit typing

  /**
   * Fetches ballot campaign positions, candidates, and their current vote counts.
   * @returns An object containing posData (Position[]), candData (Candidate[]), and candVotes (bigint[]).
   */
  const {
    data: ballotResults,
    isLoading: isFetchingBallotResults,
    isError: isBallotResultsError,
    error: ballotResultsError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveBallot,
    abi: ABOVE_BALLOT_ABI,
    functionName: 'getBallotResults',
    query: {
      enabled: currentCampaignType === 2 && isBallotCampaignFinalized, // Only fetch if current campaign is Ballot (2) and finalized
    },
  }) as unknown as {
    data: readonly [readonly Position[], readonly Candidate[], readonly bigint[]] | undefined;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
  }; // Explicit typing for tuple return

  // --- NEW: Read Campaign Description ---
  /**
   * Fetches the campaign description.
   * @returns The campaign description string.
   */
  const {
    data: campaignDescription,
    isLoading: isFetchingDescription,
    isError: isDescriptionError,
    error: descriptionError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveBallot,
    abi: ABOVE_BALLOT_ABI,
    functionName: 'campaignDescription',
  }) as unknown as { data: string | undefined; isLoading: boolean; isError: boolean; error: Error | null }; // Explicit typing
  // --- END NEW ---

  // --- Write Functions ---

  /**
   * Prepares the write contract hook for casting a basic vote.
   */
  const {
    writeContract: voteBasic,
    isPending: isVotingBasic,
    isSuccess: isVoteBasicSuccess,
    isError: isVoteBasicError,
    error: voteBasicError,
  } = useWriteContract();

  /**
   * Function to trigger the voteBasic transaction.
   * @param selectedChoiceIndices An array of indices corresponding to the chosen options.
   */
  const handleVoteBasic = (selectedChoiceIndices: bigint[]) => {
    voteBasic({
      address: CONTRACT_ADDRESSES.aboveBallot,
      abi: ABOVE_BALLOT_ABI,
      functionName: 'voteBasic',
      args: [selectedChoiceIndices],
    });
  };

  /**
   * Prepares the write contract hook for casting a ballot vote.
   */
  const {
    writeContract: voteBallot,
    isPending: isVotingBallot,
    isSuccess: isVoteBallotSuccess,
    isError: isVoteBallotError,
    error: voteBallotError,
  } = useWriteContract();

  /**
   * Function to trigger the voteBallot transaction.
   * @param selectedCandidateIds An array of candidate IDs the voter is selecting.
   */
  const handleVoteBallot = (selectedCandidateIds: bigint[]) => {
    voteBallot({
      address: CONTRACT_ADDRESSES.aboveBallot,
      abi: ABOVE_BALLOT_ABI,
      functionName: 'voteBallot',
      args: [selectedCandidateIds],
    });
  };

  // --- NEW: Write Function for Setting Description ---
  /**
   * Prepares the write contract hook for setting the campaign description.
   */
  const {
    writeContract: setCampaignDescription, // Renamed for clarity
    isPending: isSettingDescription,
    isSuccess: isSetDescriptionSuccess,
    isError: isSetDescriptionError,
    error: setDescriptionError,
  } = useWriteContract();

  /**
   * Function to trigger the setCampaignDescription transaction.
   * @param description The new campaign description.
   */
  const handleSetCampaignDescription = (description: string) => {
    setCampaignDescription({
      address: CONTRACT_ADDRESSES.aboveBallot,
      abi: ABOVE_BALLOT_ABI,
      functionName: 'setCampaignDescription',
      args: [description],
    });
  };
  // --- END NEW ---

  // --- Return Values ---
  return {
    // Read data
    voterRegistryAddress: voterRegistryAddress ?? '0x0000000000000000000000000000000000000000', // Default to zero address
    isFetchingVoterRegistry,
    isVoterRegistryError,
    voterRegistryError,

    hasVoted: hasVoted ?? false, // Default to false
    isCheckingVoteStatus,
    isVoteStatusError,
    voteStatusError,

    totalVotesCast: totalVotesCast ?? 0n, // Default to 0
    isFetchingTotalVotes,
    isTotalVotesError,
    totalVotesError,

    currentCampaignType: (currentCampaignType ?? 0) as CampaignType, // Default to Undefined (0)
    isFetchingCampaignType,
    isCampaignTypeError,
    campaignTypeError,

    isBasicCampaignSet: isBasicCampaignSet ?? false, // Default to false
    isCheckingBasicSet,
    isBasicSetError,
    basicSetError,

    isBasicSingleVote: isBasicSingleVote ?? false, // Default to false
    isCheckingSingleVote,
    isSingleVoteError,
    singleVoteError,

    // Basic Results (choices and votes)
    basicChoices: basicResults?.[0] ?? [], // Extract choices array or default to empty
    basicVotes: basicResults?.[1] ?? [],   // Extract votes array or default to empty
    isFetchingBasicResults,
    isBasicResultsError,
    basicResultsError,

    isBallotCampaignFinalized: isBallotCampaignFinalized ?? false, // Default to false
    isCheckingBallotFinalized,
    isBallotFinalizedError,
    ballotFinalizedError,

    // Ballot Results (positions, candidates, votes)
    ballotPositions: ballotResults?.[0] ?? [], // Extract positions array or default to empty
    ballotCandidates: ballotResults?.[1] ?? [], // Extract candidates array or default to empty
    ballotCandidateVotes: ballotResults?.[2] ?? [], // Extract candidate votes array or default to empty
    isFetchingBallotResults,
    isBallotResultsError,
    ballotResultsError,

    // --- NEW: Campaign Description ---
    campaignDescription: campaignDescription ?? '', // Default to empty string
    isFetchingDescription,
    isDescriptionError,
    descriptionError,
    // --- END NEW ---

    // Write functions and state
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

    // --- NEW: Set Description Functions and State ---
    handleSetCampaignDescription, // New function
    isSettingDescription,        // New state
    isSetDescriptionSuccess,     // New state
    isSetDescriptionError,       // New state
    setDescriptionError,         // New error
    // --- END NEW ---
  };
};
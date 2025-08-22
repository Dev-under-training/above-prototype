// src/hooks/useVoterRegistry.ts
import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { CONTRACT_ADDRESSES, VOTER_REGISTRY_ABI } from '../contracts/contractConfig';

/**
 * Custom hook for interacting with the VoterRegistry contract.
 * Provides functions to check voter status and add voters.
 */
export const useVoterRegistry = () => {
  const { address: userAddress } = useAccount();

  // --- Read Functions ---

  /**
   * Checks if a specific address is allowed to vote.
   * @param address The address to check. Defaults to the connected wallet address.
   * @returns An object containing:
   *   - data: boolean (true if allowed, false otherwise)
   *   - isLoading: boolean (true if the check is in progress)
   *   - isError: boolean (true if an error occurred)
   *   - error: Error object (if an error occurred)
   */
  const {
    data: isAllowed,
    isLoading: isCheckingAllowed,
    isError: isAllowedError,
    error: allowedError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.voterRegistry,
    abi: VOTER_REGISTRY_ABI,
    functionName: 'isAllowed',
    args: [userAddress || '0x0000000000000000000000000000000000000000'], // Default to zero address if not connected
    query: {
      enabled: !!userAddress, // Only run the query if a user is connected
    },
  });

  /**
   * Gets the total number of allowed voters.
   * @returns An object containing:
   *   - data: bigint (the count of allowed voters)
   *   - isLoading: boolean
   *   - isError: boolean
   *   - error: Error object
   */
  const {
    data: allowedVoterCount,
    isLoading: isFetchingVoterCount,
    isError: isVoterCountError,
    error: voterCountError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.voterRegistry,
    abi: VOTER_REGISTRY_ABI,
    functionName: 'allowedVoterCount',
  });

  // --- Write Functions ---

  /**
   * Prepares the write contract hook for adding a voter.
   * This separates the preparation from the actual execution.
   */
  const {
    writeContract: addVoter,
    isPending: isAddingVoter,
    isSuccess: isAddVoterSuccess,
    isError: isAddVoterError,
    error: addVoterError,
  } = useWriteContract();

  /**
   * Function to trigger the addVoter transaction.
   * @param voterAddress The address of the voter to add.
   */
  const handleAddVoter = (voterAddress: `0x${string}`) => {
    addVoter({
      address: CONTRACT_ADDRESSES.voterRegistry,
      abi: VOTER_REGISTRY_ABI,
      functionName: 'addVoter',
      args: [voterAddress],
    });
  };

  // --- Return Values ---
  return {
    // Read data
    isAllowed: isAllowed ?? false, // Default to false if undefined
    isCheckingAllowed,
    isAllowedError,
    allowedError,
    allowedVoterCount: allowedVoterCount ?? 0n, // Default to 0 if undefined
    isFetchingVoterCount,
    isVoterCountError,
    voterCountError,

    // Write functions and state
    handleAddVoter,
    isAddingVoter,
    isAddVoterSuccess,
    isAddVoterError,
    addVoterError,
  };
};
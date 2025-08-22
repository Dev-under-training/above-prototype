// src/hooks/useVoterRegistry.ts
import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { CONTRACT_ADDRESSES, VOTER_REGISTRY_ABI } from '../contracts/contractConfig';
import { isAddress } from 'viem'; // Utility to validate Ethereum addresses

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
    data: isAllowed, // Destructure 'data' and rename it to 'isAllowed' for clarity
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
    data: allowedVoterCount, // Destructure 'data' and rename it to 'allowedVoterCount'
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
    if (!isAddress(voterAddress)) {
       console.error("Invalid address provided to handleAddVoter:", voterAddress);
       // Optionally, set an error state in your component
       return;
    }
    addVoter({
      address: CONTRACT_ADDRESSES.voterRegistry,
      abi: VOTER_REGISTRY_ABI,
      functionName: 'addVoter',
      args: [voterAddress],
    });
  };

   // --- NEW: Batch Add Voters Function ---
  const {
    writeContract: addVoters, // Renamed for clarity
    isPending: isAddingVoters,
    isSuccess: isAddVotersSuccess,
    isError: isAddVotersError,
    error: addVotersError,
  } = useWriteContract();

  /**
   * Function to trigger the batch addVoters transaction.
   * @param voterAddresses An array of Ethereum addresses to add.
   */
  const handleAddVoters = (voterAddresses: `0x${string}`[]) => {
    // Basic client-side validation
    const invalidAddresses = voterAddresses.filter(addr => !isAddress(addr));
    if (invalidAddresses.length > 0) {
      console.error("Invalid addresses found in batch:", invalidAddresses);
      // Optionally, set an error state in your component
      return;
    }

    addVoters({
      address: CONTRACT_ADDRESSES.voterRegistry,
      abi: VOTER_REGISTRY_ABI,
      functionName: 'addVoters',
      args: [voterAddresses], // Pass the array of addresses
    });
  };
  // --- END NEW: Batch Add Voters Function ---


  // --- Return Values ---
  return {
    // Read data (Apply default values here after destructuring)
    isAllowed: isAllowed ?? false, // Default to false if undefined
    isCheckingAllowed,
    isAllowedError,
    allowedError,
    allowedVoterCount: allowedVoterCount ?? 0n, // Default to 0n if undefined
    isFetchingVoterCount,
    isVoterCountError,
    voterCountError,

    // Write functions and state (Single Add)
    handleAddVoter,
    isAddingVoter,
    isAddVoterSuccess,
    isAddVoterError,
    addVoterError,

    // Write functions and state (Batch Add)
    handleAddVoters, // New function
    isAddingVoters,   // New state
    isAddVotersSuccess, // New state
    isAddVotersError,   // New state
    addVotersError,     // New error
  };
};
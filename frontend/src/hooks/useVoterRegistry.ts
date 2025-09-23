// frontend/src/hooks/useVoterRegistry.ts
import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { CONTRACT_ADDRESSES, VOTER_REGISTRY_ABI } from '../contracts/contractConfig';
import { isAddress } from 'viem'; // Utility to validate Ethereum addresses (kept if needed elsewhere, though not used in this specific hook now)

/**
 * Custom hook for interacting with the VoterRegistry contract.
 * Provides functions to check voter status and allows self-registration for the testnet.
 * Note: Owner functions for adding voters (addVoter, addVoters) are removed for decentralization on testnet.
 */
export const useVoterRegistry = () => {
  const { address: userAddress } = useAccount();

  // --- Read Functions ---

  /**
   * Checks if the connected user's address is allowed to vote.
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

  // --- REMOVED: Owner-Controlled Voter Addition ---
  // The functions handleAddVoter and handleAddVoters, along with their state variables
  // (isAddingVoter, isAddVoterSuccess, etc., isAddingVoters, isAddVotersSuccess, etc.)
  // have been removed as they are not used in the decentralized testnet model.
  // Voters must now self-register.
  // --- END REMOVED ---

  // --- NEW: Self-Registration Function for Testnet ---
  const {
    writeContract: registerAsVoterWrite,
    isPending: isRegisteringAsVoter, // <-- New loading state
    isSuccess: isRegisterAsVoterSuccess, // <-- New success state
    isError: isRegisterAsVoterError, // <-- New error state
    error: registerAsVoterError, // <-- New error object
  } = useWriteContract();

  /**
   * Function to trigger the registerAsVoter transaction.
   * Allows any connected user to register themselves in the VoterRegistry.
   */
  const handleRegisterAsVoter = () => {
    registerAsVoterWrite({
      address: CONTRACT_ADDRESSES.voterRegistry,
      abi: VOTER_REGISTRY_ABI,
      functionName: 'registerAsVoter',
      // No arguments required for registerAsVoter()
    });
  };
  // --- END NEW: Self-Registration Function ---

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

    // --- REMOVED: Owner Add Voter States/Functions ---
    // handleAddVoter,
    // isAddingVoter,
    // isAddVoterSuccess,
    // isAddVoterError,
    // addVoterError,
    // handleAddVoters,
    // isAddingVoters,
    // isAddVotersSuccess,
    // isAddVotersError,
    // addVotersError,
    // --- END REMOVED ---

    // --- NEW: Self-Registration States/Functions ---
    handleRegisterAsVoter, // <-- Export the handler
    isRegisteringAsVoter,   // <-- Export the loading state
    isRegisterAsVoterSuccess, // <-- Export the success state
    isRegisterAsVoterError,   // <-- Export the error state
    registerAsVoterError,     // <-- Export the error object
    // --- END NEW ---
  };
};
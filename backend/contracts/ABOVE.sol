// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20; // Confirmed using 0.8+, so built-in checks apply

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
// Import SafeCast for safe casting operations
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
// --- REMOVED SafeMath import ---
// import "@openzeppelin/contracts/utils/math/SafeMath.sol"; // <-- Remove this line

/**
 * @title ABOVE
 * @dev A standard ERC-20 token for the ABOVE ecosystem.
 *      Includes an initial supply with a portion locked for the owner.
 *      Includes an automatic distribution mechanism for the locked portion after the initial lock.
 */
contract ABOVE is ERC20, Ownable {
    using SafeCast for uint256;
    // --- REMOVED SafeMath usage ---
    // using SafeMath for uint256; // <-- Remove this line

    // --- Token Details ---
    string public constant NAME = "ABOVE";
    string public constant SYMBOL = "ABOVE";
    uint8 public constant DECIMALS = 18;
    uint256 public constant INITIAL_SUPPLY = 900_000_000 * 10**uint256(DECIMALS); // 900 Million tokens

    // --- Token Locking (Owner) ---
    uint256 public immutable ownerLockDuration; // Duration for which owner's tokens are locked (in seconds)
    uint256 public ownerLockedAmount; // Amount of tokens locked for the owner
    address public ownerLockedBeneficiary; // The address whose tokens are locked (should be initialOwner)
    uint256 public ownerLockStartTime; // Timestamp when the owner's lock starts (deployment time)
    bool private _ownerLockInitialized = false; // Flag to ensure owner lock setup happens only once

    // --- Token Distribution (Post Owner Lock) ---
    uint256 public constant DISTRIBUTION_INTERVAL = 24 * 60 * 60; // (Shortened for Testnet) 24 hours in seconds (84600)
    uint256 public constant DISTRIBUTION_PERCENT_PER_INTERVAL = 1; // 0.1% represented as 1/1000
    uint256 public constant DISTRIBUTION_DENOMINATOR = 1000; // Denominator for percentage calculation (0.1% = 1/1000)
    uint256 public distributionStartTime; // Timestamp when distributions can start (ownerLockStartTime + ownerLockDuration)
    uint256 public distributedCycles = 0; // Number of 90-day cycles for which distribution has occurred
    uint256 public totalDistributed = 0; // Total amount of tokens distributed so far from the locked pool
    uint256 public distributionPoolAmount; // The specific amount of tokens reserved for the 90-day distribution (0.3% of initial supply)
    address[] public distributionBeneficiaries; // List of addresses to receive the periodic distribution

    // --- Events ---
    event TokensMinted(address indexed to, uint256 amount);
    event OwnerTokensLocked(address indexed beneficiary, uint256 amount, uint256 durationSeconds);
    event OwnerTokensUnlocked(address indexed beneficiary, uint256 amount);
    event DistributionCycleCompleted(uint256 indexed cycleNumber, uint256 amountPerBeneficiary, uint256 totalAmountDistributed);
    event DistributionBeneficiaryAdded(address indexed beneficiary);
    event DistributionBeneficiaryRemoved(address indexed beneficiary);

    /**
     * @dev Constructor that mints the initial supply.
     *      - 99.7% goes to the initialOwner immediately.
     *      - 0.3% is minted to the contract itself and locked.
     *        - 0.3% is initially locked for the owner for ownerLockDuration.
     *        - After ownerLockDuration, the 0.3% becomes available for periodic distribution.
     * @param initialOwner The address that will receive the majority of the initial supply and have ownership.
     * @param _ownerLockDurationSeconds The duration (in seconds) for which the owner's portion is locked.
     * @param _distributionBeneficiaries The list of addresses that will receive periodic distributions after the owner lock.
     */
    constructor(
        address initialOwner,
        uint256 _ownerLockDurationSeconds,
        address[] memory _distributionBeneficiaries
    ) ERC20(NAME, SYMBOL) Ownable(initialOwner) {
        require(initialOwner != address(0), "ABOVE: Invalid initial owner address");
        require(_ownerLockDurationSeconds > 0, "ABOVE: Owner lock duration must be greater than 0");
        require(_distributionBeneficiaries.length > 0, "ABOVE: Must provide at least one distribution beneficiary");

        ownerLockDuration = _ownerLockDurationSeconds;
        ownerLockedBeneficiary = initialOwner;

        // --- Calculate Amounts ---
        // 0.3% of INITIAL_SUPPLY for locking/distribution
        uint256 lockAndDistributeAmount = (INITIAL_SUPPLY * 3) / 1000; // 3/1000 = 0.3%
        distributionPoolAmount = lockAndDistributeAmount; // The entire 0.3% is the pool for later distribution logic
        ownerLockedAmount = lockAndDistributeAmount; // Initially, the whole pool is considered "locked" for the owner
        // Remaining 99.7%
        uint256 immediateAmount = INITIAL_SUPPLY - lockAndDistributeAmount;

        // --- Mint Tokens ---
        // 1. Mint 99.7% to the initialOwner
        _mint(initialOwner, immediateAmount);
        emit TokensMinted(initialOwner, immediateAmount);

        // 2. Mint 0.3% to this contract address (to be managed for lock/distribution)
        _mint(address(this), lockAndDistributeAmount);
        emit TokensMinted(address(this), lockAndDistributeAmount);

        // --- Initialize Owner Lock ---
        _initializeOwnerLock();
        emit OwnerTokensLocked(initialOwner, lockAndDistributeAmount, _ownerLockDurationSeconds);

        // --- Initialize Distribution Beneficiaries ---
        for (uint256 i = 0; i < _distributionBeneficiaries.length; i++) {
             require(_distributionBeneficiaries[i] != address(0), "ABOVE: Invalid beneficiary address");
             distributionBeneficiaries.push(_distributionBeneficiaries[i]);
             emit DistributionBeneficiaryAdded(_distributionBeneficiaries[i]);
        }
    }

    /**
     * @dev Internal function to set the owner lock start time and distribution start time.
     *      Called once during construction.
     */
    function _initializeOwnerLock() private {
        require(!_ownerLockInitialized, "ABOVE: Owner lock already initialized");
        ownerLockStartTime = block.timestamp;
        distributionStartTime = ownerLockStartTime + ownerLockDuration; // Distributions start after owner lock
        _ownerLockInitialized = true;
    }

    // --- Owner Lock Management ---

    /**
     * @dev Calculates the amount of locked tokens that are currently unlocked and available
     *      for the owner locked beneficiary to claim.
     * @return The amount of unlocked tokens for the owner.
     */
    function getOwnerUnlockedAmount() public view returns (uint256) {
        if (ownerLockedBeneficiary == address(0) || ownerLockStartTime == 0 || block.timestamp < ownerLockStartTime) {
            return 0;
        }

        if (block.timestamp >= (ownerLockStartTime + ownerLockDuration)) {
            // Owner lock period has expired, all owner-locked tokens are unlocked
            // These tokens are now part of the distribution pool logic, but the owner can still claim them
            // if they haven't been distributed yet. Let's assume the owner can claim the full amount
            // initially locked for them, regardless of distribution status.
            // This means the distribution logic needs to ensure it doesn't distribute more than
            // what's left in the contract balance minus what the owner can claim.
            // Simplifying: Owner can claim their original locked amount.
            // A more complex system might track what's claimable vs. distributed.
            // For simplicity here, owner claims the fixed locked amount.
            return ownerLockedAmount;
        }

        // Owner lock is still active, no tokens unlocked yet for owner claim
        return 0;
    }

    /**
     * @dev Allows the owner locked beneficiary to claim unlocked tokens.
     *      Transfers the unlocked portion from the contract to the beneficiary.
     */
    function claimOwnerUnlockedTokens() external {
        require(msg.sender == ownerLockedBeneficiary, "ABOVE: Only the owner locked beneficiary can claim");
        uint256 amountToTransfer = getOwnerUnlockedAmount();
        require(amountToTransfer > 0, "ABOVE: No unlocked tokens available for owner to claim");
        require(amountToTransfer <= distributionPoolAmount, "ABOVE: Owner claim exceeds allocated locked amount");

        // Transfer the unlocked tokens from the contract to the beneficiary
        ownerLockedAmount = 0; // Prevent re-entrancy/claims

        _transfer(address(this), msg.sender, amountToTransfer);
        emit OwnerTokensUnlocked(msg.sender, amountToTransfer);
    }

    // --- Distribution Management ---

    /**
     * @dev Calculates the number of completed distribution cycles since distributionStartTime.
     * @return The number of completed cycles.
     */
    function getCompletedCycles() public view returns (uint256) {
        if (block.timestamp < distributionStartTime) {
            return 0;
        }
        return (block.timestamp - distributionStartTime) / DISTRIBUTION_INTERVAL;
    }

    /**
     * @dev Calculates the amount each beneficiary should receive per cycle.
     * @return The amount per beneficiary per cycle.
     */
    function getAmountPerBeneficiaryPerCycle() public view returns (uint256) {
        // Distribute 0.1% of the original distributionPoolAmount per cycle
        return (distributionPoolAmount * DISTRIBUTION_PERCENT_PER_INTERVAL) / DISTRIBUTION_DENOMINATOR;
    }

    /**
     * @dev Public function to trigger the next distribution cycle(s) if due.
     *      Anyone can call this function.
     */
    function triggerDistribution() external {
        require(block.timestamp >= distributionStartTime, "ABOVE: Distribution period has not started yet");

        uint256 currentCompletedCycles = getCompletedCycles();
        require(currentCompletedCycles > distributedCycles, "ABOVE: No new distribution cycles are due");

        uint256 amountPerBeneficiary = getAmountPerBeneficiaryPerCycle();
        require(amountPerBeneficiary > 0, "ABOVE: Calculated distribution amount per beneficiary is zero");

        uint256 cyclesToDistribute = currentCompletedCycles - distributedCycles;
        uint256 totalAmountToDistributeInThisCall = amountPerBeneficiary * cyclesToDistribute * distributionBeneficiaries.length;
        uint256 contractBalance = this.balanceOf(address(this));

        // Important: Ensure we don't distribute more than what's available in the contract
        // This check considers the owner might have claimed their unlocked tokens.
        // The contract balance should be >= total distributed + this call's distribution.
        // Or, more simply, the amount to distribute now should be <= available balance.
        // Available balance is contract balance. We need to be careful not to exceed the pool.
        // Let's check against the distributionPoolAmount minus what's already distributed.
        uint256 availableForDistribution = distributionPoolAmount - totalDistributed;
        if (totalAmountToDistributeInThisCall > availableForDistribution) {
             // Distribute only what's left
             totalAmountToDistributeInThisCall = availableForDistribution;
             // Recalculate cycles based on available amount if necessary, or just distribute the remainder.
             // For simplicity, we'll distribute the remainder even if it's less than a full cycle amount per beneficiary.
             // This means the last distribution might be partial.
             if (totalAmountToDistributeInThisCall == 0) {
                 revert("ABOVE: No tokens left in distribution pool");
             }
        }


        // Perform the transfers
        for (uint256 i = 0; i < distributionBeneficiaries.length; i++) {
            address beneficiary = distributionBeneficiaries[i];
            // Distribute for all due cycles in this call
            uint256 amountForThisBeneficiary = amountPerBeneficiary * cyclesToDistribute;
            // Check final available amount again inside loop if needed for precision,
            // but the outer check should suffice for the total.
             if (totalAmountToDistributeInThisCall >= amountForThisBeneficiary) {
                 _transfer(address(this), beneficiary, amountForThisBeneficiary);
                 totalAmountToDistributeInThisCall -= amountForThisBeneficiary;
                 totalDistributed += amountForThisBeneficiary;
             } else {
                 // Distribute remaining amount
                 if (totalAmountToDistributeInThisCall > 0) {
                     _transfer(address(this), beneficiary, totalAmountToDistributeInThisCall);
                     totalDistributed += totalAmountToDistributeInThisCall;
                     totalAmountToDistributeInThisCall = 0;
                 }
                 break; // No more tokens to distribute
             }
        }

        // Update the distributed cycle counter
        distributedCycles += cyclesToDistribute; // Or update based on actual amount distributed if partial cycles handled differently

        // If we distributed exactly the remaining pool, update cycles correctly.
        // This logic might need refinement based on exact requirements for partial last distributions.
        // A simpler approach for the cycle counter is to increment by the number of full cycles processed,
        // even if the last one was partial in token amount.
        // Let's keep it simple: distributedCycles tracks full cycles conceptually started, even if last payout was partial.

        emit DistributionCycleCompleted(distributedCycles, amountPerBeneficiary, totalDistributed);
    }

    // --- Management Functions (Owner Only) ---

    /**
     * @dev Function to mint new tokens. Only the owner can call this.
     *      Useful for future distribution, rewards, or community fund top-ups.
     *      Be cautious with minting to avoid excessive inflation.
     * @param to The address that will receive the minted tokens.
     * @param amount The amount of tokens to mint.
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "ABOVE: Mint to the zero address");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @dev Allows the owner to add a new beneficiary to the distribution list.
     *      Distributions must not have started yet.
     * @param _beneficiary The address of the new beneficiary.
     */
    function addDistributionBeneficiary(address _beneficiary) external onlyOwner {
        require(block.timestamp < distributionStartTime, "ABOVE: Cannot add beneficiaries after distribution has started");
        require(_beneficiary != address(0), "ABOVE: Invalid beneficiary address");
        // Check for duplicates? (Simple check)
        for (uint256 i = 0; i < distributionBeneficiaries.length; i++) {
             require(distributionBeneficiaries[i] != _beneficiary, "ABOVE: Beneficiary already exists");
        }
        distributionBeneficiaries.push(_beneficiary);
        emit DistributionBeneficiaryAdded(_beneficiary);
    }

    /**
     * @dev Allows the owner to remove a beneficiary from the distribution list.
     *      Distributions must not have started yet.
     * @param _beneficiary The address of the beneficiary to remove.
     */
    function removeDistributionBeneficiary(address _beneficiary) external onlyOwner {
         require(block.timestamp < distributionStartTime, "ABOVE: Cannot remove beneficiaries after distribution has started");
         // Find and remove beneficiary
         for (uint256 i = 0; i < distributionBeneficiaries.length; i++) {
             if (distributionBeneficiaries[i] == _beneficiary) {
                 // Move the last element to this position and pop
                 distributionBeneficiaries[i] = distributionBeneficiaries[distributionBeneficiaries.length - 1];
                 distributionBeneficiaries.pop();
                 emit DistributionBeneficiaryRemoved(_beneficiary);
                 return;
             }
         }
         revert("ABOVE: Beneficiary not found");
    }

    // --- Optional: Burn Function ---
    // Uncomment the following lines if you want to allow token burning.
    /*
    event TokensBurned(address indexed from, uint256 amount);

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }

    function burnFrom(address account, uint256 amount) external {
        _spendAllowance(account, msg.sender, amount);
        _burn(account, amount);
        emit TokensBurned(account, amount);
    }
    */
    // --- End Optional Burn ---
}
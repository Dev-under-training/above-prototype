// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// No need for Ownable if owner functions are removed for testnet decentralization
// import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VoterRegistry
 * @dev Manages a list of eligible voter addresses for actions requiring registration (e.g., campaign creation).
 *      Testnet MVP: Only self-registration via `registerAsVoter` is allowed.
 *      Future versions might integrate DIDs/VCs/ZKPs for Sybil resistance and privacy.
 */
contract VoterRegistry /* is Ownable - Removed for testnet decentralization */ {

    // --- Data Structures ---
    // Mapping to store allowed voter addresses
    mapping(address => bool) private _allowedVoters;
    // Counter for the number of registered voters
    uint256 public allowedVoterCount;

    // --- Events ---
    // Event emitted when a voter registers themselves (primary testnet mechanism)
    event VoterRegistered(address indexed voter);
    // --- End Events ---

    /**
     * @dev Constructor.
     * Note: Ownership is not used for voter addition in this testnet version.
     */
    constructor() /* Ownable(msg.sender) - Ownership not needed for voter addition here */ { }

    // --- REMOVED: Owner-Controlled Voter Addition ---
    // These functions were removed to enforce decentralization for the testnet.
    // Voter addition is now only possible through self-registration.
    /*
    function addVoter(address _voter) external onlyOwner { ... }
    function addVoters(address[] calldata _voters) external onlyOwner { ... }
    */
    // --- END REMOVED ---

    // --- NEW: Self-Registration for Testnet (Primary Mechanism) ---
    /**
     * @dev Allows any user to register themselves as a voter.
     *      This is the core mechanism for testnet decentralization (e.g., for campaign creation).
     *      Future versions might add requirements (e.g., payment, VC verification).
     */
    function registerAsVoter() external {
        // Ensure the user isn't already registered
        require(!_allowedVoters[msg.sender], "VoterRegistry: You are already registered.");

        // Register the sender
        _allowedVoters[msg.sender] = true;
        allowedVoterCount += 1;

        // Emit event for successful self-registration
        emit VoterRegistered(msg.sender);
    }
    // --- END NEW ---

    /**
     * @dev Checks if an address is on the allowed voter list.
     *      Used by ABOVEBallot.sol to determine eligibility for campaign creation.
     * @param _voter The address to check.
     * @return bool True if the address is allowed, false otherwise.
     */
    function isAllowed(address _voter) external view returns (bool) {
        return _allowedVoters[_voter];
    }
}
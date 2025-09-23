// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol"; // Importing Ownable, but functions restricted

/**
 * @title VoterRegistry
 * @dev Manages a list of eligible voter addresses.
 *      Testnet MVP: Only self-registration via `registerAsVoter` is allowed.
 *      Owner retains contract ownership for potential future admin functions (e.g., upgrading logic if needed).
 *      Future versions will integrate DIDs/VCs/ZKPs for Sybil resistance and privacy.
 */
contract VoterRegistry /* is Ownable - Removing direct owner control over voter addition for testnet */ {

    // --- Data Structures ---
    // Mapping to store allowed voter addresses
    mapping(address => bool) private _allowedVoters;
    // Counter for the number of registered voters
    uint256 public allowedVoterCount;

    // --- Events ---
    // Event emitted when a voter registers themselves (primary testnet mechanism)
    event VoterRegistered(address indexed voter);
    // Optional: Event if owner needs to add (e.g., for initial setup or emergencies, but functions disabled)
    // event VoterAdded(address indexed voter); // Kept commented if needed for ABI compatibility, but functions removed.
    // --- End Events ---

    /**
     * @dev Constructor.
     * Note: Owner is set by Ownable, but owner functions for adding voters are removed/disabled.
     */
    constructor() /* Ownable(msg.sender) - Ownership exists but not used for voter addition here */ { }

    // --- REMOVED: Owner-Controlled Voter Addition ---
    /*
    // These functions are REMOVED or made non-functional for the decentralized testnet.
    // The owner can no longer directly add voters.
    function addVoter(address _voter) external onlyOwner { ... }
    function addVoters(address[] calldata _voters) external onlyOwner { ... }
    */
    // --- END REMOVED ---

    // --- NEW: Self-Registration for Testnet (Primary Mechanism) ---
    /**
     * @dev Allows any user to register themselves as a voter.
     *      This is the core mechanism for testnet decentralization.
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
     * @param _voter The address to check.
     * @return bool True if the address is allowed, false otherwise.
     */
    function isAllowed(address _voter) external view returns (bool) {
        return _allowedVoters[_voter];
    }
}
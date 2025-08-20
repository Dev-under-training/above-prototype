// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20; // Use a recent, stable Solidity version

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VoterRegistry
 * @dev A simple contract to manage a list of eligible voter addresses.
 *      This is a simplified version for the MVP. Future versions will integrate DIDs/VCs.
 */
contract VoterRegistry is Ownable {

    // Mapping to store allowed voter addresses
    mapping(address => bool) private _allowedVoters;
    // Counter for the number of registered voters
    uint256 public allowedVoterCount;

    // Event emitted when a voter is added
    event VoterAdded(address indexed voter);

    /**
     * @dev Constructor that sets the initial owner (e.g., election authority).
     */
    constructor() Ownable(msg.sender) {} // Updated for OpenZeppelin v5.x

    /**
     * @dev Adds a voter address to the allowed list.
     *      Only the contract owner can call this function.
     * @param _voter The address of the voter to be added.
     */
    function addVoter(address _voter) external onlyOwner {
        require(_voter != address(0), "VoterRegistry: Invalid voter address");
        require(!_allowedVoters[_voter], "VoterRegistry: Voter already registered");

        _allowedVoters[_voter] = true;
        allowedVoterCount += 1;
        emit VoterAdded(_voter);
    }

    /**
     * @dev Checks if an address is on the allowed voter list.
     * @param _voter The address to check.
     * @return bool True if the address is allowed, false otherwise.
     */
    function isAllowed(address _voter) external view returns (bool) {
        return _allowedVoters[_voter];
    }
}
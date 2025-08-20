// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
// We will interact with VoterRegistry via its address directly.

/**
 * @title ABOVEBallot
 * @dev A flexible smart contract for managing voting campaigns.
 *      Supports Basic Voting (single/multiple choice) and Ballot Type Voting (structured positions/candidates).
 *      Integrates with VoterRegistry for eligibility checks.
 *      This MVP version focuses on core logic and recording votes.
 *      Future versions will integrate advanced cryptography for anonymity.
 */
contract ABOVEBallot is Ownable {

    // --- Data Structures ---

    // Address of the deployed VoterRegistry contract
    address public voterRegistry;

    // Track if an address has voted to prevent double voting
    mapping(address => bool) public hasVoted;
    uint256 public totalVotesCast;

    // --- Basic Voting Campaign ---
    string[] public basicChoices;
    mapping(uint256 => uint256) public basicChoiceVotes;
    bool public isBasicSingleVote; // True = single selection, False = multiple allowed
    bool public isBasicCampaignSet;

    // --- Ballot Type Campaign ---
    struct Position {
        string name;
        uint8 maxSelections; // Max candidates a voter can select for this position
        uint256 candidateCount;
    }

    struct Candidate {
        string name;
        uint256 positionIndex; // Index in the `positions` array
        // Future: Add candidate ID, metadata, etc.
    }

    Position[] public positions;
    Candidate[] public candidates;
    mapping(uint256 => uint256) public candidateVotes; // key: candidate ID (index in `candidates` array)
    bool public isBallotCampaignFinalized;

    // Enum to track the active campaign type
    enum CampaignType { Undefined, Basic, Ballot }
    CampaignType public currentCampaignType;

    // --- Events ---
    event BasicCampaignSet(string[] choices, bool isSingleVote);
    event BallotPositionAdded(uint256 indexed positionIndex, string name, uint8 maxSelections);
    event CandidateAdded(uint256 indexed candidateId, string name, uint256 positionIndex);
    event BallotCampaignFinalized();
    event VoteCastBasic(address indexed voter, uint256[] selectedChoices);
    event VoteCastBallot(address indexed voter, uint256[] selectedCandidates);

    // --- Modifiers ---
    modifier onlyIfNotVoted() {
        require(!hasVoted[msg.sender], "ABOVEBallot: You have already voted.");
        _;
    }

    modifier onlyIfEligible() {
        // Interact with VoterRegistry contract to check eligibility
        // This uses low-level call for simplicity in MVP. Consider using an interface for type safety later.
        (bool success, bytes memory data) = voterRegistry.staticcall(
            abi.encodeWithSignature("isAllowed(address)", msg.sender)
        );
        require(success, "ABOVEBallot: Failed to check voter eligibility.");
        bool isAllowed = abi.decode(data, (bool));
        require(isAllowed, "ABOVEBallot: You are not eligible to vote.");
        _;
    }

    modifier onlyValidCampaignType(CampaignType requiredType) {
        require(currentCampaignType == requiredType, "ABOVEBallot: Incorrect campaign type for this action.");
        _;
    }

    // --- Constructor ---
    /**
     * @dev Constructor that sets the VoterRegistry address and the initial owner.
     * @param _voterRegistryAddress The address of the deployed VoterRegistry contract.
     */
    constructor(address _voterRegistryAddress) Ownable(msg.sender) {
        require(_voterRegistryAddress != address(0), "ABOVEBallot: Invalid VoterRegistry address");
        voterRegistry = _voterRegistryAddress;
        currentCampaignType = CampaignType.Undefined;
    }

    // --- Basic Voting Functions ---

    /**
     * @dev Sets up a basic voting campaign. Only the owner can call this.
     *      Can only be called if no campaign is currently active.
     * @param _choices The list of choices/options for voters.
     * @param _isSingleVote True if voters can only select one option, false for multiple selections.
     */
    function setBasicCampaign(string[] memory _choices, bool _isSingleVote) external onlyOwner {
        require(currentCampaignType == CampaignType.Undefined, "ABOVEBallot: A campaign is already set.");
        require(_choices.length > 0, "ABOVEBallot: Must provide at least one choice.");

        // Clear any previous data if needed (though Undefined state implies none)
        delete basicChoices;
        for (uint i = 0; i < _choices.length; i++) {
            basicChoices.push(_choices[i]);
            basicChoiceVotes[i] = 0; // Initialize vote counts
        }
        isBasicSingleVote = _isSingleVote;
        currentCampaignType = CampaignType.Basic;
        isBasicCampaignSet = true;

        emit BasicCampaignSet(_choices, _isSingleVote);
    }

    /**
     * @dev Allows an eligible voter to cast their vote(s) in a basic campaign.
     * @param _selectedChoiceIndices An array of indices corresponding to the chosen options in `basicChoices`.
     */
    function voteBasic(uint256[] memory _selectedChoiceIndices) external
        onlyIfEligible
        onlyIfNotVoted
        onlyValidCampaignType(CampaignType.Basic)
    {
        require(_selectedChoiceIndices.length > 0, "ABOVEBallot: You must select at least one choice.");
        if (isBasicSingleVote) {
            require(_selectedChoiceIndices.length == 1, "ABOVEBallot: Only one choice allowed in single-vote mode.");
        }

        // Validate choices
        for (uint i = 0; i < _selectedChoiceIndices.length; i++) {
            require(_selectedChoiceIndices[i] < basicChoices.length, "ABOVEBallot: Invalid choice index.");
        }

        // Record the vote(s)
        for (uint i = 0; i < _selectedChoiceIndices.length; i++) {
            basicChoiceVotes[_selectedChoiceIndices[i]] += 1;
        }
        hasVoted[msg.sender] = true;
        totalVotesCast += 1;

        emit VoteCastBasic(msg.sender, _selectedChoiceIndices);
    }

    /**
     * @dev Gets the results of the basic voting campaign.
     * @return choices The list of choices.
     * @return votes The corresponding vote counts for each choice.
     */
    function getBasicResults() external view returns (string[] memory choices, uint256[] memory votes) {
        require(currentCampaignType == CampaignType.Basic, "ABOVEBallot: No active basic campaign.");
        choices = basicChoices;
        votes = new uint256[](basicChoices.length);
        for (uint i = 0; i < basicChoices.length; i++) {
            votes[i] = basicChoiceVotes[i];
        }
        return (choices, votes);
    }


    // --- Ballot Type Voting Functions ---

    /**
     * @dev Adds a position for the ballot type campaign. Only the owner can call this.
     *      Can only be called before the ballot campaign is finalized.
     * @param _name The name of the position (e.g., "President").
     * @param _maxSelections The maximum number of candidates a voter can select for this position.
     */
    function addBallotPosition(string memory _name, uint8 _maxSelections) external onlyOwner {
        require(!isBallotCampaignFinalized, "ABOVEBallot: Ballot campaign is already finalized.");
        require(bytes(_name).length > 0, "ABOVEBallot: Position name cannot be empty.");
        // Optional: Add a check for _maxSelections > 0 and <= some reasonable limit

        uint256 newIndex = positions.length;
        positions.push(Position({name: _name, maxSelections: _maxSelections, candidateCount: 0}));

        emit BallotPositionAdded(newIndex, _name, _maxSelections);
    }

    /**
     * @dev Adds a candidate for a specific position in the ballot type campaign. Only the owner can call this.
     *      Can only be called before the ballot campaign is finalized.
     * @param _name The name of the candidate.
     * @param _positionIndex The index of the position this candidate is running for (from `positions` array).
     */
    function addCandidate(string memory _name, uint256 _positionIndex) external onlyOwner {
        require(!isBallotCampaignFinalized, "ABOVEBallot: Ballot campaign is already finalized.");
        require(bytes(_name).length > 0, "ABOVEBallot: Candidate name cannot be empty.");
        require(_positionIndex < positions.length, "ABOVEBallot: Invalid position index.");

        uint256 newCandidateId = candidates.length;
        candidates.push(Candidate({name: _name, positionIndex: _positionIndex}));
        positions[_positionIndex].candidateCount += 1; // Increment candidate count for the position

        emit CandidateAdded(newCandidateId, _name, _positionIndex);
    }

    /**
     * @dev Finalizes the ballot campaign setup. Only the owner can call this.
     *      After this, no more positions or candidates can be added.
     */
    function finalizeBallotSetup() external onlyOwner {
        require(!isBallotCampaignFinalized, "ABOVEBallot: Ballot campaign is already finalized.");
        require(positions.length > 0, "ABOVEBallot: Must have at least one position.");
        // Optional: Check that each position has at least one candidate

        // Initialize candidate vote counts
        for (uint i = 0; i < candidates.length; i++) {
            candidateVotes[i] = 0;
        }

        isBallotCampaignFinalized = true;
        currentCampaignType = CampaignType.Ballot;

        emit BallotCampaignFinalized();
    }

    /**
     * @dev Allows an eligible voter to cast their vote(s) in a ballot type campaign.
     *      Voters select candidates, respecting the max selections per position.
     * @param _selectedCandidateIds An array of candidate IDs (indices in `candidates` array) the voter is selecting.
     */
    function voteBallot(uint256[] memory _selectedCandidateIds) external
        onlyIfEligible
        onlyIfNotVoted
        onlyValidCampaignType(CampaignType.Ballot)
    {
        require(isBallotCampaignFinalized, "ABOVEBallot: Ballot campaign is not yet finalized.");
        require(_selectedCandidateIds.length > 0, "ABOVEBallot: You must select at least one candidate.");

        // --- Validation Logic ---
        // 1. Check for duplicate candidate selections
        // 2. Group selected candidates by position
        // 3. Check if selections per position exceed maxSelections

        // 1. Check for duplicates (simple nested loop for MVP)
        for (uint i = 0; i < _selectedCandidateIds.length; i++) {
            require(_selectedCandidateIds[i] < candidates.length, "ABOVEBallot: Invalid candidate ID.");
            for (uint j = i + 1; j < _selectedCandidateIds.length; j++) {
                 require(_selectedCandidateIds[i] != _selectedCandidateIds[j], "ABOVEBallot: Duplicate candidate selection not allowed.");
            }
        }

        // 2. & 3. Group by position and check limits
        // More efficient approach:
        for (uint p = 0; p < positions.length; p++) {
            uint8 selectionsForThisPosition = 0;
            for (uint i = 0; i < _selectedCandidateIds.length; i++) {
                uint256 candidateId = _selectedCandidateIds[i];
                if (candidates[candidateId].positionIndex == p) {
                    selectionsForThisPosition++;
                }
            }
            require(selectionsForThisPosition <= positions[p].maxSelections, "ABOVEBallot: Exceeded maximum selections for a position.");
        }

        // --- Record Votes ---
        for (uint i = 0; i < _selectedCandidateIds.length; i++) {
            candidateVotes[_selectedCandidateIds[i]] += 1;
        }
        hasVoted[msg.sender] = true;
        totalVotesCast += 1;

        emit VoteCastBallot(msg.sender, _selectedCandidateIds);
    }

    /**
     * @dev Gets the results of the ballot type voting campaign.
     * @return posData An array of position data (name, maxSelections, candidateCount).
     * @return candData An array of candidate data (name, positionIndex).
     * @return candVotes The corresponding vote counts for each candidate.
     */
    function getBallotResults() external view returns (Position[] memory posData, Candidate[] memory candData, uint256[] memory candVotes) {
        require(currentCampaignType == CampaignType.Ballot, "ABOVEBallot: No active ballot campaign.");
        require(isBallotCampaignFinalized, "ABOVEBallot: Ballot campaign is not yet finalized.");

        posData = positions;
        candData = candidates;
        candVotes = new uint256[](candidates.length);
        for (uint i = 0; i < candidates.length; i++) {
            candVotes[i] = candidateVotes[i];
        }
        return (posData, candData, candVotes);
    }

    // --- Utility Functions (Optional for MVP) ---
    // Functions to query individual vote status, total votes, etc., can be added here.
}

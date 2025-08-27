// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
// We will interact with VoterRegistry via its address directly.

/**
 * @title ABOVEBallot
 * @dev A flexible smart contract for managing multiple voting campaigns.
 *      Supports Basic Voting (single/multiple choice) and Ballot Type Voting (structured positions/candidates).
 *      Integrates with VoterRegistry for eligibility checks.
 *      Campaigns are identified by unique IDs for immutability and historical access.
 *      This MVP version focuses on core multi-campaign logic.
 *      Future versions will integrate advanced cryptography for anonymity.
 */
contract ABOVEBallot is Ownable {

    // --- Data Structures ---

    // Address of the deployed VoterRegistry contract
    address public voterRegistry;

    // --- Campaign Management ---
    uint256 private _nextCampaignId; // Counter for generating unique IDs

    enum CampaignType { Undefined, Basic, Ballot }

    struct Campaign {
        uint256 id;
        CampaignType campaignType;
        string description; // Moved description into the struct
        bool isActive; // Is this the "active" campaign for voting?
        bool isFinalized; // Is setup complete and voting closed?
        uint256 createdAt;
        uint256 finalizedAt; // Optional: timestamp when finalized
        // Future: Add start/end times for voting periods?
    }

    // Store campaign metadata by ID
    mapping(uint256 => Campaign) public campaigns;

    // --- Voting Tracking (per campaign) ---
    // Track if an address has voted in a specific campaign
    mapping(uint256 => mapping(address => bool)) public hasVotedInCampaign;
    mapping(uint256 => uint256) public totalVotesPerCampaign; // Total votes cast per campaign

    // --- Basic Voting Campaign Data (per campaign) ---
    mapping(uint256 => string[]) public basicChoicesByCampaign;
    mapping(uint256 => mapping(uint256 => uint256)) public basicChoiceVotesByCampaign;
    mapping(uint256 => bool) public isBasicSingleVoteByCampaign; // True = single selection, False = multiple allowed

    // --- Ballot Type Campaign Data (per campaign) ---
    struct Position {
        string name;
        uint8 maxSelections;
        uint256 candidateCount;
        // Future: Add metadata?
    }

    struct Candidate {
        string name;
        uint256 positionIndex; // Index in the `positions` array for this campaign
        // Future: Add candidate ID, metadata, etc.
    }

    mapping(uint256 => Position[]) public positionsByCampaign;
    mapping(uint256 => Candidate[]) public candidatesByCampaign;
    mapping(uint256 => mapping(uint256 => uint256)) public candidateVotesByCampaign; // key: (campaignId, candidate ID)

    // --- Events ---
    // Update events to include campaignId
    event CampaignCreated(uint256 indexed campaignId, CampaignType campaignType, string description);
    event CampaignDescriptionSet(uint256 indexed campaignId, string description);
    event CampaignActivated(uint256 indexed campaignId); // New event for activation
    event CampaignDeactivated(uint256 indexed campaignId); // New event for deactivation
    event BasicCampaignSet(uint256 indexed campaignId, string[] choices, bool isSingleVote);
    event BallotPositionAdded(uint256 indexed campaignId, uint256 indexed positionIndex, string name, uint8 maxSelections);
    event CandidateAdded(uint256 indexed campaignId, uint256 indexed candidateId, string name, uint256 positionIndex);
    event BallotCampaignFinalized(uint256 indexed campaignId);
    event VoteCastBasic(uint256 indexed campaignId, address indexed voter, uint256[] selectedChoices);
    event VoteCastBallot(uint256 indexed campaignId, address indexed voter, uint256[] selectedCandidates);
    // --- End Events ---

    // --- Modifiers ---
    // Update modifiers to work with campaignId
    modifier onlyIfNotVoted(uint256 campaignId) {
        require(!hasVotedInCampaign[campaignId][msg.sender], "ABOVEBallot: You have already voted in this campaign.");
        _;
    }

    modifier onlyIfEligible() {
        // Interact with VoterRegistry contract to check eligibility
        (bool success, bytes memory data) = voterRegistry.staticcall(
            abi.encodeWithSignature("isAllowed(address)", msg.sender)
        );
        require(success, "ABOVEBallot: Failed to check voter eligibility.");
        bool isAllowed = abi.decode(data, (bool));
        require(isAllowed, "ABOVEBallot: You are not eligible to vote.");
        _;
    }

    modifier onlyValidCampaign(uint256 campaignId) {
        require(campaigns[campaignId].id != 0, "ABOVEBallot: Invalid campaign ID.");
        _;
    }

    modifier onlyActiveCampaign(uint256 campaignId) {
        require(campaigns[campaignId].isActive, "ABOVEBallot: Campaign is not active.");
        _;
    }

    modifier onlyUnfinalizedCampaign(uint256 campaignId) {
        require(!campaigns[campaignId].isFinalized, "ABOVEBallot: Campaign is already finalized.");
        _;
    }

    modifier onlyFinalizedCampaign(uint256 campaignId) {
        require(campaigns[campaignId].isFinalized, "ABOVEBallot: Campaign is not yet finalized.");
        _;
    }

    modifier onlyBasicCampaign(uint256 campaignId) {
        require(campaigns[campaignId].campaignType == CampaignType.Basic, "ABOVEBallot: Campaign is not a Basic type.");
        _;
    }

    modifier onlyBallotCampaign(uint256 campaignId) {
        require(campaigns[campaignId].campaignType == CampaignType.Ballot, "ABOVEBallot: Campaign is not a Ballot type.");
        _;
    }
    // --- End Modifiers ---

    // --- Constructor ---
    /**
     * @dev Constructor that sets the VoterRegistry address and the initial owner.
     * @param _voterRegistryAddress The address of the deployed VoterRegistry contract.
     */
    constructor(address _voterRegistryAddress) Ownable(msg.sender) {
        require(_voterRegistryAddress != address(0), "ABOVEBallot: Invalid VoterRegistry address");
        voterRegistry = _voterRegistryAddress;
        _nextCampaignId = 1; // Start IDs from 1
    }
    // --- End Constructor ---

    // --- Campaign Management Functions ---

    /**
     * @dev Creates a new campaign entry. Only the owner can call this.
     * @param _description A description for the campaign.
     * @param _type The type of campaign (Basic or Ballot).
     * @return campaignId The unique ID of the newly created campaign.
     */
    function createCampaign(string memory _description, CampaignType _type) external onlyOwner returns (uint256 campaignId) {
        require(_type != CampaignType.Undefined, "ABOVEBallot: Campaign type cannot be Undefined.");
        campaignId = _nextCampaignId;
        _nextCampaignId++;

        campaigns[campaignId] = Campaign({
            id: campaignId,
            campaignType: _type,
            description: _description,
            isActive: false, // Created campaigns start inactive
            isFinalized: false,
            createdAt: block.timestamp,
            finalizedAt: 0
        });

        emit CampaignCreated(campaignId, _type, _description);
        return campaignId;
    }

    /**
     * @dev Sets the description for a specific campaign.
     *      Only the owner can call this.
     *      Can be called before or after finalization.
     * @param campaignId The ID of the campaign.
     * @param _description The description of the campaign.
     */
    function setCampaignDescription(uint256 campaignId, string calldata _description) external
        onlyOwner
        onlyValidCampaign(campaignId)
    {
        // Allow setting description even if active or finalized?
        // require(!campaigns[campaignId].isFinalized, "..."); // Optional restriction
        campaigns[campaignId].description = _description;
        emit CampaignDescriptionSet(campaignId, _description);
    }

    /**
     * @dev Activates a campaign for voting. Only the owner can call this.
     *      Deactivates any currently active campaign.
     * @param campaignId The ID of the campaign to activate.
     */
    function activateCampaign(uint256 campaignId) external onlyOwner onlyValidCampaign(campaignId) onlyUnfinalizedCampaign(campaignId) {
        // Deactivate the currently active campaign, if any
        for (uint256 i = 1; i < _nextCampaignId; i++) {
            if (campaigns[i].isActive) {
                campaigns[i].isActive = false;
                emit CampaignDeactivated(i);
            }
        }
        campaigns[campaignId].isActive = true;
        emit CampaignActivated(campaignId);
    }

    /**
     * @dev Deactivates a campaign. Only the owner can call this.
     * @param campaignId The ID of the campaign to deactivate.
     */
     function deactivateCampaign(uint256 campaignId) external onlyOwner onlyValidCampaign(campaignId) {
        // Check if it's the active campaign
        if (campaigns[campaignId].isActive) {
            campaigns[campaignId].isActive = false;
            emit CampaignDeactivated(campaignId);
        }
        // If it's not active, this call effectively does nothing but is allowed.
     }


    // --- Basic Voting Functions (Updated to use campaignId) ---

    /**
     * @dev Sets up a basic voting campaign. Only the owner can call this.
     *      Can only be called if the campaign is not yet finalized.
     * @param campaignId The ID of the campaign to configure.
     * @param _choices The list of choices/options for voters.
     * @param _isSingleVote True if voters can only select one option, false for multiple selections.
     */
    function setBasicCampaign(uint256 campaignId, string[] memory _choices, bool _isSingleVote) external
        onlyOwner
        onlyValidCampaign(campaignId)
        onlyUnfinalizedCampaign(campaignId)
        onlyBasicCampaign(campaignId) // Ensure the campaign type is Basic
    {
        require(_choices.length > 0, "ABOVEBallot: Must provide at least one choice.");

        // Clear any previous data if needed (though should be empty for a new campaign)
        delete basicChoicesByCampaign[campaignId];
        for (uint i = 0; i < _choices.length; i++) {
            basicChoicesByCampaign[campaignId].push(_choices[i]);
            basicChoiceVotesByCampaign[campaignId][i] = 0; // Initialize vote counts
        }
        isBasicSingleVoteByCampaign[campaignId] = _isSingleVote;

        emit BasicCampaignSet(campaignId, _choices, _isSingleVote);
    }

    /**
     * @dev Allows an eligible voter to cast their vote(s) in a basic campaign.
     * @param campaignId The ID of the campaign to vote in.
     * @param _selectedChoiceIndices An array of indices corresponding to the chosen options.
     */
    function voteBasic(uint256 campaignId, uint256[] memory _selectedChoiceIndices) external
        onlyIfEligible
        onlyIfNotVoted(campaignId)
        onlyValidCampaign(campaignId)
        onlyActiveCampaign(campaignId)
        onlyBasicCampaign(campaignId)
    {
        require(_selectedChoiceIndices.length > 0, "ABOVEBallot: You must select at least one choice.");
        if (isBasicSingleVoteByCampaign[campaignId]) {
            require(_selectedChoiceIndices.length == 1, "ABOVEBallot: Only one choice allowed in single-vote mode.");
        }

        string[] storage choicesForCampaign = basicChoicesByCampaign[campaignId];
        // Validate choices
        for (uint i = 0; i < _selectedChoiceIndices.length; i++) {
            require(_selectedChoiceIndices[i] < choicesForCampaign.length, "ABOVEBallot: Invalid choice index.");
        }

        // Record the vote(s)
        for (uint i = 0; i < _selectedChoiceIndices.length; i++) {
            basicChoiceVotesByCampaign[campaignId][_selectedChoiceIndices[i]] += 1;
        }
        hasVotedInCampaign[campaignId][msg.sender] = true;
        totalVotesPerCampaign[campaignId] += 1;

        emit VoteCastBasic(campaignId, msg.sender, _selectedChoiceIndices);
    }

    /**
     * @dev Gets the results of a specific basic voting campaign.
     * @param campaignId The ID of the campaign.
     * @return choices The list of choices.
     * @return votes The corresponding vote counts for each choice.
     */
    function getBasicResults(uint256 campaignId) external view
        onlyValidCampaign(campaignId)
        onlyBasicCampaign(campaignId)
        onlyFinalizedCampaign(campaignId) // Or allow viewing results of active campaigns?
        returns (string[] memory choices, uint256[] memory votes)
    {
        choices = basicChoicesByCampaign[campaignId];
        votes = new uint256[](choices.length);
        for (uint i = 0; i < choices.length; i++) {
            votes[i] = basicChoiceVotesByCampaign[campaignId][i];
        }
        return (choices, votes);
    }

    // --- Ballot Type Voting Functions (Updated to use campaignId) ---

    /**
     * @dev Adds a position for the ballot type campaign. Only the owner can call this.
     *      Can only be called before the ballot campaign is finalized.
     * @param campaignId The ID of the campaign.
     * @param _name The name of the position.
     * @param _maxSelections The maximum number of candidates a voter can select for this position.
     */
    function addBallotPosition(uint256 campaignId, string memory _name, uint8 _maxSelections) external
        onlyOwner
        onlyValidCampaign(campaignId)
        onlyUnfinalizedCampaign(campaignId)
        onlyBallotCampaign(campaignId)
    {
        require(bytes(_name).length > 0, "ABOVEBallot: Position name cannot be empty.");

        uint256 newIndex = positionsByCampaign[campaignId].length;
        positionsByCampaign[campaignId].push(Position({name: _name, maxSelections: _maxSelections, candidateCount: 0}));

        emit BallotPositionAdded(campaignId, newIndex, _name, _maxSelections);
    }

    /**
     * @dev Adds a candidate for a specific position in the ballot type campaign. Only the owner can call this.
     *      Can only be called before the ballot campaign is finalized.
     * @param campaignId The ID of the campaign.
     * @param _name The name of the candidate.
     * @param _positionIndex The index of the position this candidate is running for.
     */
    function addCandidate(uint256 campaignId, string memory _name, uint256 _positionIndex) external
        onlyOwner
        onlyValidCampaign(campaignId)
        onlyUnfinalizedCampaign(campaignId)
        onlyBallotCampaign(campaignId)
    {
        require(bytes(_name).length > 0, "ABOVEBallot: Candidate name cannot be empty.");
        require(_positionIndex < positionsByCampaign[campaignId].length, "ABOVEBallot: Invalid position index.");

        uint256 newCandidateId = candidatesByCampaign[campaignId].length;
        candidatesByCampaign[campaignId].push(Candidate({name: _name, positionIndex: _positionIndex}));
        positionsByCampaign[campaignId][_positionIndex].candidateCount += 1;

        emit CandidateAdded(campaignId, newCandidateId, _name, _positionIndex);
    }

    /**
     * @dev Finalizes the ballot campaign setup. Only the owner can call this.
     *      After this, no more positions or candidates can be added.
     * @param campaignId The ID of the campaign to finalize.
     */
    function finalizeBallotSetup(uint256 campaignId) external
        onlyOwner
        onlyValidCampaign(campaignId)
        onlyUnfinalizedCampaign(campaignId)
        onlyBallotCampaign(campaignId)
    {
        require(positionsByCampaign[campaignId].length > 0, "ABOVEBallot: Must have at least one position.");

        // Initialize candidate vote counts
        Candidate[] storage candidatesForCampaign = candidatesByCampaign[campaignId];
        for (uint i = 0; i < candidatesForCampaign.length; i++) {
            candidateVotesByCampaign[campaignId][i] = 0;
        }

        campaigns[campaignId].isFinalized = true;
        campaigns[campaignId].finalizedAt = block.timestamp;

        emit BallotCampaignFinalized(campaignId);
    }

    /**
     * @dev Allows an eligible voter to cast their vote(s) in a ballot type campaign.
     * @param campaignId The ID of the campaign to vote in.
     * @param _selectedCandidateIds An array of candidate IDs the voter is selecting.
     */
    function voteBallot(uint256 campaignId, uint256[] memory _selectedCandidateIds) external
        onlyIfEligible
        onlyIfNotVoted(campaignId)
        onlyValidCampaign(campaignId)
        onlyActiveCampaign(campaignId)
        onlyBallotCampaign(campaignId)
        onlyFinalizedCampaign(campaignId) // Ballot campaigns must be finalized before voting
    {
        require(_selectedCandidateIds.length > 0, "ABOVEBallot: You must select at least one candidate.");
        Candidate[] storage candidatesForCampaign = candidatesByCampaign[campaignId];
        Position[] storage positionsForCampaign = positionsByCampaign[campaignId];

        // --- Validation Logic (similar to before, but scoped to campaign) ---
        // 1. Check for duplicate candidate selections
        for (uint i = 0; i < _selectedCandidateIds.length; i++) {
            require(_selectedCandidateIds[i] < candidatesForCampaign.length, "ABOVEBallot: Invalid candidate ID.");
            for (uint j = i + 1; j < _selectedCandidateIds.length; j++) {
                 require(_selectedCandidateIds[i] != _selectedCandidateIds[j], "ABOVEBallot: Duplicate candidate selection not allowed.");
            }
        }

        // 2. & 3. Group by position and check limits
        for (uint p = 0; p < positionsForCampaign.length; p++) {
            uint8 selectionsForThisPosition = 0;
            for (uint i = 0; i < _selectedCandidateIds.length; i++) {
                uint256 candidateId = _selectedCandidateIds[i];
                if (candidatesForCampaign[candidateId].positionIndex == p) {
                    selectionsForThisPosition++;
                }
            }
            require(selectionsForThisPosition <= positionsForCampaign[p].maxSelections, "ABOVEBallot: Exceeded maximum selections for a position.");
        }

        // --- Record Votes ---
        for (uint i = 0; i < _selectedCandidateIds.length; i++) {
            candidateVotesByCampaign[campaignId][_selectedCandidateIds[i]] += 1;
        }
        hasVotedInCampaign[campaignId][msg.sender] = true;
        totalVotesPerCampaign[campaignId] += 1;

        emit VoteCastBallot(campaignId, msg.sender, _selectedCandidateIds);
    }

    /**
     * @dev Gets the results of a specific ballot type voting campaign.
     * @param campaignId The ID of the campaign.
     * @return posData An array of position data.
     * @return candData An array of candidate data.
     * @return candVotes The corresponding vote counts for each candidate.
     */
    function getBallotResults(uint256 campaignId) external view
        onlyValidCampaign(campaignId)
        onlyBallotCampaign(campaignId)
        onlyFinalizedCampaign(campaignId)
        returns (Position[] memory posData, Candidate[] memory candData, uint256[] memory candVotes)
    {
        posData = positionsByCampaign[campaignId];
        candData = candidatesByCampaign[campaignId];
        candVotes = new uint256[](candData.length);
        for (uint i = 0; i < candData.length; i++) {
            candVotes[i] = candidateVotesByCampaign[campaignId][i];
        }
        return (posData, candData, candVotes);
    }

    /**
     * @dev Gets the metadata of a specific campaign.
     * @param campaignId The ID of the campaign.
     * @return The Campaign struct.
     */
    function getCampaign(uint256 campaignId) external view onlyValidCampaign(campaignId) returns (Campaign memory) {
        return campaigns[campaignId];
    }

    /**
     * @dev Gets the next campaign ID that will be assigned.
     * @return The next campaign ID.
     */
    function getNextCampaignId() external view returns (uint256) {
        return _nextCampaignId;
    }

    // --- Utility Functions ---
    // Functions to query individual vote status, total votes per campaign, etc., can be added here.
    // Example: A function to list all campaign IDs or get active campaign ID.
}
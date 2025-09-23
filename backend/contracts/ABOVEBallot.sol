// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol"; // Import IERC20 for ABOVE token interaction

/**
 * @title ABOVEBallot
 * @dev A flexible smart contract for managing multiple voting campaigns.
 *      Supports Basic Voting (single/multiple choice) and Ballot Type Voting (structured positions/candidates).
 *      Integrates with VoterRegistry for eligibility checks.
 *      Campaigns are identified by unique IDs for immutability and historical access.
 *      Integrates with the native ABOVE token for campaign creation fees and voter rewards.
 *      Campaign creation is decentralized (anyone can create, paying a fee).
 *      Campaign configuration is restricted to the creator.
 *      Voter eligibility is simplified for testnet (must hold ABOVE tokens).
 *      This version focuses on core multi-campaign logic with tokenomics and decentralization.
 *      Future versions will integrate advanced cryptography for anonymity.
 *      Introduces an 'endCampaign' function for formal conclusion and result recording.
 */
contract ABOVEBallot /* is Ownable - Role changed, global owner for admin functions like setting fees */ {

    // --- Token Integration ---
    IERC20 public immutable aboveToken; // Address of the deployed ABOVE token contract

    // --- Token Economics ---
    // Example fee: 36.631295142723603933 ABOVE tokens (represented in smallest unit, wei)
    uint256 public constant CAMPAIGN_CREATION_FEE = 36631295142723603933 wei;
    // Example reward calculation: Ru = Tu * (0.1618 / 100)
    // Represented via integer arithmetic: (balance * 1618) / 1000000
    // This means D = 0.1618%
    uint256 public constant VOTER_REWARD_DIVISOR = 1000000; // Denominator for reward calculation
    uint256 public constant VOTER_REWARD_MULTIPLIER = 1618; // Numerator for reward calculation (0.1618%)

    // --- Data Structures ---
    // Address of the deployed VoterRegistry contract (kept for potential future use or admin functions)
    address public voterRegistry;

    // --- Campaign Management ---
    uint256 private _nextCampaignId; // Counter for generating unique IDs

    enum CampaignType { Undefined, Basic, Ballot }

    struct Campaign {
        uint256 id;
        CampaignType campaignType;
        string description;
        bool isActive; // Is this the "active" campaign for voting?
        bool isFinalized; // Is setup complete and voting closed?
        uint256 createdAt;
        uint256 finalizedAt; // Optional: timestamp when finalized
        address creator; // <-- NEW: Record the creator of the campaign
        // Future: Add start/end times for voting periods?
    }

    // Store campaign metadata by ID
    mapping(uint256 => Campaign) public campaigns;

    // --- NEW: Dynamic Counters for Efficient Reset ---
    // Track the number of choices/candidates for efficient clearing in resetCampaign
    mapping(uint256 => uint256) private _basicChoiceCounts;
    mapping(uint256 => uint256) private _ballotCandidateCounts;
    // --- END NEW ---

    // --- NEW: Persistent Storage for Final Campaign Results ---
    // These mappings store the final, immutable results of a campaign upon ending.
    mapping(uint256 => string[]) public finalBasicChoicesByCampaign;
    mapping(uint256 => uint256[]) public finalBasicVotesByCampaign;
    mapping(uint256 => Position[]) public finalBallotPositionsByCampaign;
    mapping(uint256 => Candidate[]) public finalBallotCandidatesByCampaign;
    mapping(uint256 => uint256[]) public finalBallotCandidateVotesByCampaign;
    // --- END NEW ---

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
    // Update events to include campaignId and potentially creator
    event CampaignCreated(uint256 indexed campaignId, CampaignType campaignType, string description, address indexed creator); // <-- UPDATED EVENT
    event CampaignDescriptionSet(uint256 indexed campaignId, string description);
    event CampaignActivated(uint256 indexed campaignId); // New event for activation
    event CampaignDeactivated(uint256 indexed campaignId); // New event for deactivation
    event BasicCampaignSet(uint256 indexed campaignId, string[] choices, bool isSingleVote);
    event BallotPositionAdded(uint256 indexed campaignId, uint256 indexed positionIndex, string name, uint8 maxSelections);
    event CandidateAdded(uint256 indexed campaignId, uint256 indexed candidateId, string name, uint256 positionIndex);
    event CandidatesAdded(uint256 indexed campaignId, uint256 indexed positionIndex, uint256 count); // New event for batch add
    event BallotCampaignFinalized(uint256 indexed campaignId);
    event VoteCastBasic(uint256 indexed campaignId, address indexed voter, uint256[] selectedChoices);
    event VoteCastBallot(uint256 indexed campaignId, address indexed voter, uint256[] selectedCandidates);
    // --- REMOVED: CampaignReset event ---
    // event CampaignReset(uint256 indexed campaignId);
    // --- END REMOVED ---
    // --- NEW EVENT for End Campaign ---
    /**
     * @dev Emitted when a campaign is formally ended by its creator.
     *      Indicates that final results have been recorded on-chain.
     * @param campaignId The ID of the campaign that was ended.
     */
    event CampaignEnded(uint256 indexed campaignId);
    // --- END NEW EVENT ---
    // --- Token Events ---
    event CampaignCreationFeePaid(address indexed creator, uint256 amount);
    event VoterRewarded(address indexed voter, uint256 amount); // Amount now reflects dynamic calculation
    // --- End Token Events ---

    // --- Modifiers ---
    // Update modifiers to work with campaignId
    modifier onlyIfNotVoted(uint256 campaignId) {
        require(!hasVotedInCampaign[campaignId][msg.sender], "ABOVEBallot: You have already voted in this campaign.");
        _;
    }

    // --- UPDATED MODIFIER for Simplified Testnet Eligibility ---
    /**
     * @dev Modifier to check if the sender is eligible to vote.
     *      For this testnet version, eligibility is determined by holding > 0 ABOVE tokens.
     */
    modifier onlyIfEligible() {
        require(IERC20(aboveToken).balanceOf(msg.sender) > 0, "ABOVEBallot: Must hold ABOVE tokens to vote (Testnet).");
        _;
    }
    // --- END UPDATED MODIFIER ---

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

    // --- NEW MODIFIER for Creator-Restricted Actions ---
    /**
     * @dev Modifier to restrict access to the creator of a specific campaign.
     * @param campaignId The ID of the campaign.
     */
    modifier onlyCampaignCreator(uint256 campaignId) {
        require(campaigns[campaignId].creator == msg.sender, "ABOVEBallot: Only the campaign creator can perform this action.");
        _;
    }
    // --- END NEW MODIFIER ---

    // --- Constructor ---
    /**
     * @dev Constructor that sets the VoterRegistry address, the ABOVE token address, and potentially the initial owner for admin functions.
     * @param _voterRegistryAddress The address of the deployed VoterRegistry contract.
     * @param _aboveTokenAddress The address of the deployed ABOVE token contract.
     */
    constructor(address _voterRegistryAddress, address _aboveTokenAddress) /* Ownable(msg.sender) - Optional: Keep for global admin if needed */ {
        require(_voterRegistryAddress != address(0), "ABOVEBallot: Invalid VoterRegistry address");
        require(_aboveTokenAddress != address(0), "ABOVEBallot: Invalid ABOVE token address");
        voterRegistry = _voterRegistryAddress;
        aboveToken = IERC20(_aboveTokenAddress); // Initialize the token interface
        _nextCampaignId = 1; // Start IDs from 1
        // Transfer ownership if using Ownable for global admin
        // transferOwnership(msg.sender); // Uncomment if using Ownable for global admin functions
    }
    // --- End Constructor ---

    // --- Campaign Management Functions ---

    /**
     * @dev Creates a new campaign entry. Anyone can call this, provided they pay the fee.
     *      Requires payment of CAMPAIGN_CREATION_FEE in ABOVE tokens.
     * @param _description A description for the campaign.
     * @param _type The type of campaign (Basic or Ballot).
     * @return campaignId The unique ID of the newly created campaign.
     */
    function createCampaign(string memory _description, CampaignType _type) external /* onlyOwner REMOVED */ returns (uint256 campaignId) {
        require(_type != CampaignType.Undefined, "ABOVEBallot: Campaign type cannot be Undefined.");

        // --- Token Fee Collection ---
        // Require the creator to have pre-approved the ABOVEBallot contract to spend the fee
        require(aboveToken.allowance(msg.sender, address(this)) >= CAMPAIGN_CREATION_FEE, "ABOVEBallot: Insufficient ABOVE token allowance for campaign creation fee.");
        // Transfer the fee from the creator to this contract
        require(aboveToken.transferFrom(msg.sender, address(this), CAMPAIGN_CREATION_FEE), "ABOVEBallot: Campaign creation fee transfer failed.");
        emit CampaignCreationFeePaid(msg.sender, CAMPAIGN_CREATION_FEE);
        // --- End Token Fee Collection ---

        campaignId = _nextCampaignId;
        _nextCampaignId++;

        campaigns[campaignId] = Campaign({
            id: campaignId,
            campaignType: _type,
            description: _description,
            isActive: false, // Created campaigns start inactive
            isFinalized: false,
            createdAt: block.timestamp,
            finalizedAt: 0,
            creator: msg.sender // <-- RECORD CREATOR
        });

        emit CampaignCreated(campaignId, _type, _description, msg.sender); // <-- EMIT CREATOR IN EVENT
        return campaignId;
    }

    /**
     * @dev Sets the description for a specific campaign.
     *      Only the campaign creator can call this.
     *      Can be called before or after finalization.
     * @param campaignId The ID of the campaign.
     * @param _description The description of the campaign.
     */
    function setCampaignDescription(uint256 campaignId, string calldata _description) external
        onlyCampaignCreator(campaignId) // <-- USE NEW MODIFIER
        onlyValidCampaign(campaignId)
    {
        // Allow setting description even if active or finalized?
        // require(!campaigns[campaignId].isFinalized, "..."); // Optional restriction
        campaigns[campaignId].description = _description;
        emit CampaignDescriptionSet(campaignId, _description);
    }

    /**
     * @dev Activates a campaign for voting.
     *      Only the campaign creator can call this.
     *      Deactivates any currently active campaign.
     *      NOTE: Activation is now allowed for finalized campaigns (e.g., to reactivate results).
     * @param campaignId The ID of the campaign to activate.
     */
    function activateCampaign(uint256 campaignId) external
        onlyCampaignCreator(campaignId) // <-- USE NEW MODIFIER
        onlyValidCampaign(campaignId)
        /* onlyUnfinalizedCampaign removed */
    {
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
     * @dev Deactivates a campaign.
     *      Only the campaign creator can call this.
     * @param campaignId The ID of the campaign to deactivate.
     */
     function deactivateCampaign(uint256 campaignId) external
        onlyCampaignCreator(campaignId) // <-- USE NEW MODIFIER
        onlyValidCampaign(campaignId)
     {
        // Check if it's the active campaign
        if (campaigns[campaignId].isActive) {
            campaigns[campaignId].isActive = false;
            emit CampaignDeactivated(campaignId);
        }
        // If it's not active, this call effectively does nothing but is allowed.
     }

    // --- REMOVED: resetCampaign function ---
    /*
    function resetCampaign(uint256 campaignId) external
        onlyOwner // Or onlyCampaignCreator if that was the intended restriction
        onlyValidCampaign(campaignId)
        onlyFinalizedCampaign(campaignId)
    {
        // --- Clear Basic Campaign Data (if applicable) ---
        if (campaigns[campaignId].campaignType == CampaignType.Basic) {
            delete basicChoicesByCampaign[campaignId];
            uint256 choiceCount = _basicChoiceCounts[campaignId];
            for (uint256 i = 0; i < choiceCount; i++) {
                 delete basicChoiceVotesByCampaign[campaignId][i];
            }
            delete isBasicSingleVoteByCampaign[campaignId];
            delete _basicChoiceCounts[campaignId];
        }

        // --- Clear Ballot Campaign Data (if applicable) ---
        if (campaigns[campaignId].campaignType == CampaignType.Ballot) {
            delete positionsByCampaign[campaignId];
            delete candidatesByCampaign[campaignId];
            uint256 candidateCount = _ballotCandidateCounts[campaignId];
            for (uint256 i = 0; i < candidateCount; i++) {
                 delete candidateVotesByCampaign[campaignId][i];
            }
            delete _ballotCandidateCounts[campaignId];
        }

        // --- Clear General Voting Tracking for this Campaign ---
        delete totalVotesPerCampaign[campaignId];

        // --- Reset Campaign Metadata Flags ---
        Campaign storage campaign = campaigns[campaignId];
        campaign.isActive = false;
        campaign.isFinalized = false;
        campaign.finalizedAt = 0;

        emit CampaignReset(campaignId);
    }
    */
    // --- END REMOVED ---

    // --- NEW FUNCTION: End Campaign ---
    /**
     * @dev Allows the creator of a campaign to formally end it.
     *      This action records the final vote counts and candidate/choice data on-chain.
     *      It prevents further voting and marks the campaign as concluded.
     *      Emits a `CampaignEnded` event with the final results.
     * @param campaignId The ID of the campaign to end.
     */
    function endCampaign(uint256 campaignId) external
        onlyCampaignCreator(campaignId) // Ensure only the creator can end their campaign
        onlyValidCampaign(campaignId)
        onlyFinalizedCampaign(campaignId) // Only allow ending finalized campaigns
    {
        Campaign storage campaign = campaigns[campaignId];

        // --- Record Final Results ---
        // For Basic Campaigns
        if (campaign.campaignType == CampaignType.Basic) {
            string[] storage choices = basicChoicesByCampaign[campaignId];
            uint256[] memory votes = new uint256[](choices.length);
            for (uint i = 0; i < choices.length; i++) {
                votes[i] = basicChoiceVotesByCampaign[campaignId][i];
            }
            // Store final results in persistent mappings
            for (uint i = 0; i < choices.length; i++) {
                finalBasicChoicesByCampaign[campaignId].push(choices[i]);
                finalBasicVotesByCampaign[campaignId].push(votes[i]);
            }
        }
        // For Ballot Campaigns
        else if (campaign.campaignType == CampaignType.Ballot) {
            Position[] storage positions = positionsByCampaign[campaignId];
            Candidate[] storage candidates = candidatesByCampaign[campaignId];
            uint256[] memory candidateVotes = new uint256[](candidates.length);
            for (uint i = 0; i < candidates.length; i++) {
                candidateVotes[i] = candidateVotesByCampaign[campaignId][i];
            }
            // Store final results in persistent mappings
            for (uint i = 0; i < positions.length; i++) {
                finalBallotPositionsByCampaign[campaignId].push(positions[i]);
            }
            for (uint i = 0; i < candidates.length; i++) {
                finalBallotCandidatesByCampaign[campaignId].push(candidates[i]);
                finalBallotCandidateVotesByCampaign[campaignId].push(candidateVotes[i]);
            }
        }

        // --- Mark Campaign as Ended (Deactivate if active) ---
        if (campaign.isActive) {
            campaign.isActive = false;
            emit CampaignDeactivated(campaignId);
        }
        // Note: Consider adding an 'isEnded' flag to the Campaign struct if you need
        // a distinct state from 'isFinalized' and '!isActive'.

        emit CampaignEnded(campaignId); // Emit the new event
    }
    // --- END NEW FUNCTION ---

    // --- Basic Voting Functions (Updated to use campaignId and creator restrictions) ---

    /**
     * @dev Sets up a basic voting campaign.
     *      Only the campaign creator can call this.
     *      Can only be called if the campaign is not yet finalized.
     *      Finalizes the campaign upon setup.
     * @param campaignId The ID of the campaign to configure.
     * @param _choices The list of choices/options for voters.
     * @param _isSingleVote True if voters can only select one option, false for multiple selections.
     */
    function setBasicCampaign(uint256 campaignId, string[] memory _choices, bool _isSingleVote) external
        onlyCampaignCreator(campaignId) // <-- USE NEW MODIFIER
        onlyValidCampaign(campaignId)
        onlyUnfinalizedCampaign(campaignId)
        onlyBasicCampaign(campaignId) // Ensure the campaign type is Basic
    {
        require(_choices.length > 0, "ABOVEBallot: Must provide at least one choice.");

        // Clear any previous data if needed (though should be empty for a new/unfinalized campaign)
        // --- REMOVED: delete basicChoicesByCampaign[campaignId]; // Cannot delete entire mapping
        // --- REMOVED: delete basicChoiceVotesByCampaign[campaignId]; // Cannot delete entire mapping

        // Populate the choices array for this campaign
        for (uint i = 0; i < _choices.length; i++) {
            basicChoicesByCampaign[campaignId].push(_choices[i]);
            // Initialize vote counts for each new choice index
            basicChoiceVotesByCampaign[campaignId][i] = 0;
        }
        isBasicSingleVoteByCampaign[campaignId] = _isSingleVote;

        // --- NEW: Update Dynamic Count ---
        _basicChoiceCounts[campaignId] = _choices.length;
        // --- END NEW ---

        // --- KEY MODIFICATION: Finalize the campaign upon setup ---
        campaigns[campaignId].isFinalized = true;
        campaigns[campaignId].finalizedAt = block.timestamp;
        // --- END KEY MODIFICATION ---

        emit BasicCampaignSet(campaignId, _choices, _isSingleVote);
    }

    /**
     * @dev Allows an eligible voter to cast their vote(s) in a basic campaign.
     *      Distributes a dynamic reward based on the voter's ABOVE token balance.
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

        // --- Dynamic Voter Reward Calculation and Distribution ---
        uint256 voterTokenBalance = aboveToken.balanceOf(msg.sender);
        // Example Dividend Rate D = 0.1618 (represents 0.1618%)
        // Ru = Tu * (D / 100) => Multiply balance by 1618, then divide by 1000000 (which is 100 * 10000, the latter for scaling 0.1618 to 1618)
        // Using 1618 and 1000000 makes the calculation D = 0.1618%
        uint256 calculatedReward = (voterTokenBalance * VOTER_REWARD_MULTIPLIER) / VOTER_REWARD_DIVISOR;

        if (calculatedReward > 0) {
            // Attempt to transfer the calculated reward to the voter
            require(aboveToken.transfer(msg.sender, calculatedReward), "ABOVEBallot: Dynamic voter reward transfer failed.");
            emit VoterRewarded(msg.sender, calculatedReward); // Emit the calculated amount
        } else {
             emit VoterRewarded(msg.sender, 0); // Handle zero reward case
        }
        // --- End Dynamic Voter Reward Distribution ---
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

    // --- Ballot Type Voting Functions (Updated to use campaignId and creator restrictions) ---

    /**
     * @dev Adds a position for the ballot type campaign.
     *      Only the campaign creator can call this.
     *      Can only be called before the ballot campaign is finalized.
     * @param campaignId The ID of the campaign.
     * @param _name The name of the position.
     * @param _maxSelections The maximum number of candidates a voter can select for this position.
     */
    function addBallotPosition(uint256 campaignId, string memory _name, uint8 _maxSelections) external
        onlyCampaignCreator(campaignId) // <-- USE NEW MODIFIER
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
     * @dev Adds a candidate for a specific position in the ballot type campaign.
     *      Only the campaign creator can call this.
     *      Can only be called before the ballot campaign is finalized.
     * @param campaignId The ID of the campaign.
     * @param _name The name of the candidate.
     * @param _positionIndex The index of the position this candidate is running for.
     */
    function addCandidate(uint256 campaignId, string memory _name, uint256 _positionIndex) external
        onlyCampaignCreator(campaignId) // <-- USE NEW MODIFIER
        onlyValidCampaign(campaignId)
        onlyUnfinalizedCampaign(campaignId)
        onlyBallotCampaign(campaignId)
    {
        require(bytes(_name).length > 0, "ABOVEBallot: Candidate name cannot be empty.");
        require(_positionIndex < positionsByCampaign[campaignId].length, "ABOVEBallot: Invalid position index.");

        uint256 newCandidateId = candidatesByCampaign[campaignId].length;
        candidatesByCampaign[campaignId].push(Candidate({name: _name, positionIndex: _positionIndex}));
        positionsByCampaign[campaignId][_positionIndex].candidateCount += 1;

        // --- NEW: Update Dynamic Count ---
        _ballotCandidateCounts[campaignId] += 1;
        // --- END NEW ---

        emit CandidateAdded(campaignId, newCandidateId, _name, _positionIndex);
    }

    /**
     * @dev Adds multiple candidates for a specific position in the ballot type campaign.
     *      Only the campaign creator can call this.
     *      Can only be called before the ballot campaign is finalized.
     * @param campaignId The ID of the campaign.
     * @param _names An array of names for the candidates.
     * @param _positionIndex The index of the position these candidates are running for.
     */
    function addCandidates(uint256 campaignId, string[] memory _names, uint256 _positionIndex) external
        onlyCampaignCreator(campaignId) // <-- USE NEW MODIFIER
        onlyValidCampaign(campaignId)
        onlyUnfinalizedCampaign(campaignId)
        onlyBallotCampaign(campaignId)
    {
        require(_names.length > 0, "ABOVEBallot: Must provide at least one candidate name.");
        require(_positionIndex < positionsByCampaign[campaignId].length, "ABOVEBallot: Invalid position index.");
        uint256 initialCandidateCount = candidatesByCampaign[campaignId].length;

        for (uint i = 0; i < _names.length; i++) {
            require(bytes(_names[i]).length > 0, "ABOVEBallot: Candidate name cannot be empty.");
            uint256 newCandidateId = candidatesByCampaign[campaignId].length;
            candidatesByCampaign[campaignId].push(Candidate({name: _names[i], positionIndex: _positionIndex}));
            // Note: We don't emit CandidateAdded for each in a batch to avoid event spam.
            // The final count increment and single event emission cover the batch.
        }
        positionsByCampaign[campaignId][_positionIndex].candidateCount += uint256(_names.length); // Increment count

        // --- NEW: Update Dynamic Count ---
        _ballotCandidateCounts[campaignId] += _names.length;
        // --- END NEW ---

        // Emit a single event for the batch
        emit CandidatesAdded(campaignId, _positionIndex, _names.length);
    }

    /**
     * @dev Finalizes the ballot campaign setup.
     *      Only the campaign creator can call this.
     *      After this, no more positions or candidates can be added.
     * @param campaignId The ID of the campaign to finalize.
     */
    function finalizeBallotSetup(uint256 campaignId) external
        onlyCampaignCreator(campaignId) // <-- USE NEW MODIFIER
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
     *      Distributes a dynamic reward based on the voter's ABOVE token balance.
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

        // --- Dynamic Voter Reward Calculation and Distribution ---
        uint256 voterTokenBalance = aboveToken.balanceOf(msg.sender);
        // Example Dividend Rate D = 0.1618 (represents 0.1618%)
        // Ru = Tu * (D / 100) => Multiply balance by 1618, then divide by 1000000 (which is 100 * 10000, the latter for scaling 0.1618 to 1618)
        // Using 1618 and 1000000 makes the calculation D = 0.1618%
        uint256 calculatedReward = (voterTokenBalance * VOTER_REWARD_MULTIPLIER) / VOTER_REWARD_DIVISOR;

        if (calculatedReward > 0) {
            // Attempt to transfer the calculated reward to the voter
            require(aboveToken.transfer(msg.sender, calculatedReward), "ABOVEBallot: Dynamic voter reward transfer failed.");
            emit VoterRewarded(msg.sender, calculatedReward); // Emit the calculated amount
        } else {
             emit VoterRewarded(msg.sender, 0); // Handle zero reward case
        }
        // --- End Dynamic Voter Reward Distribution ---
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

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// --- Interface for VoterRegistry ---
    interface IVoterRegistry {
        function isAllowed(address _voter) external view returns (bool);
        function allowedVoterCount() external view returns (uint256);
    }

/**
 * @title ABOVEBallot
 * @dev A flexible smart contract for managing multiple voting campaigns.
 *      Supports Basic Voting (single/multiple choice) and Ballot Type Voting (structured positions/candidates).
 *      Integrates with VoterRegistry for eligibility checks (e.g., for campaign creation).
 *      Campaigns are identified by unique IDs for immutability and historical access.
 *      Integrates with the native ABOVE token for campaign creation fees and voter rewards.
 *      Campaign creation is decentralized (anyone can create, paying a fee and being registered).
 *      Campaign configuration is restricted to the creator.
 *      Voter eligibility for voting is simplified for testnet (must hold ABOVE tokens).
 *      This version focuses on core multi-campaign logic with tokenomics and decentralization.
 *      Future versions will integrate advanced cryptography for anonymity.
 *      Introduces an 'endCampaign' function for formal conclusion and result recording.
 */
contract ABOVEBallot is Ownable {

    // --- Token Integration ---
    IERC20 public immutable aboveToken;

    // --- Token Economics ---
    uint256 public constant CAMPAIGN_CREATION_FEE = 36631295142723603933 wei;
    uint256 public constant VOTER_REWARD_DIVISOR = 1000000;
    uint256 public constant VOTER_REWARD_MULTIPLIER = 1618;

    // --- Data Structures ---
    IVoterRegistry public voterRegistry;

    // --- Campaign Management ---
    uint256 private _nextCampaignId;

    enum CampaignType { Undefined, Basic, Ballot }

    struct Campaign {
        uint256 id;
        CampaignType campaignType;
        string description;
        bool isFinalized;
        uint256 createdAt;
        uint256 finalizedAt;
        address creator;
    }

    mapping(uint256 => Campaign) public campaigns;

    // --- Persistent Storage for Final Campaign Results ---
    mapping(uint256 => string[]) public finalBasicChoicesByCampaign;
    mapping(uint256 => uint256[]) public finalBasicVotesByCampaign;
    mapping(uint256 => Position[]) public finalBallotPositionsByCampaign;
    mapping(uint256 => Candidate[]) public finalBallotCandidatesByCampaign;
    mapping(uint256 => uint256[]) public finalBallotCandidateVotesByCampaign;

    // --- Voting Tracking (per campaign) ---
    mapping(uint256 => mapping(address => bool)) public hasVotedInCampaign;
    mapping(uint256 => uint256) public totalVotesPerCampaign;

    // --- Basic Voting Campaign Data (per campaign) ---
    mapping(uint256 => string[]) public basicChoicesByCampaign;
    mapping(uint256 => mapping(uint256 => uint256)) public basicChoiceVotesByCampaign;
    mapping(uint256 => bool) public isBasicSingleVoteByCampaign;

    // --- Ballot Type Campaign Data (per campaign) ---
    struct Position {
        string name;
        uint8 maxSelections;
        uint256 candidateCount;
    }

    struct Candidate {
        string name;
        uint256 positionIndex;
    }

    mapping(uint256 => Position[]) public positionsByCampaign;
    mapping(uint256 => Candidate[]) public candidatesByCampaign;
    mapping(uint256 => mapping(uint256 => uint256)) public candidateVotesByCampaign;

    // --- Events ---
    event CampaignCreated(uint256 indexed campaignId, CampaignType campaignType, string description, address indexed creator);
    event CampaignDescriptionSet(uint256 indexed campaignId, string description);
    event BasicCampaignSet(uint256 indexed campaignId, string[] choices, bool isSingleVote);
    event BallotPositionAdded(uint256 indexed campaignId, uint256 indexed positionIndex, string name, uint8 maxSelections);
    event CandidateAdded(uint256 indexed campaignId, uint256 indexed candidateId, string name, uint256 positionIndex);
    event CandidatesAdded(uint256 indexed campaignId, uint256 indexed positionIndex, uint256 count);
    event BallotCampaignFinalized(uint256 indexed campaignId);
    event VoteCastBasic(uint256 indexed campaignId, address indexed voter, uint256[] selectedChoices);
    event VoteCastBallot(uint256 indexed campaignId, address indexed voter, uint256[] selectedCandidates);
    event CampaignEnded(uint256 indexed campaignId);
    event CampaignCreationFeePaid(address indexed creator, uint256 amount);
    event VoterRewarded(address indexed voter, uint256 amount);

        // --- Modifiers ---
    modifier onlyIfNotVoted(uint256 campaignId) {
        require(!hasVotedInCampaign[campaignId][msg.sender], "ABOVEBallot: You have already voted in this campaign.");
        _;
    }

    modifier onlyIfEligible() {
        require(IERC20(aboveToken).balanceOf(msg.sender) > 0, "ABOVEBallot: Must hold ABOVE tokens to vote (Testnet).");
        _;
    }

    modifier onlyValidCampaign(uint256 campaignId) {
        require(campaigns[campaignId].id != 0, "ABOVEBallot: Invalid campaign ID.");
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

    modifier onlyCampaignCreator(uint256 campaignId) {
        require(campaigns[campaignId].creator == msg.sender, "ABOVEBallot: Only the campaign creator can perform this action.");
        _;
    }

    // --- Constructor ---
    constructor(address _voterRegistryAddress, address _aboveTokenAddress) Ownable(msg.sender) {
        require(_voterRegistryAddress != address(0), "ABOVEBallot: Invalid VoterRegistry address");
        require(_aboveTokenAddress != address(0), "ABOVEBallot: Invalid ABOVE token address");
        voterRegistry = IVoterRegistry(_voterRegistryAddress);
        aboveToken = IERC20(_aboveTokenAddress);
        _nextCampaignId = 1;
    }

    // --- Campaign Management Functions ---

    function createCampaign(string memory _description, CampaignType _type) external returns (uint256 campaignId) {
        require(_type != CampaignType.Undefined, "ABOVEBallot: Campaign type cannot be Undefined.");
        require(voterRegistry.isAllowed(msg.sender), "ABOVEBallot: You must be registered to create a campaign (Testnet).");

        // Token Fee Collection
        require(aboveToken.allowance(msg.sender, address(this)) >= CAMPAIGN_CREATION_FEE, "ABOVEBallot: Insufficient ABOVE token allowance for campaign creation fee.");
        require(aboveToken.transferFrom(msg.sender, address(this), CAMPAIGN_CREATION_FEE), "ABOVEBallot: Campaign creation fee transfer failed.");
        emit CampaignCreationFeePaid(msg.sender, CAMPAIGN_CREATION_FEE);

        campaignId = _nextCampaignId;
        _nextCampaignId++;

        campaigns[campaignId] = Campaign({
            id: campaignId,
            campaignType: _type,
            description: _description,
            isFinalized: false,
            createdAt: block.timestamp,
            finalizedAt: 0,
            creator: msg.sender
        });

        emit CampaignCreated(campaignId, _type, _description, msg.sender);
        return campaignId;
    }

    function setCampaignDescription(uint256 campaignId, string calldata _description) external
        onlyCampaignCreator(campaignId)
        onlyValidCampaign(campaignId)
    {
        campaigns[campaignId].description = _description;
        emit CampaignDescriptionSet(campaignId, _description);
    }

    // --- FUNCTION: End Campaign ---
    function endCampaign(uint256 campaignId) external
        onlyCampaignCreator(campaignId)
        onlyValidCampaign(campaignId)
        onlyFinalizedCampaign(campaignId)
    {
        Campaign storage campaign = campaigns[campaignId];

        // Record Final Results
        if (campaign.campaignType == CampaignType.Basic) {
            string[] storage choices = basicChoicesByCampaign[campaignId];
            for (uint i = 0; i < choices.length; i++) {
                finalBasicChoicesByCampaign[campaignId].push(choices[i]);
                finalBasicVotesByCampaign[campaignId].push(basicChoiceVotesByCampaign[campaignId][i]);
            }
        }
        else if (campaign.campaignType == CampaignType.Ballot) {
            Position[] storage positions = positionsByCampaign[campaignId];
            Candidate[] storage candidates = candidatesByCampaign[campaignId];
            for (uint i = 0; i < positions.length; i++) {
                finalBallotPositionsByCampaign[campaignId].push(positions[i]);
            }
            for (uint i = 0; i < candidates.length; i++) {
                finalBallotCandidatesByCampaign[campaignId].push(candidates[i]);
                finalBallotCandidateVotesByCampaign[campaignId].push(candidateVotesByCampaign[campaignId][i]);
            }
        }

        emit CampaignEnded(campaignId);
    }
    // --- END FUNCTION ---

    // --- Basic Voting Functions ---

    function setBasicCampaign(uint256 campaignId, string[] memory _choices, bool _isSingleVote) external
        onlyCampaignCreator(campaignId)
        onlyValidCampaign(campaignId)
        onlyUnfinalizedCampaign(campaignId)
        onlyBasicCampaign(campaignId)
    {
        require(_choices.length > 0, "ABOVEBallot: Must provide at least one choice.");

        for (uint i = 0; i < _choices.length; i++) {
            basicChoicesByCampaign[campaignId].push(_choices[i]);
            basicChoiceVotesByCampaign[campaignId][i] = 0;
        }
        isBasicSingleVoteByCampaign[campaignId] = _isSingleVote;

        campaigns[campaignId].isFinalized = true;
        campaigns[campaignId].finalizedAt = block.timestamp;

        emit BasicCampaignSet(campaignId, _choices, _isSingleVote);
    }

    function voteBasic(uint256 campaignId, uint256[] memory _selectedChoiceIndices) external
        onlyIfEligible
        onlyIfNotVoted(campaignId)
        onlyValidCampaign(campaignId)
        onlyFinalizedCampaign(campaignId)
        onlyBasicCampaign(campaignId)
    {
        require(_selectedChoiceIndices.length > 0, "ABOVEBallot: You must select at least one choice.");
        if (isBasicSingleVoteByCampaign[campaignId]) {
            require(_selectedChoiceIndices.length == 1, "ABOVEBallot: Only one choice allowed in single-vote mode.");
        }

        string[] storage choicesForCampaign = basicChoicesByCampaign[campaignId];
        for (uint i = 0; i < _selectedChoiceIndices.length; i++) {
            require(_selectedChoiceIndices[i] < choicesForCampaign.length, "ABOVEBallot: Invalid choice index.");
        }

        for (uint i = 0; i < _selectedChoiceIndices.length; i++) {
            basicChoiceVotesByCampaign[campaignId][_selectedChoiceIndices[i]] += 1;
        }
        hasVotedInCampaign[campaignId][msg.sender] = true;
        totalVotesPerCampaign[campaignId] += 1;

        emit VoteCastBasic(campaignId, msg.sender, _selectedChoiceIndices);

        // Dynamic Voter Reward Calculation and Distribution
        uint256 voterTokenBalance = aboveToken.balanceOf(msg.sender);
        uint256 calculatedReward = (voterTokenBalance * VOTER_REWARD_MULTIPLIER) / VOTER_REWARD_DIVISOR;

        if (calculatedReward > 0) {
            require(aboveToken.transfer(msg.sender, calculatedReward), "ABOVEBallot: Dynamic voter reward transfer failed.");
            emit VoterRewarded(msg.sender, calculatedReward);
        } else {
             emit VoterRewarded(msg.sender, 0);
        }
    }

    function getBasicResults(uint256 campaignId) external view
        onlyValidCampaign(campaignId)
        onlyBasicCampaign(campaignId)
        onlyFinalizedCampaign(campaignId)
        returns (string[] memory choices, uint256[] memory votes)
    {
        choices = basicChoicesByCampaign[campaignId];
        votes = new uint256[](choices.length);
        for (uint i = 0; i < choices.length; i++) {
            votes[i] = basicChoiceVotesByCampaign[campaignId][i];
        }
        return (choices, votes);
    }

    // --- Ballot Type Voting Functions ---

    function addBallotPosition(uint256 campaignId, string memory _name, uint8 _maxSelections) external
        onlyCampaignCreator(campaignId)
        onlyValidCampaign(campaignId)
        onlyUnfinalizedCampaign(campaignId)
        onlyBallotCampaign(campaignId)
    {
        require(bytes(_name).length > 0, "ABOVEBallot: Position name cannot be empty.");
        uint256 newIndex = positionsByCampaign[campaignId].length;
        positionsByCampaign[campaignId].push(Position({name: _name, maxSelections: _maxSelections, candidateCount: 0}));
        emit BallotPositionAdded(campaignId, newIndex, _name, _maxSelections);
    }

    function addCandidate(uint256 campaignId, string memory _name, uint256 _positionIndex) external
        onlyCampaignCreator(campaignId)
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

    function addCandidates(uint256 campaignId, string[] memory _names, uint256 _positionIndex) external
        onlyCampaignCreator(campaignId)
        onlyValidCampaign(campaignId)
        onlyUnfinalizedCampaign(campaignId)
        onlyBallotCampaign(campaignId)
    {
        require(_names.length > 0, "ABOVEBallot: Must provide at least one candidate name.");
        require(_positionIndex < positionsByCampaign[campaignId].length, "ABOVEBallot: Invalid position index.");
        for (uint i = 0; i < _names.length; i++) {
            require(bytes(_names[i]).length > 0, "ABOVEBallot: Candidate name cannot be empty.");
            candidatesByCampaign[campaignId].push(Candidate({name: _names[i], positionIndex: _positionIndex}));
        }
        positionsByCampaign[campaignId][_positionIndex].candidateCount += uint256(_names.length);
        emit CandidatesAdded(campaignId, _positionIndex, _names.length);
    }

    function finalizeBallotSetup(uint256 campaignId) external
        onlyCampaignCreator(campaignId)
        onlyValidCampaign(campaignId)
        onlyUnfinalizedCampaign(campaignId)
        onlyBallotCampaign(campaignId)
    {
        require(positionsByCampaign[campaignId].length > 0, "ABOVEBallot: Must have at least one position.");
        Candidate[] storage candidatesForCampaign = candidatesByCampaign[campaignId];
        for (uint i = 0; i < candidatesForCampaign.length; i++) {
            candidateVotesByCampaign[campaignId][i] = 0;
        }
        campaigns[campaignId].isFinalized = true;
        campaigns[campaignId].finalizedAt = block.timestamp;
        emit BallotCampaignFinalized(campaignId);
    }

    function voteBallot(uint256 campaignId, uint256[] memory _selectedCandidateIds) external
        onlyIfEligible
        onlyIfNotVoted(campaignId)
        onlyValidCampaign(campaignId)
        onlyFinalizedCampaign(campaignId)
        onlyBallotCampaign(campaignId)
    {
        require(_selectedCandidateIds.length > 0, "ABOVEBallot: You must select at least one candidate.");
        Candidate[] storage candidatesForCampaign = candidatesByCampaign[campaignId];
        Position[] storage positionsForCampaign = positionsByCampaign[campaignId];

        // Validation Logic
        for (uint i = 0; i < _selectedCandidateIds.length; i++) {
            require(_selectedCandidateIds[i] < candidatesForCampaign.length, "ABOVEBallot: Invalid candidate ID.");
            for (uint j = i + 1; j < _selectedCandidateIds.length; j++) {
                 require(_selectedCandidateIds[i] != _selectedCandidateIds[j], "ABOVEBallot: Duplicate candidate selection not allowed.");
            }
        }

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

        // Record Votes
        for (uint i = 0; i < _selectedCandidateIds.length; i++) {
            candidateVotesByCampaign[campaignId][_selectedCandidateIds[i]] += 1;
        }
        hasVotedInCampaign[campaignId][msg.sender] = true;
        totalVotesPerCampaign[campaignId] += 1;

        emit VoteCastBallot(campaignId, msg.sender, _selectedCandidateIds);

        // Dynamic Voter Reward Calculation and Distribution
        uint256 voterTokenBalance = aboveToken.balanceOf(msg.sender);
        uint256 calculatedReward = (voterTokenBalance * VOTER_REWARD_MULTIPLIER) / VOTER_REWARD_DIVISOR;

        if (calculatedReward > 0) {
            require(aboveToken.transfer(msg.sender, calculatedReward), "ABOVEBallot: Dynamic voter reward transfer failed.");
            emit VoterRewarded(msg.sender, calculatedReward);
        } else {
             emit VoterRewarded(msg.sender, 0);
        }
    }

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

    function getCampaign(uint256 campaignId) external view onlyValidCampaign(campaignId) returns (Campaign memory) {
        return campaigns[campaignId];
    }

    function getNextCampaignId() external view returns (uint256) {
        return _nextCampaignId;
    }
}
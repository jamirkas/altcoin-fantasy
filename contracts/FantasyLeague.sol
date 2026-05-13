// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FantasyLeague v2
 * @notice Altcoin Fantasy — on-chain tournament entry with referrals, captain picks, config, pause
 * @dev Base Sepolia testnet. Single-entry with captain selection baked into enter().
 */
contract FantasyLeague {
    // ─── Storage ───

    address public owner;
    bool public paused;

    struct Tournament {
        uint256 entryFee;          // Entry fee in wei
        uint256 draftDeadline;     // Unix timestamp — picks locked after this
        uint256 endTime;           // Unix timestamp — scoring happens after this
        uint256 totalPool;         // Total ETH collected (after referral cuts)
        uint256 protocolFee;       // Protocol cut in basis points (e.g. 1000 = 10%)
        bytes32 merkleRoot;        // Merkle root of (player, amount) winners
        bool finalized;            // True once results posted
        uint256 playerCount;       // Number of entrants
    }

    Tournament[] public tournaments;

    // ─── Referral system ───
    mapping(address => uint256) public referralBalances;
    uint256 public referralPercent = 1500; // 15% in basis points

    // ─── Configurable defaults ───
    uint256 public defaultEntryFee = 0.001 ether;
    uint256 public captainMultiplier = 2;
    uint256 public maxEntriesPerPlayer = 3;

    // ─── Captain picks: tournamentId → player → pickIndex (0-2) ───
    mapping(uint256 => mapping(address => uint8)) public captainPicks;

    // ─── Payout tracking ───
    mapping(uint256 => mapping(address => uint256)) public claimed;

    // ─── Events ───

    event TournamentCreated(
        uint256 indexed id, uint256 entryFee, uint256 draftDeadline, uint256 endTime
    );
    event Entered(
        uint256 indexed tournamentId, address indexed player,
        address indexed referrer, uint8 captainIndex,
        uint256 fee, uint256 playerCount
    );
    event CaptainSet(
        uint256 indexed tournamentId, address indexed player, uint8 pickIndex
    );
    event ResultsPosted(uint256 indexed tournamentId, bytes32 merkleRoot);
    event Claimed(
        uint256 indexed tournamentId, address indexed player, uint256 amount
    );
    event ReferralWithdrawn(address indexed referrer, uint256 amount);
    event ConfigUpdated(string param, uint256 value);
    event PauseToggled(bool paused);

    // ─── Modifiers ───

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract paused");
        _;
    }

    // ─── Constructor ───

    constructor() {
        owner = msg.sender;
    }

    // ─── Admin: Config setters ───

    function setDefaultEntryFee(uint256 _wei) external onlyOwner {
        require(_wei > 0, "Zero fee");
        defaultEntryFee = _wei;
        emit ConfigUpdated("defaultEntryFee", _wei);
    }

    function setReferralPercent(uint256 _bps) external onlyOwner {
        require(_bps <= 3000, "Max 30%"); // upper sanity cap
        referralPercent = _bps;
        emit ConfigUpdated("referralPercent", _bps);
    }

    function setCaptainMultiplier(uint256 _mult) external onlyOwner {
        require(_mult >= 1 && _mult <= 5, "1-5 range");
        captainMultiplier = _mult;
        emit ConfigUpdated("captainMultiplier", _mult);
    }

    function setMaxEntriesPerPlayer(uint256 _max) external onlyOwner {
        require(_max >= 1 && _max <= 10, "1-10 range");
        maxEntriesPerPlayer = _max;
        emit ConfigUpdated("maxEntriesPerPlayer", _max);
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit PauseToggled(_paused);
    }

    // ─── Admin: Create Tournament ───

    function createTournament(
        uint256 _entryFee,
        uint256 _draftDeadline,
        uint256 _endTime,
        uint256 _protocolFee
    ) external onlyOwner returns (uint256) {
        require(_draftDeadline > block.timestamp, "Deadline in past");
        require(_endTime > _draftDeadline, "End before deadline");
        require(_protocolFee <= 3000, "Fee too high");

        tournaments.push(Tournament({
            entryFee: _entryFee,
            draftDeadline: _draftDeadline,
            endTime: _endTime,
            totalPool: 0,
            protocolFee: _protocolFee,
            merkleRoot: bytes32(0),
            finalized: false,
            playerCount: 0
        }));

        uint256 id = tournaments.length - 1;
        emit TournamentCreated(id, _entryFee, _draftDeadline, _endTime);
        return id;
    }

    // ─── Player: Enter (no referral, captain defaults to 0) ───
    function enter(uint256 _tournamentId) external payable whenNotPaused {
        _enter(_tournamentId, address(0), 0);
    }

    // ─── Player: Enter with Referral + Captain ───
    function enterWithReferral(
        uint256 _tournamentId,
        address _referrer,
        uint8 _captainIndex
    ) external payable whenNotPaused {
        require(_referrer != msg.sender, "Self-referral");
        require(_captainIndex < 3, "Bad captain index");
        _enter(_tournamentId, _referrer, _captainIndex);
    }

    // ─── Player: Update captain pick (before deadline) ───
    function setCaptain(uint256 _tournamentId, uint8 _pickIndex)
        external whenNotPaused
    {
        Tournament storage t = tournaments[_tournamentId];
        require(block.timestamp < t.draftDeadline, "Draft closed");
        require(!t.finalized, "Finalized");
        require(_pickIndex < 3, "Bad pick index");

        captainPicks[_tournamentId][msg.sender] = _pickIndex;
        emit CaptainSet(_tournamentId, msg.sender, _pickIndex);
    }

    // ─── Referrer: Withdraw accumulated referral rewards ───
    function withdrawReferral() external {
        uint256 amount = referralBalances[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        referralBalances[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
        emit ReferralWithdrawn(msg.sender, amount);
    }

    // ─── Internal: Core entry logic ───
    function _enter(uint256 _tournamentId, address _referrer, uint8 _captainIndex)
        internal
    {
        Tournament storage t = tournaments[_tournamentId];
        require(block.timestamp < t.draftDeadline, "Draft closed");
        require(msg.value == t.entryFee, "Wrong fee");
        require(!t.finalized, "Finalized");

        // Referral cut
        uint256 referralCut = 0;
        if (_referrer != address(0)) {
            referralCut = (msg.value * referralPercent) / 10000;
            referralBalances[_referrer] += referralCut;
        }

        t.totalPool += msg.value - referralCut;
        t.playerCount += 1;
        captainPicks[_tournamentId][msg.sender] = _captainIndex;

        emit Entered(_tournamentId, msg.sender, _referrer, _captainIndex, msg.value, t.playerCount);
    }

    // ─── Admin: Post Results ───

    function postResults(uint256 _tournamentId, bytes32 _merkleRoot)
        external onlyOwner
    {
        Tournament storage t = tournaments[_tournamentId];
        require(block.timestamp > t.endTime, "Not ended yet");
        require(!t.finalized, "Already finalized");
        require(_merkleRoot != bytes32(0), "Empty root");

        t.merkleRoot = _merkleRoot;
        t.finalized = true;

        emit ResultsPosted(_tournamentId, _merkleRoot);
    }

    // ─── Winner: Claim Prize ───

    function claim(
        uint256 _tournamentId,
        uint256 _amount,
        bytes32[] calldata _proof
    ) external whenNotPaused {
        Tournament storage t = tournaments[_tournamentId];
        require(t.finalized, "Not finalized");
        require(claimed[_tournamentId][msg.sender] == 0, "Already claimed");

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, _amount));
        require(_verifyProof(leaf, _proof, t.merkleRoot), "Invalid proof");

        claimed[_tournamentId][msg.sender] = _amount;
        payable(msg.sender).transfer(_amount);

        emit Claimed(_tournamentId, msg.sender, _amount);
    }

    // ─── Admin: Protocol Fee Withdrawal ───

    function withdrawProtocolFee(uint256 _tournamentId) external onlyOwner {
        Tournament storage t = tournaments[_tournamentId];
        require(t.finalized, "Not finalized");

        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(owner).transfer(balance);
        }
    }

    // ─── View Helpers ───

    function getTournament(uint256 _id) external view returns (
        uint256 entryFee, uint256 draftDeadline, uint256 endTime,
        uint256 totalPool, uint256 playerCount, bool finalized, bytes32 merkleRoot
    ) {
        Tournament storage t = tournaments[_id];
        return (t.entryFee, t.draftDeadline, t.endTime, t.totalPool, t.playerCount, t.finalized, t.merkleRoot);
    }

    function tournamentCount() external view returns (uint256) {
        return tournaments.length;
    }

    // ─── Merkle Proof (standard) ───

    function _verifyProof(
        bytes32 _leaf,
        bytes32[] memory _proof,
        bytes32 _root
    ) internal pure returns (bool) {
        bytes32 computedHash = _leaf;
        for (uint256 i = 0; i < _proof.length; i++) {
            if (computedHash < _proof[i]) {
                computedHash = keccak256(abi.encodePacked(computedHash, _proof[i]));
            } else {
                computedHash = keccak256(abi.encodePacked(_proof[i], computedHash));
            }
        }
        return computedHash == _root;
    }

    // Fallback
    receive() external payable {}
}

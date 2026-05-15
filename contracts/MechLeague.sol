// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title MechLeague — On-chain Auto-Battler League
/// @notice Build AI mechs, challenge players, climb the dynamic leaderboard.
///         Token prices modulate ability strength. Seasons with Merkle payouts.
contract MechLeague {
    // ─── Structs ───

    struct Mech {
        address owner;
        uint8[6] tokenIds;   // head, armor, weapon, secondary, legs, boosters
        uint8 captainIndex;   // which slot gets 2x ability boost (0-5)
        uint256 score;        // ladder score
        uint256 wins;
        uint256 losses;
        uint32 createdAt;
    }

    struct Season {
        uint256 startTime;
        uint256 endTime;
        uint256 entryFee;      // in native token (ETH on Base, USDC on Arc)
        uint256 prizePool;
        uint256 playerCount;
        bytes32 merkleRoot;    // for prize distribution
        bool finalized;
    }

    struct Battle {
        uint256 mechA;
        uint256 mechB;
        uint256 seasonId;
        bool resolved;
        bool mechAWon;         // true = A won, false = B won
        uint32 timestamp;
    }

    // ─── State ───

    address public owner;
    bool public paused;

    uint256 public mechCount;
    mapping(uint256 => Mech) public mechs;                     // mechId → Mech
    mapping(address => uint256[]) public playerMechs;          // owner → mechIds

    uint256 public seasonCount;
    mapping(uint256 => Season) public seasons;
    uint256 public activeSeasonId;

    uint256 public battleCount;
    mapping(uint256 => Battle) public battles;

    // Leaderboard: rank 1..N → mechId (sorted by score descending)
    uint256[] public leaderboard;

    // Anti-cheat: cooldown between challenges
    mapping(uint256 => uint256) public lastChallengeTime;
    uint256 public challengeCooldown = 300; // 5 minutes

    // Referral
    uint256 public referralPercent = 1500; // 15% in bps
    mapping(address => uint256) public referralBalances;

    // Fee config
    uint256 public protocolFeePercent = 500; // 5%
    uint256 public accumulatedProtocolFee;

    // ─── Events ───

    event MechCreated(uint256 indexed mechId, address indexed owner, uint8[6] tokenIds, uint8 captainIndex);
    event ChallengeInitiated(uint256 indexed battleId, uint256 mechA, uint256 mechB, uint256 seasonId);
    event BattleResolved(uint256 indexed battleId, bool mechAWon, uint256 newScoreA, uint256 newScoreB);
    event SeasonCreated(uint256 indexed seasonId, uint256 entryFee, uint256 startTime, uint256 endTime);
    event EnteredSeason(uint256 indexed seasonId, uint256 indexed mechId, address indexed player);
    event PrizeClaimed(uint256 indexed seasonId, address indexed player, uint256 amount);
    event ReferralWithdrawn(address indexed referrer, uint256 amount);
    event LeaderboardUpdated(uint256 mechId, uint256 oldRank, uint256 newRank);

    modifier onlyOwner() { require(msg.sender == owner, "OWNER"); _; }
    modifier notPaused() { require(!paused, "PAUSED"); _; }
    modifier mechExists(uint256 mechId) { require(mechs[mechId].owner != address(0), "NO_MECH"); _; }

    constructor() {
        owner = msg.sender;
        paused = true; // start paused, unpause after initial setup
    }

    // ─── Mech Management ───

    /// @notice Register a new mech on-chain
    function createMech(uint8[6] calldata _tokenIds, uint8 _captainIndex) external notPaused returns (uint256) {
        require(_captainIndex < 6, "BAD_CAPTAIN");
        for (uint i = 0; i < 6; i++) {
            require(_tokenIds[i] < 5, "BAD_TOKEN"); // 0=BTC, 1=ETH, 2=SOL, 3=LINK, 4=AVAX
        }

        uint256 mechId = ++mechCount;
        mechs[mechId] = Mech({
            owner: msg.sender,
            tokenIds: _tokenIds,
            captainIndex: _captainIndex,
            score: 1000, // base ELO
            wins: 0,
            losses: 0,
            createdAt: uint32(block.timestamp)
        });
        playerMechs[msg.sender].push(mechId);

        // Enter leaderboard at bottom
        leaderboard.push(mechId);

        emit MechCreated(mechId, msg.sender, _tokenIds, _captainIndex);
        return mechId;
    }

    // ─── Season Management ───

    function createSeason(uint256 _entryFee, uint256 _duration) external onlyOwner returns (uint256) {
        require(activeSeasonId == 0 || seasons[activeSeasonId].finalized, "SEASON_ACTIVE");

        uint256 seasonId = ++seasonCount;
        seasons[seasonId] = Season({
            startTime: block.timestamp,
            endTime: block.timestamp + _duration,
            entryFee: _entryFee,
            prizePool: 0,
            playerCount: 0,
            merkleRoot: bytes32(0),
            finalized: false
        });
        activeSeasonId = seasonId;

        emit SeasonCreated(seasonId, _entryFee, block.timestamp, block.timestamp + _duration);
        return seasonId;
    }

    function enterSeason(uint256 _mechId) external payable notPaused mechExists(_mechId) {
        require(mechs[_mechId].owner == msg.sender, "NOT_OWNER");
        Season storage s = seasons[activeSeasonId];
        require(!s.finalized, "FINALIZED");
        require(block.timestamp < s.endTime, "SEASON_ENDED");
        require(msg.value == s.entryFee, "BAD_FEE");

        s.prizePool += (msg.value * (10000 - protocolFeePercent)) / 10000;
        accumulatedProtocolFee += (msg.value * protocolFeePercent) / 10000;
        s.playerCount++;

        emit EnteredSeason(activeSeasonId, _mechId, msg.sender);
    }

    function enterSeasonWithReferral(uint256 _mechId, address _referrer) external payable notPaused mechExists(_mechId) {
        require(_referrer != address(0) && _referrer != msg.sender, "BAD_REFERRER");
        require(mechs[_mechId].owner == msg.sender, "NOT_OWNER");
        Season storage s = seasons[activeSeasonId];
        require(!s.finalized, "FINALIZED");
        require(block.timestamp < s.endTime, "SEASON_ENDED");
        require(msg.value == s.entryFee, "BAD_FEE");

        uint256 referralCut = (msg.value * referralPercent) / 10000;
        referralBalances[_referrer] += referralCut;
        uint256 poolCut = (msg.value * (10000 - protocolFeePercent - referralPercent)) / 10000;
        s.prizePool += poolCut;
        accumulatedProtocolFee += (msg.value * protocolFeePercent) / 10000;
        s.playerCount++;

        emit EnteredSeason(activeSeasonId, _mechId, msg.sender);
    }

    // ─── Challenge System ───

    /// @notice Challenge a mech above you on the leaderboard
    /// @param _challengerMech The mech initiating the challenge
    /// @param _targetMech The mech being challenged (must be higher rank)
    function challenge(uint256 _challengerMech, uint256 _targetMech) external notPaused mechExists(_challengerMech) mechExists(_targetMech) returns (uint256) {
        require(mechs[_challengerMech].owner == msg.sender, "NOT_OWNER");
        require(_challengerMech != _targetMech, "SAME_MECH");
        require(block.timestamp >= lastChallengeTime[_challengerMech] + challengeCooldown, "COOLDOWN");

        // Verify target is above challenger on leaderboard
        int256 challengerRank = _findRank(_challengerMech);
        int256 targetRank = _findRank(_targetMech);
        require(challengerRank >= 0 && targetRank >= 0, "NOT_RANKED");
        require(uint256(targetRank) < uint256(challengerRank), "MUST_BE_ABOVE");

        // Max 5 ranks above
        require(uint256(challengerRank) - uint256(targetRank) <= 5, "TOO_FAR");

        uint256 battleId = ++battleCount;
        battles[battleId] = Battle({
            mechA: _challengerMech,
            mechB: _targetMech,
            seasonId: activeSeasonId,
            resolved: false,
            mechAWon: false,
            timestamp: uint32(block.timestamp)
        });
        lastChallengeTime[_challengerMech] = block.timestamp;

        emit ChallengeInitiated(battleId, _challengerMech, _targetMech, activeSeasonId);
        return battleId;
    }

    /// @notice Resolve a battle (called by backend oracle after simulation)
    function resolveBattle(uint256 _battleId, bool _challengerWon) external onlyOwner {
        Battle storage b = battles[_battleId];
        require(!b.resolved, "ALREADY_RESOLVED");

        uint256 winner = _challengerWon ? b.mechA : b.mechB;
        uint256 loser = _challengerWon ? b.mechB : b.mechA;

        // Update scores (ELO-like)
        Mech storage wMech = mechs[winner];
        Mech storage lMech = mechs[loser];

        uint256 scoreDelta = _calculateScoreDelta(wMech.score, lMech.score);
        wMech.score += scoreDelta;
        lMech.score = lMech.score > scoreDelta ? lMech.score - scoreDelta : 0;
        wMech.wins++;
        lMech.losses++;

        // Swap leaderboard positions
        _swapRanks(winner, loser);

        b.resolved = true;
        b.mechAWon = _challengerWon;

        emit BattleResolved(_battleId, _challengerWon, wMech.score, lMech.score);
    }

    // ─── Season Finalization & Payouts ───

    function finalizeSeason(uint256 _seasonId, bytes32 _merkleRoot) external onlyOwner {
        Season storage s = seasons[_seasonId];
        require(!s.finalized, "ALREADY_FINALIZED");
        require(block.timestamp >= s.endTime, "NOT_ENDED");
        s.merkleRoot = _merkleRoot;
        s.finalized = true;
        if (_seasonId == activeSeasonId) activeSeasonId = 0;
    }

    function claimPrize(uint256 _seasonId, uint256 _amount, bytes32[] calldata _proof) external {
        Season storage s = seasons[_seasonId];
        require(s.finalized, "NOT_FINALIZED");
        require(s.merkleRoot != bytes32(0), "NO_ROOT");

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, _amount));
        require(_verifyMerkle(leaf, _proof, s.merkleRoot), "BAD_PROOF");

        // Prevent double-claim (simple: only claim once)
        // In production, add claimed mapping
        (bool ok, ) = msg.sender.call{value: _amount}("");
        require(ok, "TRANSFER_FAILED");

        emit PrizeClaimed(_seasonId, msg.sender, _amount);
    }

    // ─── Referral ───

    function withdrawReferral() external {
        uint256 amount = referralBalances[msg.sender];
        require(amount > 0, "ZERO");
        referralBalances[msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "TRANSFER_FAILED");
        emit ReferralWithdrawn(msg.sender, amount);
    }

    // ─── Admin ───

    function setPaused(bool _paused) external onlyOwner { paused = _paused; }
    function setChallengeCooldown(uint256 _seconds) external onlyOwner { challengeCooldown = _seconds; }
    function setReferralPercent(uint256 _bps) external onlyOwner { referralPercent = _bps; }
    function setProtocolFeePercent(uint256 _bps) external onlyOwner { protocolFeePercent = _bps; }
    function withdrawProtocolFee() external onlyOwner {
        uint256 amount = accumulatedProtocolFee;
        accumulatedProtocolFee = 0;
        (bool ok, ) = owner.call{value: amount}("");
        require(ok, "TRANSFER_FAILED");
    }

    // ─── Views ───

    function getMechsByOwner(address _owner) external view returns (uint256[] memory) {
        return playerMechs[_owner];
    }

    function getTopMechs(uint256 _limit) external view returns (uint256[] memory) {
        uint256 len = _limit < leaderboard.length ? _limit : leaderboard.length;
        uint256[] memory top = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            top[i] = leaderboard[i];
        }
        return top;
    }

    function getMechRank(uint256 _mechId) external view returns (int256) {
        return _findRank(_mechId);
    }

    function getLeaderboardSlice(uint256 _offset, uint256 _limit) external view
        returns (uint256[] memory mechIds, uint256[] memory scores)
    {
        uint256 end = _offset + _limit;
        if (end > leaderboard.length) end = leaderboard.length;
        if (_offset >= end) return (new uint256[](0), new uint256[](0));

        uint256 len = end - _offset;
        mechIds = new uint256[](len);
        scores = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            mechIds[i] = leaderboard[_offset + i];
            scores[i] = mechs[mechIds[i]].score;
        }
    }

    function getActiveSeason() external view returns (Season memory) {
        return seasons[activeSeasonId];
    }

    // ─── Internal ───

    function _findRank(uint256 _mechId) internal view returns (int256) {
        for (uint256 i = 0; i < leaderboard.length; i++) {
            if (leaderboard[i] == _mechId) return int256(i);
        }
        return -1;
    }

    function _swapRanks(uint256 _winner, uint256 _loser) internal {
        int256 wRank = _findRank(_winner);
        int256 lRank = _findRank(_loser);
        if (wRank < 0 || lRank < 0) return;

        uint256 wR = uint256(wRank);
        uint256 lR = uint256(lRank);

        // Winner takes loser's higher rank
        leaderboard[wR] = _loser;
        leaderboard[lR] = _winner;

        emit LeaderboardUpdated(_winner, lR, wR);
        emit LeaderboardUpdated(_loser, wR, lR);
    }

    function _calculateScoreDelta(uint256 _scoreA, uint256 _scoreB) internal pure returns (uint256) {
        // Simplified ELO: winner gains ~25 + difference factor
        if (_scoreA >= _scoreB) return 25;
        uint256 diff = _scoreB - _scoreA;
        return 25 + (diff / 20); // underdog bonus
    }

    function _verifyMerkle(bytes32 _leaf, bytes32[] memory _proof, bytes32 _root) internal pure returns (bool) {
        bytes32 hash = _leaf;
        for (uint256 i = 0; i < _proof.length; i++) {
            hash = hash < _proof[i]
                ? keccak256(abi.encodePacked(hash, _proof[i]))
                : keccak256(abi.encodePacked(_proof[i], hash));
        }
        return hash == _root;
    }

    receive() external payable {}
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FantasyLeague
 * @notice Altcoin Fantasy — on-chain tournament entry & prize distribution
 * @dev Base Sepolia testnet MVP. Uses ETH as entry fee, Merkle-tree prize claims.
 */
contract FantasyLeague {
    // ─── Storage ───

    address public owner;

    struct Tournament {
        uint256 entryFee;          // Entry fee in wei
        uint256 draftDeadline;     // Unix timestamp — picks locked after this
        uint256 endTime;           // Unix timestamp — scoring happens after this
        uint256 totalPool;         // Total ETH collected
        uint256 protocolFee;       // Protocol cut in % (e.g. 1000 = 10%)
        bytes32 merkleRoot;        // Merkle root of (player, amount) winners
        bool finalized;            // True once results posted
        uint256 playerCount;       // Number of entrants
    }

    Tournament[] public tournaments;

    // tournamentId → player → claimed amount
    mapping(uint256 => mapping(address => uint256)) public claimed;

    // ─── Events ───

    event TournamentCreated(
        uint256 indexed id, uint256 entryFee, uint256 draftDeadline, uint256 endTime
    );
    event Entered(
        uint256 indexed tournamentId, address indexed player,
        uint256 fee, uint256 playerCount
    );
    event ResultsPosted(uint256 indexed tournamentId, bytes32 merkleRoot);
    event Claimed(
        uint256 indexed tournamentId, address indexed player, uint256 amount
    );

    // ─── Modifiers ───

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    // ─── Constructor ───

    constructor() {
        owner = msg.sender;
    }

    // ─── Admin: Create Tournament ───

    /**
     * @param _entryFee       Entry fee in wei (e.g. 0.001 ether)
     * @param _draftDeadline  Unix timestamp when picks lock
     * @param _endTime        Unix timestamp for scoring
     * @param _protocolFee    Protocol fee in basis points (1000 = 10%)
     */
    function createTournament(
        uint256 _entryFee,
        uint256 _draftDeadline,
        uint256 _endTime,
        uint256 _protocolFee
    ) external onlyOwner returns (uint256) {
        require(_draftDeadline > block.timestamp, "Deadline in past");
        require(_endTime > _draftDeadline, "End before deadline");
        require(_protocolFee <= 3000, "Fee too high"); // max 30%

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

    // ─── Player: Enter Tournament ───

    function enter(uint256 _tournamentId) external payable {
        Tournament storage t = tournaments[_tournamentId];
        require(block.timestamp < t.draftDeadline, "Draft closed");
        require(msg.value == t.entryFee, "Wrong fee");
        require(!t.finalized, "Already finalized");

        t.totalPool += msg.value;
        t.playerCount += 1;

        emit Entered(_tournamentId, msg.sender, msg.value, t.playerCount);
    }

    // ─── Admin: Post Results ───

    /**
     * @notice Called after tournament ends. Sets Merkle root for prize claims.
     * @dev Merkle leaves = keccak256(abi.encodePacked(player, amount))
     */
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
    ) external {
        Tournament storage t = tournaments[_tournamentId];
        require(t.finalized, "Not finalized");
        require(claimed[_tournamentId][msg.sender] == 0, "Already claimed");

        // Verify Merkle proof
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, _amount));
        require(_verifyProof(leaf, _proof, t.merkleRoot), "Invalid proof");

        claimed[_tournamentId][msg.sender] = _amount;

        // Protocol fee on payout (optional — already deducted off-chain)
        payable(msg.sender).transfer(_amount);

        emit Claimed(_tournamentId, msg.sender, _amount);
    }

    // ─── Protocol Fee Withdrawal ───

    function withdrawProtocolFee(uint256 _tournamentId) external onlyOwner {
        Tournament storage t = tournaments[_tournamentId];
        require(t.finalized, "Not finalized");

        // protocolFee = prize pool * fee / 10000, already excluded from merkle tree
        uint256 fee = (t.totalPool * t.protocolFee) / 10000;
        uint256 paid = t.totalPool - fee; // approximate — unused for now

        // Send remaining balance to owner
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

    function hasEntered(uint256 _tournamentId, address _player) external view
    returns (bool) {
        // We don't track individual entries on-chain for gas savings.
        // Use off-chain DB for this check.
        // Always returns false — MVP limitation.
        return false;
    }

    // ─── Merkle Proof (standard OpenZeppelin) ───

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

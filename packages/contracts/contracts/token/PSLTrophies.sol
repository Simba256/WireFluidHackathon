// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

/// @title PSLTrophies — soulbound ERC-721 awarded by PSLPoints.claimTier()
/// @notice Proof of tournament achievement. Minted exclusively by the
///         PSLPoints contract. Non-transferable for life (soulbound) so
///         the "I won Top 10" signal cannot be bought on a secondary market.
contract PSLTrophies is ERC721, Ownable {
    using Strings for uint256;

    /// @notice Only this address may call `mintTrophy`. Set at construction
    ///         to the PSLPoints contract and never changes.
    address public immutable minter;

    /// @notice Tournament identifier tagged onto every mint in the current epoch.
    ///         Owner can roll this forward between tournaments.
    uint256 public currentTournamentId;

    uint256 private _nextTokenId;

    mapping(uint256 => uint8) public tokenTier;
    mapping(uint256 => uint256) public tokenTournamentId;
    mapping(uint8 => string) public tierNames;

    event TrophyMinted(
        address indexed winner,
        uint256 indexed tokenId,
        uint8 indexed tierId,
        uint256 tournamentId
    );
    event TournamentRolled(uint256 indexed newTournamentId);
    event TierNameSet(uint8 indexed tierId, string name);

    error OnlyMinter();
    error Soulbound();
    error InvalidAddress();
    error UnknownToken();

    constructor(address _minter, uint256 _initialTournamentId, address initialOwner)
        ERC721("BoundaryLine Trophy", "BNDYT")
        Ownable(initialOwner)
    {
        if (_minter == address(0)) revert InvalidAddress();
        minter = _minter;
        currentTournamentId = _initialTournamentId;

        tierNames[1] = "Top 50 Finisher";
        tierNames[2] = "Top 25 Finisher";
        tierNames[3] = "Top 10 Finisher";
        tierNames[4] = "Top 3 Finisher";
        tierNames[5] = "Champion";
    }

    /// @notice Mint a soulbound trophy. Only callable by the PSLPoints contract.
    function mintTrophy(address winner, uint8 tierId) external returns (uint256 tokenId) {
        if (msg.sender != minter) revert OnlyMinter();
        if (winner == address(0)) revert InvalidAddress();

        unchecked {
            tokenId = ++_nextTokenId;
        }
        tokenTier[tokenId] = tierId;
        uint256 tId = currentTournamentId;
        tokenTournamentId[tokenId] = tId;

        _mint(winner, tokenId);

        emit TrophyMinted(winner, tokenId, tierId, tId);
    }

    /// @notice Advance to the next tournament. Owner-only.
    function rollTournament(uint256 newTournamentId) external onlyOwner {
        currentTournamentId = newTournamentId;
        emit TournamentRolled(newTournamentId);
    }

    /// @notice Set or update the human-readable label for a tier.
    function setTierName(uint8 tierId, string calldata name) external onlyOwner {
        tierNames[tierId] = name;
        emit TierNameSet(tierId, name);
    }

    /// @notice Inline-SVG metadata. No IPFS, no off-chain dependency.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        uint8 tier = tokenTier[tokenId];
        uint256 tId = tokenTournamentId[tokenId];
        string memory tierLabel = bytes(tierNames[tier]).length > 0
            ? tierNames[tier]
            : string.concat("Tier ", uint256(tier).toString());

        string memory svg = _buildSvg(tokenId, tier, tId, tierLabel);
        string memory json = string.concat(
            '{"name":"BoundaryLine Trophy #',
            tokenId.toString(),
            " \u2014 ",
            tierLabel,
            '","description":"Soulbound proof of achievement in BoundaryLine (PSL Fantasy on WireFluid).",',
            '"image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(svg)),
            '","attributes":[',
            '{"trait_type":"Tier","value":"',
            tierLabel,
            '"},{"trait_type":"Tournament","value":',
            tId.toString(),
            '},{"trait_type":"Soulbound","value":"true"}]}'
        );

        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    function _buildSvg(
        uint256 tokenId,
        uint8 tier,
        uint256 tId,
        string memory tierLabel
    ) private pure returns (string memory) {
        return string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">',
            '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">',
            '<stop offset="0" stop-color="#0f172a"/><stop offset="1" stop-color="#1e3a8a"/>',
            '</linearGradient></defs>',
            '<rect width="400" height="400" fill="url(#g)"/>',
            '<text x="200" y="80" text-anchor="middle" fill="#fef3c7" font-family="serif" font-size="28" font-weight="700">BoundaryLine</text>',
            '<text x="200" y="200" text-anchor="middle" fill="#fbbf24" font-family="serif" font-size="34" font-weight="800">',
            tierLabel,
            "</text>",
            '<text x="200" y="260" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="18">Tournament #',
            tId.toString(),
            "</text>",
            '<text x="200" y="300" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="14">Token #',
            tokenId.toString(),
            " \u00B7 Tier ",
            uint256(tier).toString(),
            "</text>",
            '<text x="200" y="360" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="12">SOULBOUND \u00B7 WireFluid</text>',
            "</svg>"
        );
    }

    /// @notice Soulbound enforcement: allow mint (from == 0) but block all
    ///         subsequent transfers. Burning (to == 0) is also blocked so
    ///         trophies are permanent.
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
    }
}

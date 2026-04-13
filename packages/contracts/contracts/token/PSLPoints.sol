// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IPSLTrophies} from "../interfaces/IPSLTrophies.sol";

/// @title PSLPoints — BNDY, the BoundaryLine ERC-20 with earned-balance tracking
/// @notice Transferable like any ERC-20, but prize eligibility is gated on
///         `earnedBalance`, which only increases via signed `sync()` vouchers.
///         Transfers never touch `earnedBalance`, so bought tokens cannot be
///         used to claim prizes.
contract PSLPoints is ERC20, EIP712, Ownable {
    /// @notice Cumulative tokens earned via gameplay. Bumped on `sync()`,
    ///         reset to 0 on `claimTier()`. Never moves on transfer.
    mapping(address => uint256) public earnedBalance;

    /// @notice Replay protection for both sync and claim vouchers.
    mapping(uint256 => bool) public usedNonces;

    /// @notice Backend EOA that signs EIP-712 vouchers.
    address public immutable trustedSigner;

    /// @notice PSLTrophies contract address. Set once via `setTrophies`.
    address public trophies;

    /// @notice Minimum earnedBalance required to claim any tier.
    uint256 public constant MIN_EARNED_TO_CLAIM = 10_000 * 10 ** 18;

    bytes32 private constant SYNC_VOUCHER_TYPEHASH =
        keccak256("SyncVoucher(address user,uint256 amount,uint256 nonce)");

    bytes32 private constant CLAIM_VOUCHER_TYPEHASH =
        keccak256("ClaimVoucher(address user,uint8 tierId,uint256 nonce)");

    event Synced(address indexed user, uint256 amount, uint256 newEarnedTotal, uint256 nonce);
    event TierClaimed(address indexed user, uint8 indexed tierId, uint256 burnedAmount, uint256 trophyTokenId);
    event TrophiesContractSet(address indexed trophies);

    error InvalidSignature();
    error NonceAlreadyUsed();
    error ZeroAmount();
    error BelowEarnedThreshold();
    error NothingToBurn();
    error TrophiesAlreadySet();
    error TrophiesNotSet();
    error InvalidAddress();

    constructor(address _trustedSigner, address initialOwner)
        ERC20("BoundaryLine", "BNDY")
        EIP712("BoundaryLine", "1")
        Ownable(initialOwner)
    {
        if (_trustedSigner == address(0)) revert InvalidAddress();
        trustedSigner = _trustedSigner;
    }

    /// @notice Sync off-chain earned points into on-chain BNDY.
    /// @dev Verifies EIP-712 signature from `trustedSigner`. Mints `amount`
    ///      and bumps `earnedBalance[msg.sender]`.
    function sync(uint256 amount, uint256 nonce, bytes calldata signature) external {
        if (amount == 0) revert ZeroAmount();
        if (usedNonces[nonce]) revert NonceAlreadyUsed();

        bytes32 structHash = keccak256(
            abi.encode(SYNC_VOUCHER_TYPEHASH, msg.sender, amount, nonce)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, signature);
        if (recovered != trustedSigner) revert InvalidSignature();

        // Effects
        usedNonces[nonce] = true;
        uint256 newEarned = earnedBalance[msg.sender] + amount;
        earnedBalance[msg.sender] = newEarned;

        // Interactions
        _mint(msg.sender, amount);

        emit Synced(msg.sender, amount, newEarned, nonce);
    }

    /// @notice Claim a prize tier. Burns caller's entire BNDY balance and
    ///         mints a soulbound trophy NFT via `PSLTrophies`.
    /// @dev    Gated on `earnedBalance >= MIN_EARNED_TO_CLAIM`. Resets
    ///         `earnedBalance` to zero so no user can claim twice.
    function claimTier(uint8 tierId, uint256 nonce, bytes calldata signature) external {
        if (earnedBalance[msg.sender] < MIN_EARNED_TO_CLAIM) revert BelowEarnedThreshold();
        if (usedNonces[nonce]) revert NonceAlreadyUsed();
        address _trophies = trophies;
        if (_trophies == address(0)) revert TrophiesNotSet();

        uint256 bal = balanceOf(msg.sender);
        if (bal == 0) revert NothingToBurn();

        bytes32 structHash = keccak256(
            abi.encode(CLAIM_VOUCHER_TYPEHASH, msg.sender, tierId, nonce)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, signature);
        if (recovered != trustedSigner) revert InvalidSignature();

        // Effects
        usedNonces[nonce] = true;
        earnedBalance[msg.sender] = 0;
        _burn(msg.sender, bal);

        // Interactions — trophies contract is trusted (set once by owner).
        uint256 tokenId = IPSLTrophies(_trophies).mintTrophy(msg.sender, tierId);

        emit TierClaimed(msg.sender, tierId, bal, tokenId);
    }

    /// @notice One-shot setter for the trophies contract. Reverts if already set.
    function setTrophies(address _trophies) external onlyOwner {
        if (_trophies == address(0)) revert InvalidAddress();
        if (trophies != address(0)) revert TrophiesAlreadySet();
        trophies = _trophies;
        emit TrophiesContractSet(_trophies);
    }
}

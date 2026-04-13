// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IPSLTrophies {
    function mintTrophy(address winner, uint8 tierId) external returns (uint256 tokenId);
}

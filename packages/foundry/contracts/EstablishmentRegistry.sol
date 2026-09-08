// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title EstablishmentRegistry
 * @notice Single source of truth for platform roles. The NFT contracts
 *         (DiscountNFT, BonusNFT) hold a reference to this registry and query
 *         it for authorization instead of managing their own role state.
 *
 *         Centralizing roles here means onboarding/offboarding a partner
 *         establishment (or rotating the relayer key) is a single transaction,
 *         and future contracts can plug into the same permission set.
 */
contract EstablishmentRegistry is AccessControl {
    /// @notice Partner establishments — allowed to redeem (burn) discount NFTs.
    bytes32 public constant ESTABLISHMENT_ROLE = keccak256("ESTABLISHMENT_ROLE");

    /// @notice Platform backend account — allowed to mint soulbound bonus NFTs.
    /// Created now (even though the backend is out of scope for this phase) so
    /// BonusNFT can ship with the correct authorization already wired.
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");

    // AccessControl already emits RoleGranted/RoleRevoked; these dedicated
    // events exist so an off-chain indexer can track the establishment list
    // without filtering generic role events by role hash.
    event EstablishmentAdded(address indexed account);
    event EstablishmentRemoved(address indexed account);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function addEstablishment(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(ESTABLISHMENT_ROLE, account);
        emit EstablishmentAdded(account);
    }

    function removeEstablishment(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(ESTABLISHMENT_ROLE, account);
        emit EstablishmentRemoved(account);
    }

    function isEstablishment(address account) external view returns (bool) {
        return hasRole(ESTABLISHMENT_ROLE, account);
    }

    function isRelayer(address account) external view returns (bool) {
        return hasRole(RELAYER_ROLE, account);
    }

    function isAdmin(address account) external view returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE, account);
    }
}

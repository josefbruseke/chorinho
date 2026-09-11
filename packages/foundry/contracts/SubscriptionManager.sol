// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SubscriptionManager
 * @notice Espelho on-chain da assinatura do comerciante. Agnostico de gateway:
 *         quem pagou — Stripe, Mercado Pago, Asaas, Pix ou USDC — e problema do
 *         backend, e o contrato so guarda o resultado.
 *
 *         Separado do EstablishmentRegistry de proposito. A semantica de plano
 *         vai mudar muito (tiers novos, trial, carencia), enquanto o registry
 *         precisa ser estavel: DiscountNFT e BonusNFT o guardam como immutable
 *         e trocar de registry exigiria redeploy deles. O StampLedger guarda
 *         este contrato num endereco mutavel, entao substituir a logica de
 *         assinatura nao derruba nada.
 */
contract SubscriptionManager is AccessControl {
    /// @notice Conta do backend autorizada a espelhar o resultado da cobranca.
    bytes32 public constant BILLING_ORACLE_ROLE = keccak256("BILLING_ORACLE_ROLE");

    struct Subscription {
        uint8 tier;
        uint64 expiresAt;
        /// @dev Hash da referencia no gateway. Permite auditar sem expor o id.
        bytes32 providerRefHash;
    }

    mapping(uint256 establishmentId => Subscription) public subscriptions;

    event SubscriptionUpdated(uint256 indexed establishmentId, uint8 tier, uint64 expiresAt, bytes32 providerRefHash);

    error NotBillingOracle();
    error InvalidTier();

    /// @dev Tier zero significa "sem plano"; acima de 3 nao existe hoje.
    uint8 public constant MAX_TIER = 3;

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /**
     * @notice Grava o estado da assinatura. Idempotente por natureza: o webhook
     *         do gateway reenvia, e reenviar o mesmo estado nao causa dano.
     */
    function setSubscription(uint256 establishmentId, uint8 tier, uint64 validUntil, bytes32 providerRefHash) external {
        if (!hasRole(BILLING_ORACLE_ROLE, msg.sender) && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert NotBillingOracle();
        }
        if (tier > MAX_TIER) revert InvalidTier();

        subscriptions[establishmentId] =
            Subscription({ tier: tier, expiresAt: validUntil, providerRefHash: providerRefHash });

        emit SubscriptionUpdated(establishmentId, tier, validUntil, providerRefHash);
    }

    function isActive(uint256 establishmentId) external view returns (bool) {
        Subscription storage s = subscriptions[establishmentId];
        return s.tier > 0 && s.expiresAt > block.timestamp;
    }

    function tierOf(uint256 establishmentId) external view returns (uint8) {
        Subscription storage s = subscriptions[establishmentId];
        return s.expiresAt > block.timestamp ? s.tier : 0;
    }

    function expiresAt(uint256 establishmentId) external view returns (uint64) {
        return subscriptions[establishmentId].expiresAt;
    }
}

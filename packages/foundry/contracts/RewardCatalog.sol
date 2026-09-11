// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { EstablishmentRegistry } from "./EstablishmentRegistry.sol";
import { StampLedger } from "./StampLedger.sol";
import { PointsVault } from "./PointsVault.sol";

/**
 * @title RewardCatalog
 * @notice O que o cliente leva em troca dos carimbos e pontos.
 *
 *         A foto, o nome e a descricao da recompensa vivem no Supabase; aqui
 *         fica so o que precisa ser provado: quanto custa, quanto sobrou, e que
 *         o resgate aconteceu.
 *
 * @dev A queima de selo e de ponto acontece na mesma transacao, de proposito:
 *      cobrar uma moeda e falhar na outra deixaria o cliente pagando por nada.
 */
contract RewardCatalog {
    struct Reward {
        uint256 establishmentId;
        uint256 stampCost;
        uint256 pointTypeId;
        uint256 pointCost;
        uint64 startTime;
        uint64 endTime;
        /// @notice Zero = sem limite.
        uint32 maxRedemptions;
        uint32 redeemed;
        bool active;
        /// @notice Hash do registro no Supabase, para detectar adulteracao.
        bytes32 metadataHash;
    }

    EstablishmentRegistry public immutable registry;
    StampLedger public immutable stampLedger;
    PointsVault public immutable pointsVault;

    mapping(uint256 rewardId => Reward) public rewards;

    /// @notice Resgates ja processados. Mesmo papel do saleRef no ledger: o PDV
    ///         offline reenvia, e isto impede cobrar duas vezes.
    mapping(bytes32 claimRef => bool) public usedClaimRef;

    uint256 private _nextRewardId = 1;

    event RewardCreated(
        uint256 indexed rewardId, uint256 indexed establishmentId, uint256 stampCost, uint256 pointCost
    );
    event RewardUpdated(uint256 indexed rewardId, bool active, uint32 maxRedemptions);
    event RewardClaimed(
        uint256 indexed rewardId,
        uint256 indexed establishmentId,
        address indexed customer,
        uint256 stampCost,
        uint256 pointCost,
        bytes32 claimRef
    );

    error NotEstablishmentOwner();
    error NotOperator();
    error UnknownReward();
    error RewardInactive();
    error RewardNotStarted();
    error RewardEnded();
    error RewardSoldOut();
    error ClaimAlreadyProcessed();
    error FreeRewardNotAllowed();

    constructor(EstablishmentRegistry _registry, StampLedger _stampLedger, PointsVault _pointsVault) {
        registry = _registry;
        stampLedger = _stampLedger;
        pointsVault = _pointsVault;
    }

    // ----------------------------------------------------------- catalogo

    function createReward(
        uint256 establishmentId,
        uint256 stampCost,
        uint256 pointTypeId,
        uint256 pointCost,
        uint64 startTime,
        uint64 endTime,
        uint32 maxRedemptions,
        bytes32 metadataHash
    ) external returns (uint256 rewardId) {
        _onlyOwnerOrAdmin(establishmentId);

        // Recompensa que nao custa nada nao e recompensa: seria um botao de
        // estoque infinito que qualquer um aperta em laco.
        if (stampCost == 0 && pointCost == 0) revert FreeRewardNotAllowed();

        rewardId = _nextRewardId++;
        rewards[rewardId] = Reward({
            establishmentId: establishmentId,
            stampCost: stampCost,
            pointTypeId: pointTypeId,
            pointCost: pointCost,
            startTime: startTime,
            endTime: endTime,
            maxRedemptions: maxRedemptions,
            redeemed: 0,
            active: true,
            metadataHash: metadataHash
        });

        emit RewardCreated(rewardId, establishmentId, stampCost, pointCost);
    }

    function setRewardActive(uint256 rewardId, bool active, uint32 maxRedemptions) external {
        Reward storage r = rewards[rewardId];
        if (r.establishmentId == 0) revert UnknownReward();
        _onlyOwnerOrAdmin(r.establishmentId);

        r.active = active;
        r.maxRedemptions = maxRedemptions;
        emit RewardUpdated(rewardId, active, maxRedemptions);
    }

    // ------------------------------------------------------------ resgate

    /**
     * @notice Entrega a recompensa: queima o que ela custa e registra.
     * @dev Quem chama e o atendente ou o relayer — nunca o proprio cliente. O
     *      resgate acontece no balcao, com a coisa sendo entregue na mao.
     *
     *      De proposito NAO exige assinatura ativa: loja com pagamento atrasado
     *      para de emitir carimbo novo, mas segue obrigada a honrar o que o
     *      cliente ja juntou.
     */
    function claim(uint256 rewardId, address customer, bytes32 claimRef) external {
        if (usedClaimRef[claimRef]) revert ClaimAlreadyProcessed();

        Reward storage r = rewards[rewardId];
        if (r.establishmentId == 0) revert UnknownReward();

        if (!registry.isOperatorOf(msg.sender, r.establishmentId) && !registry.isRelayer(msg.sender)) {
            revert NotOperator();
        }

        if (!r.active) revert RewardInactive();
        if (r.startTime != 0 && block.timestamp < r.startTime) revert RewardNotStarted();
        if (r.endTime != 0 && block.timestamp > r.endTime) revert RewardEnded();
        if (r.maxRedemptions != 0 && r.redeemed >= r.maxRedemptions) revert RewardSoldOut();

        // Efeitos antes das chamadas externas.
        usedClaimRef[claimRef] = true;
        r.redeemed += 1;

        if (r.stampCost > 0) {
            stampLedger.burnStamps(r.establishmentId, customer, r.stampCost, claimRef);
        }
        if (r.pointCost > 0) {
            pointsVault.burn(customer, r.pointTypeId, r.pointCost);
        }

        emit RewardClaimed(rewardId, r.establishmentId, customer, r.stampCost, r.pointCost, claimRef);
    }

    // ------------------------------------------------------------ leitura

    /// @notice Se o cliente consegue resgatar agora. E o que o PDV consulta
    ///         antes de oferecer o botao ao atendente.
    function canClaim(uint256 rewardId, address customer) external view returns (bool) {
        Reward storage r = rewards[rewardId];
        if (r.establishmentId == 0 || !r.active) return false;
        if (r.startTime != 0 && block.timestamp < r.startTime) return false;
        if (r.endTime != 0 && block.timestamp > r.endTime) return false;
        if (r.maxRedemptions != 0 && r.redeemed >= r.maxRedemptions) return false;

        if (r.stampCost > 0 && stampLedger.stampsOf(r.establishmentId, customer) < r.stampCost) return false;
        if (r.pointCost > 0 && pointsVault.balanceOf(customer, r.pointTypeId) < r.pointCost) return false;

        return true;
    }

    function remainingRedemptions(uint256 rewardId) external view returns (uint256) {
        Reward storage r = rewards[rewardId];
        if (r.maxRedemptions == 0) return type(uint256).max;
        return r.maxRedemptions > r.redeemed ? r.maxRedemptions - r.redeemed : 0;
    }

    function _onlyOwnerOrAdmin(uint256 establishmentId) private view {
        if (registry.ownerOfEstablishment(establishmentId) != msg.sender && !registry.isAdmin(msg.sender)) {
            revert NotEstablishmentOwner();
        }
    }
}

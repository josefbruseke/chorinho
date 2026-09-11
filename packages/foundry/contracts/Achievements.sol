// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { BonusNFT } from "./BonusNFT.sol";
import { DiscountNFT } from "./DiscountNFT.sol";
import { EstablishmentRegistry } from "./EstablishmentRegistry.sol";
import { StampLedger } from "./StampLedger.sol";

/**
 * @title Achievements
 * @notice As conquistas que a loja define: "quem vier dez vezes", "quem
 *         mantiver tres semanas de sequencia", "quem ja gastou quinhentos
 *         reais aqui". Entrega um selo, uma peca da colecao, ou os dois.
 *
 * @dev O ponto inteiro deste contrato e ONDE a verdade e conferida.
 *
 *      O relayer dispara a reivindicacao -- e ele que paga o gas, porque o
 *      cliente nunca assina nada. Mas para os quatro criterios acumulados quem
 *      decide se a conquista foi merecida e ESTE contrato, lendo o StampLedger
 *      na hora. Relayer comprometido nao forja conquista; e o mesmo raciocinio
 *      do `mintOrUpgrade` do BonusNFT.
 *
 *      `SingleSale` e a excecao, e vem anotada como tal. "Comprou acima de
 *      cinquenta reais NESTA compra" depende de uma venda especifica, e o
 *      StampLedger nao guarda valor por venda -- ele guarda o acumulado. Aqui
 *      o servidor atesta. O estrago de um relayer comprometido fica contido:
 *      ele cunharia peca de desconto de graca, o que e ruim, mas nao cria
 *      carimbo nem mexe na contabilidade de ninguem.
 */
contract Achievements {
    enum Criterion {
        /// @notice Carimbos de sempre na loja.
        LifetimeStamps,
        /// @notice Sequencia de visitas em curso.
        CurrentStreak,
        /// @notice Quantas vezes voltou.
        Visits,
        /// @notice Total gasto na loja, em centavos.
        TotalSpentCents,
        /// @notice Uma compra especifica. Atestado pelo servidor -- ver a nota
        ///         no topo do contrato.
        SingleSale
    }

    struct Achievement {
        uint256 establishmentId;
        Criterion criterion;
        uint256 target;
        uint64 startTime;
        uint64 endTime;
        /// @notice Teto de quantas pessoas podem conquistar. 0 = sem teto.
        uint32 maxWinners;
        uint32 winners;
        /// @notice Peca entregue ao conquistar. 0 = nao entrega peca.
        uint256 pieceId;
        /// @notice Se cunha o selo intransferivel no BonusNFT.
        bool grantsBadge;
        /// @notice Trilha a que o selo pertence. 0 = conquista da loja.
        uint256 routeId;
        bool active;
        bool exists;
        /// @notice Hash do registro no Supabase, para detectar adulteracao.
        bytes32 metadataHash;
    }

    EstablishmentRegistry public immutable registry;
    StampLedger public immutable stampLedger;
    BonusNFT public immutable bonusNFT;
    DiscountNFT public immutable discountNFT;

    mapping(uint256 achievementId => Achievement) private _achievements;
    mapping(uint256 achievementId => mapping(address customer => bool)) public claimedBy;

    /// @notice Reivindicacoes ja processadas. Mesmo papel do `saleRef` no
    ///         ledger: o servidor reenvia depois de uma queda de rede, e e isto
    ///         que impede entregar duas vezes.
    mapping(bytes32 claimRef => bool) public usedClaimRef;

    /// @notice Arte do selo de cada conquista. Fora da struct porque string em
    ///         struct devolvida por view custa caro a cada leitura, e a lista
    ///         do painel le muitas de uma vez.
    mapping(uint256 achievementId => string) public badgeUri;

    uint256 private _nextAchievementId = 1;

    event AchievementCreated(
        uint256 indexed achievementId, uint256 indexed establishmentId, Criterion criterion, uint256 target
    );
    event AchievementActiveSet(uint256 indexed achievementId, bool active);
    event AchievementClaimed(
        uint256 indexed achievementId,
        uint256 indexed establishmentId,
        address indexed customer,
        uint256 badgeTokenId,
        uint256 pieceId,
        bytes32 claimRef
    );

    error NotEstablishmentOwner();
    error NotRelayer();
    error UnknownAchievement();
    error AchievementInactive();
    error AchievementNotStarted();
    error AchievementEnded();
    error NoWinnersLeft();
    error AlreadyClaimed();
    error ClaimAlreadyProcessed();
    error CriterionNotMet(uint256 achieved, uint256 target);
    error DeliversNothing();
    error InvalidTarget();
    error InvalidWindow();

    constructor(
        EstablishmentRegistry _registry,
        StampLedger _stampLedger,
        BonusNFT _bonusNFT,
        DiscountNFT _discountNFT
    ) {
        registry = _registry;
        stampLedger = _stampLedger;
        bonusNFT = _bonusNFT;
        discountNFT = _discountNFT;
    }

    // ------------------------------------------------------------ catalogo

    function createAchievement(
        uint256 establishmentId,
        Criterion criterion,
        uint256 target,
        uint64 startTime,
        uint64 endTime,
        uint32 maxWinners,
        uint256 pieceId,
        bool grantsBadge,
        uint256 routeId,
        string calldata uri,
        bytes32 metadataHash
    ) external returns (uint256 achievementId) {
        _onlyOwnerOrAdmin(establishmentId);

        if (target == 0) revert InvalidTarget();
        if (endTime != 0 && endTime <= startTime) revert InvalidWindow();
        // Conquista que nao entrega nada e so uma barra de progresso: o cliente
        // chega no fim e nao ganha coisa alguma.
        if (pieceId == 0 && !grantsBadge) revert DeliversNothing();

        achievementId = _nextAchievementId++;
        _achievements[achievementId] = Achievement({
            establishmentId: establishmentId,
            criterion: criterion,
            target: target,
            startTime: startTime,
            endTime: endTime,
            maxWinners: maxWinners,
            winners: 0,
            pieceId: pieceId,
            grantsBadge: grantsBadge,
            routeId: routeId,
            active: true,
            exists: true,
            metadataHash: metadataHash
        });
        badgeUri[achievementId] = uri;

        emit AchievementCreated(achievementId, establishmentId, criterion, target);
    }

    function setAchievementActive(uint256 achievementId, bool active) external {
        Achievement storage a = _achievements[achievementId];
        if (!a.exists) revert UnknownAchievement();
        _onlyOwnerOrAdmin(a.establishmentId);

        a.active = active;
        emit AchievementActiveSet(achievementId, active);
    }

    // -------------------------------------------------------- reivindicar

    /**
     * @notice Entrega a conquista a quem a mereceu.
     * @dev Quem chama e o relayer, porque o cliente nao assina nada. Quem
     *      decide e o `_criterionMet` logo abaixo.
     */
    function claim(uint256 achievementId, address customer, bytes32 claimRef) external {
        if (!registry.isRelayer(msg.sender)) revert NotRelayer();
        if (usedClaimRef[claimRef]) revert ClaimAlreadyProcessed();

        Achievement storage a = _achievements[achievementId];
        if (!a.exists) revert UnknownAchievement();
        if (!a.active) revert AchievementInactive();
        if (a.startTime != 0 && block.timestamp < a.startTime) revert AchievementNotStarted();
        if (a.endTime != 0 && block.timestamp > a.endTime) revert AchievementEnded();
        if (a.maxWinners != 0 && a.winners >= a.maxWinners) revert NoWinnersLeft();
        if (claimedBy[achievementId][customer]) revert AlreadyClaimed();

        (bool merecida, uint256 alcancado) = _criterionMet(a, customer);
        if (!merecida) revert CriterionNotMet(alcancado, a.target);

        // Efeitos antes das chamadas externas: as duas entregas abaixo saem
        // deste contrato.
        usedClaimRef[claimRef] = true;
        claimedBy[achievementId][customer] = true;
        a.winners += 1;

        uint256 badgeTokenId;
        if (a.grantsBadge) {
            badgeTokenId =
                bonusNFT.mintAchievementBadge(customer, a.establishmentId, a.routeId, badgeUri[achievementId]);
        }
        if (a.pieceId != 0) {
            discountNFT.mintTo(customer, a.pieceId, 1);
        }

        emit AchievementClaimed(achievementId, a.establishmentId, customer, badgeTokenId, a.pieceId, claimRef);
    }

    // ------------------------------------------------------------- leitura

    /// @notice Quanto a pessoa ja tem do que a conquista pede, e se ja bateu. E
    ///         o que a carteira mostra como "faltam 3 visitas".
    function progressOf(uint256 achievementId, address customer)
        external
        view
        returns (uint256 achieved, uint256 target, bool met, bool alreadyClaimed)
    {
        Achievement storage a = _achievements[achievementId];
        if (!a.exists) revert UnknownAchievement();

        (met, achieved) = _criterionMet(a, customer);
        return (achieved, a.target, met, claimedBy[achievementId][customer]);
    }

    function getAchievement(uint256 achievementId) external view returns (Achievement memory) {
        if (!_achievements[achievementId].exists) revert UnknownAchievement();
        return _achievements[achievementId];
    }

    function achievementExists(uint256 achievementId) external view returns (bool) {
        return _achievements[achievementId].exists;
    }

    /**
     * @dev Le o estado da cartela na hora. `SingleSale` e o unico criterio que
     *      este contrato nao consegue conferir, e por isso passa direto -- a
     *      confianca ali e no servidor, e esta anotada no topo do contrato.
     */
    function _criterionMet(Achievement storage a, address customer) private view returns (bool met, uint256 achieved) {
        if (a.criterion == Criterion.SingleSale) return (true, a.target);

        (, uint256 lifetime, uint256 lifetimeCents, uint32 streakCurrent,, uint32 visits,) =
            stampLedger.walletOf(a.establishmentId, customer);

        if (a.criterion == Criterion.LifetimeStamps) achieved = lifetime;
        else if (a.criterion == Criterion.CurrentStreak) achieved = streakCurrent;
        else if (a.criterion == Criterion.Visits) achieved = visits;
        else achieved = lifetimeCents;

        return (achieved >= a.target, achieved);
    }

    function _onlyOwnerOrAdmin(uint256 establishmentId) private view {
        if (registry.ownerOfEstablishment(establishmentId) != msg.sender && !registry.isAdmin(msg.sender)) {
            revert NotEstablishmentOwner();
        }
    }
}

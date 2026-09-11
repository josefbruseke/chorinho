// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { EstablishmentRegistry } from "./EstablishmentRegistry.sol";
import { SubscriptionManager } from "./SubscriptionManager.sol";
import { PointsVault } from "./PointsVault.sol";

/**
 * @title StampLedger
 * @notice O nucleo do Chorinho: registra o carimbo dado no balcao.
 *
 *         O caixa escaneia o passe do cliente, informa o valor da venda, e os
 *         selos saem das regras que aquele comerciante configurou. O contrato
 *         nao confia no valor enviado: ele impoe piso de ticket, teto por
 *         venda, intervalo minimo entre carimbos e limite de bonus por produto.
 *
 * @dev Esses tetos sao a defesa real contra um relayer ou PDV comprometido —
 *      nao a guarda da chave. Mesmo com a chave vazada, o estrago fica preso ao
 *      que as regras permitem.
 */
contract StampLedger {
    // ------------------------------------------------------------- regras

    struct AccrualRule {
        /// @notice Venda abaixo disso nao gera carimbo. E o que torna o
        ///         programa viavel para o comerciante.
        uint64 minTicketCents;
        /// @notice Quantos centavos de venda valem um carimbo.
        uint64 centsPerStamp;
        /// @notice Teto por venda. Limita o dano de um valor absurdo.
        uint16 maxStampsPerTx;
        /// @notice Intervalo minimo entre carimbos do mesmo cliente na loja.
        uint32 cooldownSeconds;
        /// @notice Janela para manter a sequencia. Uma semana faz mais sentido
        ///         que um dia numa barbearia.
        uint32 streakWindowSeconds;
        /// @notice Pontos da rede por carimbo.
        uint32 pointsPerStamp;
        /// @notice Classe de ponto creditada no PointsVault.
        uint256 pointTypeId;
        bool active;
    }

    struct Wallet {
        /// @notice Selos gastaveis — a cartela.
        uint256 balance;
        /// @notice Total de sempre. Base dos tiers de conquista.
        uint256 lifetime;
        uint256 lifetimeCents;
        uint32 streakCurrent;
        uint32 streakBest;
        uint32 visits;
        uint64 lastVisitAt;
    }

    struct Sale {
        uint256 establishmentId;
        address customer;
        uint64 amountCents;
        /// @notice Bonus do produto, em pontos-base. 10000 = sem bonus.
        uint16 productBoostBps;
        /// @notice Identificador unico da venda. E o que torna reenvio seguro.
        bytes32 saleRef;
    }

    // ------------------------------------------------------------- estado

    EstablishmentRegistry public immutable registry;
    PointsVault public immutable pointsVault;

    /// @dev Mutavel de proposito: a semantica de assinatura vai mudar, e trocar
    ///      o contrato de cobranca nao pode exigir redeploy deste.
    SubscriptionManager public subscriptions;
    address public admin;

    mapping(uint256 establishmentId => AccrualRule) public rules;
    mapping(uint256 establishmentId => mapping(address customer => Wallet)) public walletOf;

    /// @notice Vendas ja processadas. O PDV offline reenvia, e e isto que
    ///         impede o cliente de ganhar duas vezes pela mesma compra.
    mapping(bytes32 saleRef => bool) public usedSaleRef;

    /// @dev Teto absoluto do bonus por produto: 3x. O catalogo vive fora da
    ///      cadeia, entao o limite precisa estar aqui.
    uint16 public constant MAX_BOOST_BPS = 30_000;
    uint16 public constant BPS_DENOMINATOR = 10_000;

    // ------------------------------------------------------------ eventos

    event StampsIssued(
        uint256 indexed establishmentId,
        address indexed customer,
        address indexed operator,
        uint256 stamps,
        uint256 points,
        uint64 amountCents,
        bytes32 saleRef,
        uint256 newBalance,
        uint32 streakCurrent
    );
    event StampsRedeemed(uint256 indexed establishmentId, address indexed customer, uint256 stamps, bytes32 claimRef);
    event AccrualRuleSet(uint256 indexed establishmentId, AccrualRule rule);
    event SubscriptionManagerSet(address indexed subscriptions);
    event AdminTransferred(address indexed novo);

    // ------------------------------------------------------------- erros

    error NotAdmin();
    error NotOperator();
    error SubscriptionInactive();
    error EstablishmentInactive();
    error RuleInactive();
    error SaleAlreadyProcessed();
    error TicketBelowFloor(uint64 amountCents, uint64 minTicketCents);
    error CooldownActive(uint64 secondsRemaining);
    error BoostTooHigh(uint16 boostBps);
    error InvalidRule();
    error InsufficientStamps(uint256 balance, uint256 requested);
    error NothingToIssue();

    constructor(
        EstablishmentRegistry _registry,
        SubscriptionManager _subscriptions,
        PointsVault _pointsVault,
        address _admin
    ) {
        registry = _registry;
        subscriptions = _subscriptions;
        pointsVault = _pointsVault;
        admin = _admin;
    }

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    // ---------------------------------------------------------- ajustes

    function setSubscriptionManager(SubscriptionManager novo) external onlyAdmin {
        subscriptions = novo;
        emit SubscriptionManagerSet(address(novo));
    }

    function transferAdmin(address novo) external onlyAdmin {
        admin = novo;
        emit AdminTransferred(novo);
    }

    /// @notice Configura como a loja distribui carimbos. So o dono ou o admin.
    function setAccrualRule(uint256 establishmentId, AccrualRule calldata rule) external {
        if (registry.ownerOfEstablishment(establishmentId) != msg.sender && msg.sender != admin) revert NotOperator();
        if (rule.centsPerStamp == 0 || rule.maxStampsPerTx == 0) revert InvalidRule();

        rules[establishmentId] = rule;
        emit AccrualRuleSet(establishmentId, rule);
    }

    // ---------------------------------------------------------- carimbo

    /// @notice Registra uma venda e credita os carimbos dela.
    function issueStamps(Sale calldata sale) external returns (uint256 stamps, uint256 points) {
        return _issue(sale);
    }

    /**
     * @notice Varias vendas numa transacao so.
     * @dev E isto que torna o relayer barato: com a fila offline do PDV, o
     *      lote e o caso normal, nao a excecao. Uma venda ja processada nao
     *      derruba o lote inteiro — ela e pulada, porque um reenvio parcial
     *      depois de queda de rede e esperado, nao erro.
     */
    function issueStampsBatch(Sale[] calldata vendas) external returns (uint256 totalStamps, uint256 totalPoints) {
        uint256 n = vendas.length;
        for (uint256 i = 0; i < n; ++i) {
            if (usedSaleRef[vendas[i].saleRef]) continue;
            (uint256 s, uint256 p) = _issue(vendas[i]);
            totalStamps += s;
            totalPoints += p;
        }
    }

    function _issue(Sale calldata sale) private returns (uint256 stamps, uint256 points) {
        // 1. Idempotencia primeiro: e o que torna o reenvio do PDV seguro.
        if (usedSaleRef[sale.saleRef]) revert SaleAlreadyProcessed();

        // 2. Quem esta operando o balcao
        if (!registry.isOperatorOf(msg.sender, sale.establishmentId) && !registry.isRelayer(msg.sender)) {
            revert NotOperator();
        }

        if (!registry.isEstablishmentActive(sale.establishmentId)) revert EstablishmentInactive();

        // 3. Assinatura em dia. Note que o RESGATE nao passa por aqui: o
        //    cliente nao pode ser punido por problema de cobranca da loja.
        if (!subscriptions.isActive(sale.establishmentId)) revert SubscriptionInactive();

        AccrualRule storage rule = rules[sale.establishmentId];
        if (!rule.active) revert RuleInactive();

        // 4. O piso de ticket
        if (sale.amountCents < rule.minTicketCents) {
            revert TicketBelowFloor(sale.amountCents, rule.minTicketCents);
        }

        Wallet storage w = walletOf[sale.establishmentId][sale.customer];

        // 5. Intervalo minimo entre carimbos
        if (w.lastVisitAt != 0 && rule.cooldownSeconds > 0) {
            uint64 desde = uint64(block.timestamp) - w.lastVisitAt;
            if (desde < rule.cooldownSeconds) revert CooldownActive(uint64(rule.cooldownSeconds) - desde);
        }

        // 6. Teto do bonus de produto
        if (sale.productBoostBps > MAX_BOOST_BPS) revert BoostTooHigh(sale.productBoostBps);

        // 7. Quantos carimbos
        uint16 boost = sale.productBoostBps == 0 ? BPS_DENOMINATOR : sale.productBoostBps;
        // A ordem importa e e deliberada: primeiro quantos carimbos a venda
        // rende inteiros, depois o bonus do produto. Numa regra de "R$10 = 1
        // carimbo", uma venda de R$15 com produto de bonus 2x da 2 carimbos, e
        // nao 3 -- o bonus dobra o que foi ganho, nao o valor da compra.
        // Inverter para multiplicar antes mudaria a regra de negocio.
        // forge-lint: disable-next-line(divide-before-multiply)
        stamps = (uint256(sale.amountCents) / rule.centsPerStamp) * boost / BPS_DENOMINATOR;
        if (stamps > rule.maxStampsPerTx) stamps = rule.maxStampsPerTx;
        if (stamps == 0) revert NothingToIssue();

        // 8. Sequencia de visitas
        if (w.lastVisitAt == 0) {
            w.streakCurrent = 1;
        } else if (uint64(block.timestamp) - w.lastVisitAt <= rule.streakWindowSeconds) {
            w.streakCurrent += 1;
        } else {
            w.streakCurrent = 1;
        }
        if (w.streakCurrent > w.streakBest) w.streakBest = w.streakCurrent;

        // 9. Efeitos
        usedSaleRef[sale.saleRef] = true;
        w.balance += stamps;
        w.lifetime += stamps;
        w.lifetimeCents += sale.amountCents;
        w.visits += 1;
        w.lastVisitAt = uint64(block.timestamp);

        points = stamps * rule.pointsPerStamp;
        if (points > 0) {
            pointsVault.mint(sale.customer, rule.pointTypeId, points);
        }

        emit StampsIssued(
            sale.establishmentId,
            sale.customer,
            msg.sender,
            stamps,
            points,
            sale.amountCents,
            sale.saleRef,
            w.balance,
            w.streakCurrent
        );
    }

    // ---------------------------------------------------------- resgate

    /**
     * @notice Queima carimbos na entrega de uma recompensa.
     * @dev De proposito NAO exige assinatura ativa: se a loja atrasou o
     *      pagamento, ela para de emitir carimbo novo, mas continua obrigada a
     *      honrar o que o cliente ja juntou.
     */
    function burnStamps(uint256 establishmentId, address customer, uint256 amount, bytes32 claimRef) external {
        if (!registry.isOperatorOf(msg.sender, establishmentId) && !registry.isRelayer(msg.sender)) {
            revert NotOperator();
        }

        Wallet storage w = walletOf[establishmentId][customer];
        if (w.balance < amount) revert InsufficientStamps(w.balance, amount);

        w.balance -= amount;
        emit StampsRedeemed(establishmentId, customer, amount, claimRef);
    }

    // ---------------------------------------------------------- leitura

    function stampsOf(uint256 establishmentId, address customer) external view returns (uint256) {
        return walletOf[establishmentId][customer].balance;
    }

    function lifetimeStampsOf(uint256 establishmentId, address customer) external view returns (uint256) {
        return walletOf[establishmentId][customer].lifetime;
    }

    /// @notice Quantos carimbos uma venda geraria, sem gravar nada. E o que o
    ///         PDV mostra ao atendente antes de ele confirmar.
    function previewStamps(uint256 establishmentId, uint64 amountCents, uint16 productBoostBps)
        external
        view
        returns (uint256)
    {
        AccrualRule storage rule = rules[establishmentId];
        if (!rule.active || amountCents < rule.minTicketCents || rule.centsPerStamp == 0) return 0;
        if (productBoostBps > MAX_BOOST_BPS) return 0;

        uint16 boost = productBoostBps == 0 ? BPS_DENOMINATOR : productBoostBps;
        // forge-lint: disable-next-line(divide-before-multiply)
        uint256 s = (uint256(amountCents) / rule.centsPerStamp) * boost / BPS_DENOMINATOR;
        return s > rule.maxStampsPerTx ? rule.maxStampsPerTx : s;
    }
}

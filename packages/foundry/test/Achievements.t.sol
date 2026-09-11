// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { Achievements } from "../contracts/Achievements.sol";
import { BonusNFT } from "../contracts/BonusNFT.sol";
import { DiscountNFT } from "../contracts/DiscountNFT.sol";
import { DiscountProgram } from "../contracts/DiscountProgram.sol";
import { EstablishmentRegistry } from "../contracts/EstablishmentRegistry.sol";
import { PointsVault } from "../contracts/PointsVault.sol";
import { StampLedger } from "../contracts/StampLedger.sol";
import { SubscriptionManager } from "../contracts/SubscriptionManager.sol";

contract AchievementsTest is Test {
    EstablishmentRegistry registry;
    SubscriptionManager subs;
    PointsVault vault;
    StampLedger ledger;
    DiscountProgram programs;
    DiscountNFT discount;
    BonusNFT bonus;
    Achievements achievements;

    address admin = makeAddr("admin");
    address lojista = makeAddr("lojista");
    address atendente = makeAddr("atendente");
    address relayer = makeAddr("relayer");
    address cliente = makeAddr("cliente");
    address estranho = makeAddr("estranho");

    uint256 lojaId;
    uint256 programa;
    uint256 constant PONTO_CIDADE = 1;
    uint256 constant PECA = 1;

    function setUp() public {
        vm.startPrank(admin);

        registry = new EstablishmentRegistry(admin);
        subs = new SubscriptionManager(admin);
        vault = new PointsVault(admin, "https://chorinho.test/pontos/{id}.json");
        ledger = new StampLedger(registry, subs, vault, admin);
        programs = new DiscountProgram(registry);
        discount = new DiscountNFT(registry, programs);
        bonus = new BonusNFT(registry);
        achievements = new Achievements(registry, ledger, bonus, discount);

        registry.grantRole(registry.RELAYER_ROLE(), relayer);
        registry.grantRole(registry.RELAYER_ROLE(), address(achievements));
        vault.createPointType(PONTO_CIDADE, "Ponto da Cidade", PointsVault.Scope.City, 1);
        vault.grantRole(vault.MINTER_ROLE(), address(ledger));

        lojaId = registry.registerEstablishment(lojista, keccak256("cafe"));
        subs.setSubscription(lojaId, 1, uint64(block.timestamp + 365 days), keccak256("ref"));
        bonus.setStampLedger(ledger);

        vm.stopPrank();

        vm.startPrank(lojista);
        registry.addOperator(lojaId, atendente);
        ledger.setAccrualRule(
            lojaId,
            StampLedger.AccrualRule({
                minTicketCents: 500,
                centsPerStamp: 1000,
                maxStampsPerTx: 10,
                cooldownSeconds: 0,
                streakWindowSeconds: 7 days,
                pointsPerStamp: 5,
                pointTypeId: PONTO_CIDADE,
                active: true
            })
        );
        programa = programs.createProgram(
            lojaId, "Clube", DiscountProgram.DiscountKind.Percentual, 1000, 0, bytes32(0), 0, 0, false, bytes32(0)
        );
        DiscountNFT.PieceParams memory p;
        p.programId = programa;
        p.level = 1;
        p.uri = "ipfs://peca";
        discount.createPiece(PECA, p);
        vm.stopPrank();
    }

    // ------------------------------------------------------------- helpers

    function _carimbar(uint64 centavos, bytes32 ref) internal {
        vm.prank(atendente);
        ledger.issueStamps(
            StampLedger.Sale({
                establishmentId: lojaId, customer: cliente, amountCents: centavos, productBoostBps: 0, saleRef: ref
            })
        );
    }

    function _criar(Achievements.Criterion criterio, uint256 alvo, uint256 pecaId, bool selo)
        internal
        returns (uint256)
    {
        vm.prank(lojista);
        return achievements.createAchievement(
            lojaId, criterio, alvo, 0, 0, 0, pecaId, selo, 0, "ipfs://selo", keccak256("meta")
        );
    }

    // ------------------------------------------------------------ catalogo

    function test_Criar_GuardaAConquista() public {
        uint256 id = _criar(Achievements.Criterion.Visits, 10, PECA, true);
        Achievements.Achievement memory a = achievements.getAchievement(id);

        assertEq(a.establishmentId, lojaId);
        assertEq(uint8(a.criterion), uint8(Achievements.Criterion.Visits));
        assertEq(a.target, 10);
        assertEq(a.pieceId, PECA);
        assertTrue(a.grantsBadge);
        assertTrue(a.active);
    }

    function test_Criar_SoDonoOuAdmin() public {
        vm.prank(estranho);
        vm.expectRevert(Achievements.NotEstablishmentOwner.selector);
        achievements.createAchievement(
            lojaId, Achievements.Criterion.Visits, 1, 0, 0, 0, PECA, false, 0, "", bytes32(0)
        );
    }

    /// Conquista que nao entrega nada e so uma barra de progresso: o cliente
    /// chega no fim e nao ganha coisa alguma.
    function test_Criar_RecusaConquistaQueNaoEntregaNada() public {
        vm.prank(lojista);
        vm.expectRevert(Achievements.DeliversNothing.selector);
        achievements.createAchievement(lojaId, Achievements.Criterion.Visits, 5, 0, 0, 0, 0, false, 0, "", bytes32(0));
    }

    function test_Criar_RecusaAlvoZero() public {
        vm.prank(lojista);
        vm.expectRevert(Achievements.InvalidTarget.selector);
        achievements.createAchievement(
            lojaId, Achievements.Criterion.Visits, 0, 0, 0, 0, PECA, false, 0, "", bytes32(0)
        );
    }

    // -------------------------------------------------------- criterios

    function test_Criterio_VisitasEntregaSeloEPeca() public {
        uint256 id = _criar(Achievements.Criterion.Visits, 2, PECA, true);

        _carimbar(3000, "v1");
        _carimbar(3000, "v2");

        vm.prank(relayer);
        achievements.claim(id, cliente, keccak256("c1"));

        assertEq(bonus.balanceOf(cliente), 1, "selo cunhado");
        assertEq(discount.balanceOf(cliente, PECA), 1, "peca entregue");
        assertTrue(achievements.claimedBy(id, cliente));
        assertEq(achievements.getAchievement(id).winners, 1);
    }

    /**
     * O teste que justifica o contrato existir: o relayer manda, mas quem
     * decide e a cadeia. Relayer comprometido nao forja conquista.
     */
    function test_Criterio_RelayerNaoForjaConquista() public {
        uint256 id = _criar(Achievements.Criterion.Visits, 5, PECA, true);

        _carimbar(3000, "v1");

        vm.prank(relayer);
        vm.expectRevert(abi.encodeWithSelector(Achievements.CriterionNotMet.selector, 1, 5));
        achievements.claim(id, cliente, keccak256("c1"));
    }

    function test_Criterio_CarimbosVitalicios() public {
        uint256 id = _criar(Achievements.Criterion.LifetimeStamps, 5, PECA, false);

        _carimbar(3000, "v1"); // 3 carimbos
        vm.prank(relayer);
        vm.expectRevert(abi.encodeWithSelector(Achievements.CriterionNotMet.selector, 3, 5));
        achievements.claim(id, cliente, keccak256("c1"));

        _carimbar(3000, "v2"); // +3 = 6
        vm.prank(relayer);
        achievements.claim(id, cliente, keccak256("c2"));
        assertEq(discount.balanceOf(cliente, PECA), 1);
    }

    function test_Criterio_GastoTotal() public {
        uint256 id = _criar(Achievements.Criterion.TotalSpentCents, 10_000, PECA, false);

        _carimbar(6000, "v1");
        vm.prank(relayer);
        vm.expectRevert(abi.encodeWithSelector(Achievements.CriterionNotMet.selector, 6000, 10_000));
        achievements.claim(id, cliente, keccak256("c1"));

        _carimbar(5000, "v2");
        vm.prank(relayer);
        achievements.claim(id, cliente, keccak256("c2"));
    }

    function test_Criterio_Sequencia() public {
        uint256 id = _criar(Achievements.Criterion.CurrentStreak, 2, PECA, false);

        _carimbar(3000, "v1");
        vm.warp(block.timestamp + 1 days);
        _carimbar(3000, "v2");

        vm.prank(relayer);
        achievements.claim(id, cliente, keccak256("c1"));
        assertEq(discount.balanceOf(cliente, PECA), 1);
    }

    /// A venda avulsa e a unica que a cadeia nao confere. Esta anotada no
    /// contrato, e o teste registra a escolha em vez de escondê-la.
    function test_Criterio_VendaAvulsaPassaSemConferencia() public {
        uint256 id = _criar(Achievements.Criterion.SingleSale, 5000, PECA, false);

        // Cliente sem carimbo nenhum: o servidor e quem atesta.
        vm.prank(relayer);
        achievements.claim(id, cliente, keccak256("c1"));
        assertEq(discount.balanceOf(cliente, PECA), 1);
    }

    function test_Progresso_MostraQuantoFalta() public {
        uint256 id = _criar(Achievements.Criterion.Visits, 3, PECA, false);
        _carimbar(3000, "v1");

        (uint256 alcancado, uint256 alvo, bool bateu, bool jaPegou) = achievements.progressOf(id, cliente);
        assertEq(alcancado, 1);
        assertEq(alvo, 3);
        assertFalse(bateu);
        assertFalse(jaPegou);
    }

    // ---------------------------------------------------------- travas

    function test_Claim_SoRelayer() public {
        uint256 id = _criar(Achievements.Criterion.SingleSale, 1, PECA, false);

        vm.prank(lojista);
        vm.expectRevert(Achievements.NotRelayer.selector);
        achievements.claim(id, cliente, keccak256("c1"));
    }

    function test_Claim_NaoEntregaDuasVezesAoMesmoCliente() public {
        uint256 id = _criar(Achievements.Criterion.SingleSale, 1, PECA, false);

        vm.startPrank(relayer);
        achievements.claim(id, cliente, keccak256("c1"));
        vm.expectRevert(Achievements.AlreadyClaimed.selector);
        achievements.claim(id, cliente, keccak256("c2"));
        vm.stopPrank();
    }

    /// Reenvio depois de queda de rede nao pode entregar duas vezes.
    function test_Claim_MesmaReferenciaDuasVezesReverte() public {
        uint256 a1 = _criar(Achievements.Criterion.SingleSale, 1, PECA, false);
        uint256 a2 = _criar(Achievements.Criterion.SingleSale, 1, PECA, false);

        vm.startPrank(relayer);
        achievements.claim(a1, cliente, keccak256("mesma"));
        vm.expectRevert(Achievements.ClaimAlreadyProcessed.selector);
        achievements.claim(a2, cliente, keccak256("mesma"));
        vm.stopPrank();
    }

    function test_Claim_RespeitaTetoDeConquistadores() public {
        vm.prank(lojista);
        uint256 id = achievements.createAchievement(
            lojaId, Achievements.Criterion.SingleSale, 1, 0, 0, 1, PECA, false, 0, "", bytes32(0)
        );

        vm.startPrank(relayer);
        achievements.claim(id, cliente, keccak256("c1"));
        vm.expectRevert(Achievements.NoWinnersLeft.selector);
        achievements.claim(id, estranho, keccak256("c2"));
        vm.stopPrank();
    }

    function test_Claim_RespeitaAJanela() public {
        vm.warp(1000);
        vm.prank(lojista);
        uint256 id = achievements.createAchievement(
            lojaId, Achievements.Criterion.SingleSale, 1, 2000, 3000, 0, PECA, false, 0, "", bytes32(0)
        );

        vm.prank(relayer);
        vm.expectRevert(Achievements.AchievementNotStarted.selector);
        achievements.claim(id, cliente, keccak256("c1"));

        vm.warp(3001);
        vm.prank(relayer);
        vm.expectRevert(Achievements.AchievementEnded.selector);
        achievements.claim(id, cliente, keccak256("c2"));
    }

    function test_Claim_DesativadaNaoEntrega() public {
        uint256 id = _criar(Achievements.Criterion.SingleSale, 1, PECA, false);

        vm.prank(lojista);
        achievements.setAchievementActive(id, false);

        vm.prank(relayer);
        vm.expectRevert(Achievements.AchievementInactive.selector);
        achievements.claim(id, cliente, keccak256("c1"));
    }

    /// O selo de conquista e pessoal: ele prova que VOCE esteve la.
    function test_Selo_NaoSeTransfere() public {
        uint256 id = _criar(Achievements.Criterion.SingleSale, 1, 0, true);

        vm.prank(relayer);
        achievements.claim(id, cliente, keccak256("c1"));

        // Primeiro selo cunhado neste teste: o contador do BonusNFT comeca em 1.
        uint256 tokenId = 1;
        vm.prank(cliente);
        vm.expectRevert(BonusNFT.SoulboundTransferNotAllowed.selector);
        bonus.transferFrom(cliente, estranho, tokenId);
    }

    /// O selo guarda de qual loja veio -- sem isso a carteira nao consegue
    /// agrupar a colecao por estabelecimento.
    function test_Selo_GuardaALoja() public {
        uint256 id = _criar(Achievements.Criterion.SingleSale, 1, 0, true);

        vm.prank(relayer);
        achievements.claim(id, cliente, keccak256("c1"));

        uint256 tokenId = 1;
        assertEq(bonus.ownerOf(tokenId), cliente);
        assertEq(bonus.establishmentIdOf(tokenId), lojaId);
        assertEq(bonus.tokenURI(tokenId), "ipfs://selo");
    }
}

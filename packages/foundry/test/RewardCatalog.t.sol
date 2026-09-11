// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { DiscountNFT } from "../contracts/DiscountNFT.sol";
import { DiscountProgram } from "../contracts/DiscountProgram.sol";
import { EstablishmentRegistry } from "../contracts/EstablishmentRegistry.sol";
import { SubscriptionManager } from "../contracts/SubscriptionManager.sol";
import { PointsVault } from "../contracts/PointsVault.sol";
import { StampLedger } from "../contracts/StampLedger.sol";
import { RewardCatalog } from "../contracts/RewardCatalog.sol";
import { BonusNFT } from "../contracts/BonusNFT.sol";

contract RewardCatalogTest is Test {
    EstablishmentRegistry registry;
    SubscriptionManager subs;
    PointsVault vault;
    StampLedger ledger;
    RewardCatalog catalog;
    DiscountProgram programs;
    DiscountNFT discount;
    BonusNFT bonus;

    address admin = makeAddr("admin");
    address lojista = makeAddr("lojista");
    address atendente = makeAddr("atendente");
    address relayer = makeAddr("relayer");
    address cliente = makeAddr("cliente");
    address estranho = makeAddr("estranho");

    uint256 lojaId;
    uint256 constant PONTO_CIDADE = 1;

    function setUp() public {
        vm.startPrank(admin);

        registry = new EstablishmentRegistry(admin);
        subs = new SubscriptionManager(admin);
        vault = new PointsVault(admin, "https://chorinho.test/pontos/{id}.json");
        ledger = new StampLedger(registry, subs, vault, admin);
        programs = new DiscountProgram(registry);
        discount = new DiscountNFT(registry, programs);
        catalog = new RewardCatalog(registry, ledger, vault, discount);
        bonus = new BonusNFT(registry);

        registry.grantRole(registry.RELAYER_ROLE(), relayer);
        registry.grantRole(registry.RELAYER_ROLE(), address(catalog));

        vault.createPointType(PONTO_CIDADE, "Ponto da Cidade", PointsVault.Scope.City, 1);
        vault.grantRole(vault.MINTER_ROLE(), address(ledger));
        vault.grantRole(vault.BURNER_ROLE(), address(catalog));

        bonus.setStampLedger(ledger);

        lojaId = registry.registerEstablishment(lojista, keccak256("cafe"));
        subs.setSubscription(lojaId, 1, uint64(block.timestamp + 30 days), keccak256("ref"));

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
        vm.stopPrank();
    }

    function _carimbar(uint64 centavos, bytes32 ref) internal {
        vm.prank(atendente);
        ledger.issueStamps(
            StampLedger.Sale({
                establishmentId: lojaId, customer: cliente, amountCents: centavos, productBoostBps: 0, saleRef: ref
            })
        );
    }

    function _recompensaSimples(uint256 custoSelos) internal returns (uint256) {
        vm.prank(lojista);
        return catalog.createReward(lojaId, custoSelos, PONTO_CIDADE, 0, 0, 0, 0, 0, keccak256("pao-de-queijo"));
    }

    // ------------------------------------------------------ caminho feliz

    function test_Resgate_QueimaSelosERegistra() public {
        _carimbar(5000, "v1"); // 5 carimbos
        uint256 premio = _recompensaSimples(5);

        assertTrue(catalog.canClaim(premio, cliente), "com 5 carimbos deveria dar");

        vm.prank(atendente);
        catalog.claim(premio, cliente, "resgate-1");

        assertEq(ledger.stampsOf(lojaId, cliente), 0, "os 5 carimbos foram queimados");
        assertFalse(catalog.canClaim(premio, cliente), "sem saldo nao da mais");
    }

    function test_Resgate_QueimaSelosEPontosNaMesmaTransacao() public {
        _carimbar(5000, "v1"); // 5 carimbos, 25 pontos

        vm.prank(lojista);
        uint256 premio = catalog.createReward(lojaId, 3, PONTO_CIDADE, 10, 0, 0, 0, 0, keccak256("combo"));

        vm.prank(atendente);
        catalog.claim(premio, cliente, "resgate-1");

        assertEq(ledger.stampsOf(lojaId, cliente), 2, "5 - 3");
        assertEq(vault.balanceOf(cliente, PONTO_CIDADE), 15, "25 - 10");
    }

    // --------------------------------------------------- idempotencia

    function test_Resgate_MesmaReferenciaDuasVezesReverte() public {
        _carimbar(10_000, "v1"); // 10 carimbos
        uint256 premio = _recompensaSimples(2);

        vm.prank(atendente);
        catalog.claim(premio, cliente, "mesmo-resgate");

        vm.prank(atendente);
        vm.expectRevert(RewardCatalog.ClaimAlreadyProcessed.selector);
        catalog.claim(premio, cliente, "mesmo-resgate");

        assertEq(ledger.stampsOf(lojaId, cliente), 8, "so uma cobranca");
    }

    // -------------------------------------------------------- limites

    function test_Resgate_RespeitaEstoque() public {
        _carimbar(10_000, "v1");

        vm.prank(lojista);
        uint256 premio = catalog.createReward(lojaId, 1, PONTO_CIDADE, 0, 0, 0, 2, 0, keccak256("limitado"));

        vm.prank(atendente);
        catalog.claim(premio, cliente, "r1");
        vm.prank(atendente);
        catalog.claim(premio, cliente, "r2");

        assertEq(catalog.remainingRedemptions(premio), 0);

        vm.prank(atendente);
        vm.expectRevert(RewardCatalog.RewardSoldOut.selector);
        catalog.claim(premio, cliente, "r3");
    }

    function test_Resgate_RespeitaJanelaDeTempo() public {
        _carimbar(10_000, "v1");

        uint64 comeca = uint64(block.timestamp + 1 days);
        vm.prank(lojista);
        uint256 premio =
            catalog.createReward(lojaId, 1, PONTO_CIDADE, 0, comeca, comeca + 1 days, 0, 0, keccak256("flash"));

        vm.prank(atendente);
        vm.expectRevert(RewardCatalog.RewardNotStarted.selector);
        catalog.claim(premio, cliente, "cedo");

        vm.warp(comeca + 1);
        vm.prank(atendente);
        catalog.claim(premio, cliente, "no-horario");

        vm.warp(comeca + 2 days);
        vm.prank(atendente);
        vm.expectRevert(RewardCatalog.RewardEnded.selector);
        catalog.claim(premio, cliente, "tarde");
    }

    function test_Recompensa_NaoPodeSerDeGraca() public {
        vm.prank(lojista);
        vm.expectRevert(RewardCatalog.FreeRewardNotAllowed.selector);
        catalog.createReward(lojaId, 0, PONTO_CIDADE, 0, 0, 0, 0, 0, keccak256("gratis"));
    }

    function test_Resgate_SemSaldoReverte() public {
        _carimbar(1000, "v1"); // 1 carimbo
        uint256 premio = _recompensaSimples(5);

        assertFalse(catalog.canClaim(premio, cliente));

        vm.prank(atendente);
        vm.expectRevert(abi.encodeWithSelector(StampLedger.InsufficientStamps.selector, uint256(1), uint256(5)));
        catalog.claim(premio, cliente, "r1");
    }

    // ------------------------------------------------------ permissao

    function test_Resgate_EstranhoNaoEntrega() public {
        _carimbar(5000, "v1");
        uint256 premio = _recompensaSimples(1);

        vm.prank(estranho);
        vm.expectRevert(RewardCatalog.NotOperator.selector);
        catalog.claim(premio, cliente, "r1");
    }

    function test_Catalogo_EstranhoNaoCria() public {
        vm.prank(estranho);
        vm.expectRevert(RewardCatalog.NotEstablishmentOwner.selector);
        catalog.createReward(lojaId, 1, PONTO_CIDADE, 0, 0, 0, 0, 0, keccak256("x"));
    }

    // ------------------------------------------------- assinatura

    function test_Resgate_FuncionaComAssinaturaVencida() public {
        _carimbar(5000, "v1");
        uint256 premio = _recompensaSimples(5);

        vm.warp(block.timestamp + 31 days);

        // A loja para de emitir carimbo, mas o que o cliente ja juntou vale.
        vm.prank(atendente);
        catalog.claim(premio, cliente, "r1");
        assertEq(ledger.stampsOf(lojaId, cliente), 0);
    }

    // ------------------------------------------- evolucao da peca

    function test_Peca_SoSobeQuandoOsCarimbosAlcancam() public {
        vm.prank(lojista);
        bonus.setTierThresholds(lojaId, [uint256(0), 5, 20, 50, 100, 250]);

        // 3 carimbos: ainda nao alcanca o nivel 1, que exige 5.
        _carimbar(3000, "v1");

        vm.prank(relayer);
        vm.expectRevert(abi.encodeWithSelector(BonusNFT.TierNotEarned.selector, uint256(3), uint256(5)));
        bonus.mintOrUpgrade(lojaId, cliente, 1, "ipfs://nivel-1");

        _carimbar(3000, "v2"); // total 6

        vm.prank(relayer);
        uint256 tokenId = bonus.mintOrUpgrade(lojaId, cliente, 1, "ipfs://nivel-1");
        assertEq(bonus.ownerOf(tokenId), cliente);
        assertEq(bonus.tierDoCliente(lojaId, cliente), 1);
    }

    function test_Peca_RelayerNaoForjaNivel() public {
        vm.prank(lojista);
        bonus.setTierThresholds(lojaId, [uint256(0), 5, 20, 50, 100, 250]);

        _carimbar(10_000, "v1"); // 10 carimbos

        // O relayer dispara, mas quem decide e o contrato: 10 nao alcanca os
        // 20 do nivel 2, e nem o relayer consegue passar por cima.
        vm.prank(relayer);
        vm.expectRevert(abi.encodeWithSelector(BonusNFT.TierNotEarned.selector, uint256(10), uint256(20)));
        bonus.mintOrUpgrade(lojaId, cliente, 2, "ipfs://nivel-2");
    }

    function test_Peca_EvoluiEmVezDeCriarOutra() public {
        vm.prank(lojista);
        bonus.setTierThresholds(lojaId, [uint256(0), 5, 20, 50, 100, 250]);

        _carimbar(10_000, "v1"); // 10
        vm.prank(relayer);
        uint256 primeiro = bonus.mintOrUpgrade(lojaId, cliente, 1, "ipfs://nivel-1");

        vm.warp(block.timestamp + 1 days);
        _carimbar(10_000, "v2"); // 20 no total

        vm.prank(relayer);
        uint256 segundo = bonus.mintOrUpgrade(lojaId, cliente, 2, "ipfs://nivel-2");

        assertEq(segundo, primeiro, "e a mesma peca, que subiu de nivel");
        assertEq(bonus.balanceOf(cliente), 1, "nunca vira duas pecas da mesma loja");
        assertEq(bonus.tierDoCliente(lojaId, cliente), 2);
        assertEq(bonus.tokenURI(primeiro), "ipfs://nivel-2", "a arte acompanha o nivel");
    }

    function test_Peca_NaoDesce() public {
        vm.prank(lojista);
        bonus.setTierThresholds(lojaId, [uint256(0), 5, 20, 50, 100, 250]);

        _carimbar(10_000, "v1");
        vm.prank(relayer);
        bonus.mintOrUpgrade(lojaId, cliente, 1, "ipfs://nivel-1");

        vm.prank(relayer);
        vm.expectRevert(abi.encodeWithSelector(BonusNFT.NotAnUpgrade.selector, uint8(1), uint8(1)));
        bonus.mintOrUpgrade(lojaId, cliente, 1, "ipfs://nivel-1");
    }

    function test_Peca_ETambemIntransferivel() public {
        vm.prank(lojista);
        bonus.setTierThresholds(lojaId, [uint256(0), 5, 20, 50, 100, 250]);

        _carimbar(10_000, "v1");
        vm.prank(relayer);
        uint256 tokenId = bonus.mintOrUpgrade(lojaId, cliente, 1, "ipfs://nivel-1");

        vm.prank(cliente);
        vm.expectRevert(BonusNFT.SoulboundTransferNotAllowed.selector);
        bonus.transferFrom(cliente, estranho, tokenId);
    }

    // ------------------------------------------------- peca da colecao

    /// O caminho DIRETO: o cliente gasta os proprios carimbos e leva a peca
    /// colecionavel junto com o produto do balcao.
    function test_Peca_EntregueAoResgatar() public {
        vm.prank(lojista);
        uint256 programa = programs.createProgram(
            lojaId, "Clube", DiscountProgram.DiscountKind.Percentual, 1000, 0, bytes32(0), 0, 0, false, bytes32(0)
        );

        DiscountNFT.PieceParams memory params;
        params.programId = programa;
        params.level = 1;
        params.uri = "ipfs://peca";
        vm.prank(lojista);
        discount.createPiece(1, params);

        vm.prank(lojista);
        uint256 premio = catalog.createReward(lojaId, 3, PONTO_CIDADE, 0, 0, 0, 0, 1, keccak256("com-peca"));

        _carimbar(5000, "v1"); // 5 carimbos

        vm.prank(atendente);
        catalog.claim(premio, cliente, keccak256("entrega"));

        assertEq(ledger.stampsOf(lojaId, cliente), 2, "carimbos cobrados");
        assertEq(discount.balanceOf(cliente, 1), 1, "peca entregue");
    }

    /**
     * Se a cunhagem falha, a transacao inteira volta atras. O cliente nao pode
     * ficar sem os carimbos E sem a peca.
     */
    function test_Peca_TiragemEsgotadaDesfazOResgate() public {
        vm.prank(lojista);
        uint256 programa = programs.createProgram(
            lojaId, "Clube", DiscountProgram.DiscountKind.Percentual, 1000, 0, bytes32(0), 0, 0, false, bytes32(0)
        );

        DiscountNFT.PieceParams memory params;
        params.programId = programa;
        params.level = 1;
        params.maxSupply = 1;
        params.uri = "ipfs://rara";
        vm.prank(lojista);
        discount.createPiece(1, params);

        vm.prank(lojista);
        uint256 premio = catalog.createReward(lojaId, 1, PONTO_CIDADE, 0, 0, 0, 0, 1, keccak256("rara"));

        _carimbar(5000, "v1");

        vm.prank(atendente);
        catalog.claim(premio, cliente, keccak256("primeira"));
        assertEq(discount.balanceOf(cliente, 1), 1);

        uint256 antes = ledger.stampsOf(lojaId, cliente);
        vm.prank(atendente);
        vm.expectRevert(abi.encodeWithSelector(DiscountNFT.MaxSupplyExceeded.selector, 1, 1, 0));
        catalog.claim(premio, cliente, keccak256("segunda"));

        assertEq(ledger.stampsOf(lojaId, cliente), antes, "nenhum carimbo cobrado");
    }
}

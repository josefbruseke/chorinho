// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { EstablishmentRegistry } from "../contracts/EstablishmentRegistry.sol";
import { SubscriptionManager } from "../contracts/SubscriptionManager.sol";
import { PointsVault } from "../contracts/PointsVault.sol";
import { StampLedger } from "../contracts/StampLedger.sol";

contract StampLedgerTest is Test {
    EstablishmentRegistry registry;
    SubscriptionManager subs;
    PointsVault vault;
    StampLedger ledger;

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

        registry.grantRole(registry.RELAYER_ROLE(), relayer);
        vault.createPointType(PONTO_CIDADE, "Ponto da Cidade", PointsVault.Scope.City, 1);
        vault.grantRole(vault.MINTER_ROLE(), address(ledger));
        vault.grantRole(vault.BURNER_ROLE(), address(ledger));

        lojaId = registry.registerEstablishment(lojista, keccak256("cafe-do-bairro"));
        subs.setSubscription(lojaId, 1, uint64(block.timestamp + 30 days), keccak256("ref"));

        vm.stopPrank();

        vm.prank(lojista);
        registry.addOperator(lojaId, atendente);

        vm.prank(lojista);
        ledger.setAccrualRule(lojaId, _regraPadrao());
    }

    /// Regra tipica: R$10 = 1 carimbo, venda minima de R$5, teto de 10 por venda.
    function _regraPadrao() internal pure returns (StampLedger.AccrualRule memory) {
        return StampLedger.AccrualRule({
            minTicketCents: 500,
            centsPerStamp: 1000,
            maxStampsPerTx: 10,
            cooldownSeconds: 0,
            streakWindowSeconds: 7 days,
            pointsPerStamp: 5,
            pointTypeId: PONTO_CIDADE,
            active: true
        });
    }

    function _venda(uint64 centavos, bytes32 ref) internal view returns (StampLedger.Sale memory) {
        return StampLedger.Sale({
            establishmentId: lojaId, customer: cliente, amountCents: centavos, productBoostBps: 0, saleRef: ref
        });
    }

    // ------------------------------------------------------ caminho feliz

    function test_Carimbo_CreditaSelosEPontos() public {
        vm.prank(atendente);
        (uint256 selos, uint256 pontos) = ledger.issueStamps(_venda(3500, "v1"));

        assertEq(selos, 3, "R$35 com R$10 por carimbo da 3");
        assertEq(pontos, 15, "5 pontos por carimbo");
        assertEq(ledger.stampsOf(lojaId, cliente), 3);
        assertEq(vault.balanceOf(cliente, PONTO_CIDADE), 15);
    }

    function test_Carimbo_RelayerTambemPodeEmitir() public {
        vm.prank(relayer);
        ledger.issueStamps(_venda(1000, "v1"));
        assertEq(ledger.stampsOf(lojaId, cliente), 1);
    }

    function test_Carimbo_DonoOperaSemSerOperador() public {
        vm.prank(lojista);
        ledger.issueStamps(_venda(1000, "v1"));
        assertEq(ledger.stampsOf(lojaId, cliente), 1);
    }

    // ------------------------------------------------ o piso de ticket

    function test_Carimbo_RejeitaVendaAbaixoDoPiso() public {
        vm.prank(atendente);
        vm.expectRevert(abi.encodeWithSelector(StampLedger.TicketBelowFloor.selector, uint64(499), uint64(500)));
        ledger.issueStamps(_venda(499, "v1"));
    }

    function test_Carimbo_AceitaExatamenteNoPiso() public {
        // R$5 no piso, mas R$10 por carimbo: renderia zero carimbos.
        vm.prank(lojista);
        StampLedger.AccrualRule memory r = _regraPadrao();
        r.centsPerStamp = 500;
        ledger.setAccrualRule(lojaId, r);

        vm.prank(atendente);
        (uint256 selos,) = ledger.issueStamps(_venda(500, "v1"));
        assertEq(selos, 1);
    }

    // --------------------------------------------------- idempotencia

    function test_Carimbo_MesmaVendaDuasVezesReverte() public {
        vm.prank(atendente);
        ledger.issueStamps(_venda(1000, "mesma-venda"));

        vm.prank(atendente);
        vm.expectRevert(StampLedger.SaleAlreadyProcessed.selector);
        ledger.issueStamps(_venda(1000, "mesma-venda"));

        assertEq(ledger.stampsOf(lojaId, cliente), 1, "nao pode ter creditado duas vezes");
    }

    function test_Lote_PulaVendaJaProcessadaEmVezDeDerrubarOLote() public {
        vm.prank(atendente);
        ledger.issueStamps(_venda(1000, "ja-foi"));

        StampLedger.Sale[] memory vendas = new StampLedger.Sale[](3);
        vendas[0] = _venda(1000, "ja-foi"); // repetida: o PDV reenviou
        vendas[1] = _venda(2000, "nova-1");
        vendas[2] = _venda(3000, "nova-2");

        vm.prank(relayer);
        (uint256 selos,) = ledger.issueStampsBatch(vendas);

        assertEq(selos, 5, "2 + 3 das novas; a repetida foi pulada");
        assertEq(ledger.stampsOf(lojaId, cliente), 6, "1 do primeiro carimbo + 5 do lote");
    }

    // ------------------------------------------------------- os tetos

    function test_Carimbo_RespeitaTetoPorVenda() public {
        vm.prank(atendente);
        (uint256 selos,) = ledger.issueStamps(_venda(1_000_000, "v1"));
        assertEq(selos, 10, "teto de 10 por venda");
    }

    function test_Carimbo_RejeitaBonusAcimaDoTeto() public {
        StampLedger.Sale memory s = _venda(1000, "v1");
        s.productBoostBps = 30_001;

        vm.prank(atendente);
        vm.expectRevert(abi.encodeWithSelector(StampLedger.BoostTooHigh.selector, uint16(30_001)));
        ledger.issueStamps(s);
    }

    function test_Carimbo_BonusDobraOsSelosGanhosNaoOValor() public {
        StampLedger.Sale memory s = _venda(1500, "v1");
        s.productBoostBps = 20_000; // 2x

        vm.prank(atendente);
        (uint256 selos,) = ledger.issueStamps(s);

        // R$15 rende 1 carimbo inteiro; o bonus dobra para 2, e nao 3.
        assertEq(selos, 2, "o bonus multiplica o carimbo ganho, nao o valor da venda");
    }

    // ------------------------------------------------------- cooldown

    function test_Carimbo_RespeitaIntervaloMinimo() public {
        vm.prank(lojista);
        StampLedger.AccrualRule memory r = _regraPadrao();
        r.cooldownSeconds = 300;
        ledger.setAccrualRule(lojaId, r);

        vm.prank(atendente);
        ledger.issueStamps(_venda(1000, "v1"));

        vm.warp(block.timestamp + 100);
        vm.prank(atendente);
        vm.expectRevert(abi.encodeWithSelector(StampLedger.CooldownActive.selector, uint64(200)));
        ledger.issueStamps(_venda(1000, "v2"));

        vm.warp(block.timestamp + 201);
        vm.prank(atendente);
        ledger.issueStamps(_venda(1000, "v3"));
        assertEq(ledger.stampsOf(lojaId, cliente), 2);
    }

    // ------------------------------------------------------- sequencia

    function test_Streak_CresceDentroDaJanelaEReseteiaFora() public {
        vm.prank(atendente);
        ledger.issueStamps(_venda(1000, "v1"));
        (,,,, uint32 melhor,,) = _carteira();
        assertEq(melhor, 1);

        vm.warp(block.timestamp + 2 days);
        vm.prank(atendente);
        ledger.issueStamps(_venda(1000, "v2"));
        (,,, uint32 atual,,,) = _carteira();
        assertEq(atual, 2, "dentro da janela de 7 dias");

        vm.warp(block.timestamp + 8 days);
        vm.prank(atendente);
        ledger.issueStamps(_venda(1000, "v3"));
        (,,, uint32 depois, uint32 recorde,,) = _carteira();
        assertEq(depois, 1, "fora da janela reseteia");
        assertEq(recorde, 2, "o recorde nao se perde");
    }

    function _carteira() internal view returns (uint256, uint256, uint256, uint32, uint32, uint32, uint64) {
        return ledger.walletOf(lojaId, cliente);
    }

    // ----------------------------------------------------- assinatura

    function test_Carimbo_BloqueadoComAssinaturaVencida() public {
        vm.warp(block.timestamp + 31 days);

        vm.prank(atendente);
        vm.expectRevert(StampLedger.SubscriptionInactive.selector);
        ledger.issueStamps(_venda(1000, "v1"));
    }

    function test_Resgate_FuncionaMesmoComAssinaturaVencida() public {
        vm.prank(atendente);
        ledger.issueStamps(_venda(5000, "v1"));
        assertEq(ledger.stampsOf(lojaId, cliente), 5);

        vm.warp(block.timestamp + 31 days);

        // O cliente nao pode ser punido pelo problema de cobranca da loja.
        vm.prank(atendente);
        ledger.burnStamps(lojaId, cliente, 5, "resgate-1");
        assertEq(ledger.stampsOf(lojaId, cliente), 0);
    }

    // ------------------------------------------------------ permissao

    function test_Carimbo_EstranhoNaoEmite() public {
        vm.prank(estranho);
        vm.expectRevert(StampLedger.NotOperator.selector);
        ledger.issueStamps(_venda(1000, "v1"));
    }

    function test_Carimbo_OperadorDeOutraLojaNaoEmite() public {
        vm.prank(admin);
        uint256 outraLoja = registry.registerEstablishment(makeAddr("outroLojista"), keccak256("outra"));

        address atendenteDaOutra = makeAddr("atendenteDaOutra");
        vm.prank(makeAddr("outroLojista"));
        registry.addOperator(outraLoja, atendenteDaOutra);

        vm.prank(atendenteDaOutra);
        vm.expectRevert(StampLedger.NotOperator.selector);
        ledger.issueStamps(_venda(1000, "v1"));
    }

    function test_Regra_SoDonoOuAdminConfigura() public {
        vm.prank(estranho);
        vm.expectRevert(StampLedger.NotOperator.selector);
        ledger.setAccrualRule(lojaId, _regraPadrao());
    }

    // -------------------------------------------------------- resgate

    function test_Resgate_NaoDeixaFicarNegativo() public {
        vm.prank(atendente);
        ledger.issueStamps(_venda(1000, "v1"));

        vm.prank(atendente);
        vm.expectRevert(abi.encodeWithSelector(StampLedger.InsufficientStamps.selector, uint256(1), uint256(5)));
        ledger.burnStamps(lojaId, cliente, 5, "resgate-1");
    }

    // -------------------------------------------------------- preview

    function test_Preview_BateComOQueEmiteDeVerdade() public {
        uint256 previsto = ledger.previewStamps(lojaId, 3500, 0);

        vm.prank(atendente);
        (uint256 emitido,) = ledger.issueStamps(_venda(3500, "v1"));

        assertEq(previsto, emitido, "o que o caixa ve tem que ser o que acontece");
    }

    function test_Preview_ZeraAbaixoDoPiso() public view {
        assertEq(ledger.previewStamps(lojaId, 499, 0), 0);
    }

    // ----------------------------------------------------------- fuzz

    /// @dev O invariante que mais importa: nunca passar do teto, nunca emitir
    ///      abaixo do piso, e nunca estourar.
    function testFuzz_Carimbo_NuncaViolaPisoNemTeto(uint64 centavos, uint16 bonus) public {
        centavos = uint64(bound(centavos, 0, 1e12));
        bonus = uint16(bound(bonus, 0, 30_000));

        uint256 previsto = ledger.previewStamps(lojaId, centavos, bonus);
        assertLe(previsto, 10, "nunca passa do teto por venda");

        if (centavos < 500) {
            assertEq(previsto, 0, "abaixo do piso nunca rende carimbo");
        }

        if (previsto > 0) {
            StampLedger.Sale memory s = _venda(centavos, "fuzz");
            s.productBoostBps = bonus;
            vm.prank(atendente);
            (uint256 emitido,) = ledger.issueStamps(s);
            assertEq(emitido, previsto, "preview e emissao nao podem divergir");
        }
    }

    // ------------------------------------------------------ soulbound

    function test_Pontos_NaoPodemSerTransferidos() public {
        vm.prank(atendente);
        ledger.issueStamps(_venda(1000, "v1"));

        vm.prank(cliente);
        vm.expectRevert(PointsVault.SoulboundTransferNotAllowed.selector);
        vault.safeTransferFrom(cliente, estranho, PONTO_CIDADE, 1, "");
    }

    function test_Pontos_NaoAceitamAprovacao() public {
        vm.prank(cliente);
        vm.expectRevert(PointsVault.SoulboundApprovalNotAllowed.selector);
        vault.setApprovalForAll(estranho, true);
    }
}

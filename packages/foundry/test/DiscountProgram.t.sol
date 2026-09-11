// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { DiscountProgram } from "../contracts/DiscountProgram.sol";
import { EstablishmentRegistry } from "../contracts/EstablishmentRegistry.sol";

contract DiscountProgramTest is Test {
    EstablishmentRegistry registry;
    DiscountProgram programs;

    address admin = makeAddr("admin");
    address donoCafe = makeAddr("donoCafe");
    address donoPadaria = makeAddr("donoPadaria");
    address estranho = makeAddr("estranho");

    uint256 cafe;
    uint256 padaria;

    function setUp() public {
        registry = new EstablishmentRegistry(admin);
        programs = new DiscountProgram(registry);

        vm.startPrank(admin);
        cafe = registry.registerEstablishment(donoCafe, keccak256("cafe"));
        padaria = registry.registerEstablishment(donoPadaria, keccak256("padaria"));
        vm.stopPrank();
    }

    function _criar(bool conjunto) internal returns (uint256) {
        vm.prank(donoCafe);
        return programs.createProgram(
            cafe,
            "Clube da Manha",
            DiscountProgram.DiscountKind.Percentual,
            1500, // 15%
            5000, // teto de R$ 50
            bytes32(0),
            0,
            0,
            conjunto,
            keccak256("meta")
        );
    }

    // ------------------------------------------------------------- criacao

    function test_Criar_GuardaOPrograma() public {
        uint256 id = _criar(false);
        DiscountProgram.Program memory p = programs.getProgram(id);

        assertEq(p.ownerEstablishmentId, cafe);
        // 14 caracteres, cabem nos 32 bytes; o lint nao sabe ler o literal.
        // forge-lint: disable-next-line(unsafe-typecast)
        assertEq(p.name, bytes32("Clube da Manha"));
        assertEq(p.baseBenefit, 1500);
        assertEq(p.capCents, 5000);
        assertTrue(p.active);
        assertTrue(p.exists);
    }

    /// A loja que cria ja esta dentro: sem isso, todo programa nasceria sem
    /// valer em lugar nenhum.
    function test_Criar_ADonaJaEntraNaPool() public {
        uint256 id = _criar(false);
        assertTrue(programs.validAt(id, cafe));
        assertEq(uint8(programs.membershipOf(id, cafe)), uint8(DiscountProgram.Membership.Aceita));
    }

    function test_Criar_SoDonoOuAdmin() public {
        vm.prank(estranho);
        vm.expectRevert(DiscountProgram.NotEstablishmentOwner.selector);
        programs.createProgram(
            cafe, "Pirata", DiscountProgram.DiscountKind.Percentual, 1000, 0, bytes32(0), 0, 0, false, bytes32(0)
        );
    }

    function test_Criar_RecusaBeneficioZero() public {
        vm.prank(donoCafe);
        vm.expectRevert(DiscountProgram.InvalidBenefit.selector);
        programs.createProgram(
            cafe, "Nada", DiscountProgram.DiscountKind.Percentual, 0, 0, bytes32(0), 0, 0, false, bytes32(0)
        );
    }

    /// Percentual acima de cem por cento descontaria mais do que a conta.
    function test_Criar_RecusaPercentualAcimaDeCem() public {
        vm.prank(donoCafe);
        vm.expectRevert(DiscountProgram.InvalidBenefit.selector);
        programs.createProgram(
            cafe, "Absurdo", DiscountProgram.DiscountKind.Percentual, 10_001, 0, bytes32(0), 0, 0, false, bytes32(0)
        );
    }

    function test_Criar_RecusaJanelaInvertida() public {
        vm.prank(donoCafe);
        vm.expectRevert(DiscountProgram.InvalidWindow.selector);
        programs.createProgram(
            cafe, "Torto", DiscountProgram.DiscountKind.Percentual, 1000, 0, bytes32(0), 200, 100, false, bytes32(0)
        );
    }

    // ---------------------------------------------------------------- pool

    function test_Pool_ConviteEAceite() public {
        uint256 id = _criar(true);

        vm.prank(donoCafe);
        programs.invite(id, padaria);
        assertEq(uint8(programs.membershipOf(id, padaria)), uint8(DiscountProgram.Membership.Convidada));
        assertFalse(programs.validAt(id, padaria), "convite sozinho nao vale");

        vm.prank(donoPadaria);
        programs.acceptInvite(id, padaria);
        assertTrue(programs.validAt(id, padaria));
        assertEq(programs.membersOf(id).length, 2);
    }

    /// O coracao da pool: sem aceite, a peca nao vale na vizinha. Uma loja nao
    /// pode obrigar a outra a dar desconto.
    function test_Pool_SemAceiteNaoVale() public {
        uint256 id = _criar(true);

        vm.prank(donoCafe);
        programs.invite(id, padaria);

        assertFalse(programs.validAt(id, padaria));
    }

    function test_Pool_SoAConvidadaAceita() public {
        uint256 id = _criar(true);

        vm.prank(donoCafe);
        programs.invite(id, padaria);

        // O dono do programa nao pode aceitar pela vizinha.
        vm.prank(donoCafe);
        vm.expectRevert(DiscountProgram.NotEstablishmentOwner.selector);
        programs.acceptInvite(id, padaria);
    }

    function test_Pool_NaoAceitaSemConvite() public {
        uint256 id = _criar(true);

        vm.prank(donoPadaria);
        vm.expectRevert(DiscountProgram.NotInvited.selector);
        programs.acceptInvite(id, padaria);
    }

    function test_Pool_ProgramaDeUmaLojaNaoConvida() public {
        uint256 id = _criar(false);

        vm.prank(donoCafe);
        vm.expectRevert(DiscountProgram.ProgramIsNotJoint.selector);
        programs.invite(id, padaria);
    }

    function test_Pool_ConvidarDuasVezesReverte() public {
        uint256 id = _criar(true);

        vm.startPrank(donoCafe);
        programs.invite(id, padaria);
        vm.expectRevert(DiscountProgram.AlreadyAMember.selector);
        programs.invite(id, padaria);
        vm.stopPrank();
    }

    function test_Pool_SairParaDeValer() public {
        uint256 id = _criar(true);

        vm.prank(donoCafe);
        programs.invite(id, padaria);
        vm.prank(donoPadaria);
        programs.acceptInvite(id, padaria);
        assertTrue(programs.validAt(id, padaria));

        vm.prank(donoPadaria);
        programs.leaveProgram(id, padaria);
        assertFalse(programs.validAt(id, padaria));
        // Continua na lista, com o estado dizendo a verdade.
        assertEq(programs.membersOf(id).length, 2);
        assertEq(uint8(programs.membershipOf(id, padaria)), uint8(DiscountProgram.Membership.Saiu));
    }

    function test_Pool_SairSemTerEntradoReverte() public {
        uint256 id = _criar(true);

        vm.prank(donoPadaria);
        vm.expectRevert(DiscountProgram.NotAMember.selector);
        programs.leaveProgram(id, padaria);
    }

    // -------------------------------------------------------------- vigor

    function test_Vigor_DesativadoNaoVale() public {
        uint256 id = _criar(false);

        vm.prank(donoCafe);
        programs.setProgramActive(id, false);
        assertFalse(programs.validAt(id, cafe));
    }

    function test_Vigor_ForaDaJanelaNaoVale() public {
        vm.warp(1000);
        vm.prank(donoCafe);
        uint256 id = programs.createProgram(
            cafe, "Curto", DiscountProgram.DiscountKind.Percentual, 1000, 0, bytes32(0), 2000, 3000, false, bytes32(0)
        );

        assertFalse(programs.validAt(id, cafe), "antes de comecar");
        vm.warp(2000);
        assertTrue(programs.validAt(id, cafe), "no primeiro instante");
        vm.warp(3000);
        assertTrue(programs.validAt(id, cafe), "no ultimo instante");
        vm.warp(3001);
        assertFalse(programs.validAt(id, cafe), "depois de acabar");
    }

    // ------------------------------------------------------------ desconto

    function test_Desconto_PercentualPorNivel() public {
        uint256 id = _criar(false); // 15%, teto de R$ 50

        // Conta de R$ 100: nivel 1 desconta R$ 15, nivel 2 desconta R$ 30.
        assertEq(programs.discountFor(id, 1, 10_000), 1500);
        assertEq(programs.discountFor(id, 2, 10_000), 3000);
    }

    /// O teto existe justamente para isto: 15% de uma conta de mil reais seria
    /// um prejuizo que o lojista nao viu chegando.
    function test_Desconto_RespeitaOTeto() public {
        uint256 id = _criar(false); // teto de R$ 50
        assertEq(programs.discountFor(id, 1, 100_000), 5000);
    }

    function test_Desconto_NuncaPassaDaConta() public {
        vm.prank(donoCafe);
        uint256 id = programs.createProgram(
            cafe,
            "Generoso",
            DiscountProgram.DiscountKind.ValorFixo,
            5000, // R$ 50 fixos
            0,
            bytes32(0),
            0,
            0,
            false,
            bytes32(0)
        );

        // Conta de R$ 10 com peca que desconta R$ 50: desconta R$ 10.
        assertEq(programs.discountFor(id, 1, 1000), 1000);
    }

    function test_Desconto_ValorFixoPorNivel() public {
        vm.prank(donoCafe);
        uint256 id = programs.createProgram(
            cafe, "Fixo", DiscountProgram.DiscountKind.ValorFixo, 500, 0, bytes32(0), 0, 0, false, bytes32(0)
        );

        assertEq(programs.discountFor(id, 1, 10_000), 500);
        assertEq(programs.discountFor(id, 3, 10_000), 1500);
    }

    function test_Desconto_NivelZeroNaoDescontaNada() public {
        uint256 id = _criar(false);
        assertEq(programs.discountFor(id, 0, 10_000), 0);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { DiscountNFT } from "../contracts/DiscountNFT.sol";
import { DiscountProgram } from "../contracts/DiscountProgram.sol";
import { EstablishmentRegistry } from "../contracts/EstablishmentRegistry.sol";
import { IERC1155Errors } from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

contract DiscountNFTTest is Test {
    EstablishmentRegistry registry;
    DiscountProgram programs;
    DiscountNFT discount;

    address admin = makeAddr("admin");
    address donoCafe = makeAddr("donoCafe");
    address donoPadaria = makeAddr("donoPadaria");
    address atendente = makeAddr("atendente");
    address relayer = makeAddr("relayer");
    address cliente = makeAddr("cliente");
    address outro = makeAddr("outro");

    uint256 cafe;
    uint256 padaria;
    uint256 programa;

    uint256 constant PECA = 1;

    event PieceMinted(uint256 indexed tokenId, address indexed to, uint256 amount, address indexed minter);
    event PieceUsed(
        uint256 indexed tokenId,
        address indexed user,
        uint256 indexed establishmentId,
        uint256 amount,
        bytes32 redemptionRef
    );

    function setUp() public {
        registry = new EstablishmentRegistry(admin);
        programs = new DiscountProgram(registry);
        discount = new DiscountNFT(registry, programs);

        vm.startPrank(admin);
        cafe = registry.registerEstablishment(donoCafe, keccak256("cafe"));
        padaria = registry.registerEstablishment(donoPadaria, keccak256("padaria"));
        registry.grantRole(registry.RELAYER_ROLE(), relayer);
        vm.stopPrank();

        vm.prank(donoCafe);
        registry.addOperator(cafe, atendente);

        vm.prank(donoCafe);
        programa = programs.createProgram(
            cafe, "Clube da Manha", DiscountProgram.DiscountKind.Percentual, 1500, 0, bytes32(0), 0, 0, true, bytes32(0)
        );
    }

    // ------------------------------------------------------------- helpers

    function _params(uint256 maxSupply, uint64 startTime, uint64 endTime, uint256 maxPerWallet)
        internal
        view
        returns (DiscountNFT.PieceParams memory p)
    {
        p.programId = programa;
        p.level = 1;
        p.maxSupply = maxSupply;
        p.startTime = startTime;
        p.endTime = endTime;
        p.maxPerWallet = maxPerWallet;
        p.uri = "ipfs://peca";
    }

    function _criarPeca() internal {
        vm.prank(donoCafe);
        discount.createPiece(PECA, _params(0, 0, 0, 0));
    }

    // ------------------------------------------------------------- catalogo

    function test_Criar_GuardaAPeca() public {
        vm.prank(donoCafe);
        discount.createPiece(PECA, _params(50, 100, 200, 2));

        DiscountNFT.Piece memory p = discount.getPiece(PECA);
        assertEq(p.programId, programa);
        assertEq(p.level, 1);
        assertEq(p.maxSupply, 50);
        assertEq(p.startTime, 100);
        assertEq(p.endTime, 200);
        assertEq(p.maxPerWallet, 2);
        assertTrue(p.active);
        assertEq(discount.uri(PECA), "ipfs://peca");
    }

    /// A colecao e da loja, nao da plataforma: quem cria e o dono do programa.
    function test_Criar_SoDonoDoProgramaOuAdmin() public {
        vm.prank(donoPadaria);
        vm.expectRevert(DiscountNFT.NotEstablishmentOwner.selector);
        discount.createPiece(PECA, _params(0, 0, 0, 0));

        vm.prank(admin);
        discount.createPiece(PECA, _params(0, 0, 0, 0));
        assertTrue(discount.pieceExists(PECA));
    }

    function test_Criar_RecusaDuplicata() public {
        _criarPeca();
        vm.prank(donoCafe);
        vm.expectRevert(abi.encodeWithSelector(DiscountNFT.PieceAlreadyExists.selector, PECA));
        discount.createPiece(PECA, _params(0, 0, 0, 0));
    }

    function test_Criar_RecusaProgramaInexistente() public {
        DiscountNFT.PieceParams memory p = _params(0, 0, 0, 0);
        p.programId = 999;

        vm.prank(donoCafe);
        vm.expectRevert(DiscountNFT.UnknownProgram.selector);
        discount.createPiece(PECA, p);
    }

    function test_Criar_RecusaNivelZero() public {
        DiscountNFT.PieceParams memory p = _params(0, 0, 0, 0);
        p.level = 0;

        vm.prank(donoCafe);
        vm.expectRevert(DiscountNFT.InvalidLevel.selector);
        discount.createPiece(PECA, p);
    }

    function test_Criar_RecusaJanelaInvertida() public {
        vm.prank(donoCafe);
        vm.expectRevert(DiscountNFT.InvalidWindow.selector);
        discount.createPiece(PECA, _params(0, 200, 100, 0));
    }

    function test_Desativar_TravaACunhagem() public {
        _criarPeca();

        vm.prank(donoCafe);
        discount.setPieceActive(PECA, false);

        vm.prank(relayer);
        vm.expectRevert(abi.encodeWithSelector(DiscountNFT.PieceNotActive.selector, PECA));
        discount.mintTo(cliente, PECA, 1);
    }

    // -------------------------------------------------------------- emitir

    function test_Emitir_CaminhoFeliz() public {
        _criarPeca();

        vm.expectEmit(true, true, true, true);
        emit PieceMinted(PECA, cliente, 2, relayer);

        vm.prank(relayer);
        discount.mintTo(cliente, PECA, 2);

        assertEq(discount.balanceOf(cliente, PECA), 2);
        assertEq(discount.totalSupply(PECA), 2);
        assertEq(discount.mintedBy(PECA, cliente), 2);
    }

    /// Nao existe compra com dinheiro: quem cunha e quem sabe por que a peca
    /// foi merecida.
    function test_Emitir_SoQuemTemPapelDeCunhador() public {
        _criarPeca();

        vm.prank(cliente);
        vm.expectRevert(DiscountNFT.NotAllowedToMint.selector);
        discount.mintTo(cliente, PECA, 1);

        vm.prank(donoCafe);
        vm.expectRevert(DiscountNFT.NotAllowedToMint.selector);
        discount.mintTo(cliente, PECA, 1);
    }

    function test_Emitir_RecusaQuantidadeZero() public {
        _criarPeca();
        vm.prank(relayer);
        vm.expectRevert(DiscountNFT.ZeroAmount.selector);
        discount.mintTo(cliente, PECA, 0);
    }

    function test_Emitir_RecusaPecaInexistente() public {
        vm.prank(relayer);
        vm.expectRevert(abi.encodeWithSelector(DiscountNFT.UnknownPiece.selector, PECA));
        discount.mintTo(cliente, PECA, 1);
    }

    function test_Emitir_TiragemNoLimiteExato() public {
        vm.prank(donoCafe);
        discount.createPiece(PECA, _params(3, 0, 0, 0));

        vm.prank(relayer);
        discount.mintTo(cliente, PECA, 3);
        assertEq(discount.totalSupply(PECA), 3);

        vm.prank(relayer);
        vm.expectRevert(abi.encodeWithSelector(DiscountNFT.MaxSupplyExceeded.selector, PECA, 1, 0));
        discount.mintTo(outro, PECA, 1);
    }

    function test_Emitir_RespeitaTetoPorCarteira() public {
        vm.prank(donoCafe);
        discount.createPiece(PECA, _params(0, 0, 0, 2));

        vm.prank(relayer);
        discount.mintTo(cliente, PECA, 2);

        vm.prank(relayer);
        vm.expectRevert(abi.encodeWithSelector(DiscountNFT.MaxPerWalletExceeded.selector, PECA, 1, 0));
        discount.mintTo(cliente, PECA, 1);

        // O teto e por carteira, nao da peca: outra pessoa continua podendo.
        vm.prank(relayer);
        discount.mintTo(outro, PECA, 2);
        assertEq(discount.balanceOf(outro, PECA), 2);
    }

    function test_Emitir_NosLimitesExatosDaJanela() public {
        vm.warp(1000);
        vm.prank(donoCafe);
        discount.createPiece(PECA, _params(0, 2000, 3000, 0));

        vm.prank(relayer);
        vm.expectRevert(abi.encodeWithSelector(DiscountNFT.PieceNotStarted.selector, PECA, uint64(2000)));
        discount.mintTo(cliente, PECA, 1);

        vm.warp(2000);
        vm.prank(relayer);
        discount.mintTo(cliente, PECA, 1);

        vm.warp(3000);
        vm.prank(relayer);
        discount.mintTo(cliente, PECA, 1);

        vm.warp(3001);
        vm.prank(relayer);
        vm.expectRevert(abi.encodeWithSelector(DiscountNFT.PieceExpired.selector, PECA, uint64(3000)));
        discount.mintTo(cliente, PECA, 1);
    }

    // ---------------------------------------------------------------- usar

    function test_Usar_QueimaEEmite() public {
        _criarPeca();
        vm.prank(relayer);
        discount.mintTo(cliente, PECA, 2);

        bytes32 ref = keccak256("atendimento");
        vm.expectEmit(true, true, true, true);
        emit PieceUsed(PECA, cliente, cafe, 1, ref);

        vm.prank(atendente);
        discount.usePiece(cliente, PECA, cafe, 1, ref);

        assertEq(discount.balanceOf(cliente, PECA), 1);
    }

    function test_Usar_SoOperadorDaLojaOuRelayer() public {
        _criarPeca();
        vm.prank(relayer);
        discount.mintTo(cliente, PECA, 1);

        vm.prank(outro);
        vm.expectRevert(DiscountNFT.NotOperator.selector);
        discount.usePiece(cliente, PECA, cafe, 1, bytes32(0));

        vm.prank(relayer);
        discount.usePiece(cliente, PECA, cafe, 1, bytes32(0));
        assertEq(discount.balanceOf(cliente, PECA), 0);
    }

    /**
     * O teste que sustenta a pool inteira: a padaria nao aceitou o convite,
     * entao a peca do cafe nao vale nela -- nem com o atendente certo, nem com
     * o relayer.
     */
    function test_Usar_NaoValeEmLojaQueNaoEntrouNaPool() public {
        _criarPeca();
        vm.prank(relayer);
        discount.mintTo(cliente, PECA, 1);

        vm.prank(donoPadaria);
        registry.addOperator(padaria, outro);

        vm.prank(outro);
        vm.expectRevert(abi.encodeWithSelector(DiscountNFT.NotValidHere.selector, PECA, padaria));
        discount.usePiece(cliente, PECA, padaria, 1, bytes32(0));
    }

    function test_Usar_ValeDepoisQueAVizinhaAceita() public {
        _criarPeca();
        vm.prank(relayer);
        discount.mintTo(cliente, PECA, 1);

        vm.prank(donoCafe);
        programs.invite(programa, padaria);
        vm.prank(donoPadaria);
        programs.acceptInvite(programa, padaria);

        vm.prank(relayer);
        discount.usePiece(cliente, PECA, padaria, 1, bytes32(0));
        assertEq(discount.balanceOf(cliente, PECA), 0);
    }

    function test_Usar_RecusaAcimaDoSaldo() public {
        _criarPeca();
        vm.prank(relayer);
        discount.mintTo(cliente, PECA, 1);

        vm.prank(atendente);
        vm.expectRevert(abi.encodeWithSelector(IERC1155Errors.ERC1155InsufficientBalance.selector, cliente, 1, 2, PECA));
        discount.usePiece(cliente, PECA, cafe, 2, bytes32(0));
    }

    /// O tempo de vida governa a EMISSAO. Honrar uma peca vencida e decisao de
    /// balcao, e o contrato nao atrapalha.
    function test_Usar_FuncionaDepoisDeAJanelaDeEmissaoAcabar() public {
        vm.warp(1000);
        vm.prank(donoCafe);
        discount.createPiece(PECA, _params(0, 0, 2000, 0));

        vm.prank(relayer);
        discount.mintTo(cliente, PECA, 1);

        vm.warp(5000);
        vm.prank(atendente);
        discount.usePiece(cliente, PECA, cafe, 1, bytes32(0));
        assertEq(discount.balanceOf(cliente, PECA), 0);
    }

    function test_Usar_ProgramaDesativadoNaoVale() public {
        _criarPeca();
        vm.prank(relayer);
        discount.mintTo(cliente, PECA, 1);

        vm.prank(donoCafe);
        programs.setProgramActive(programa, false);

        vm.prank(atendente);
        vm.expectRevert(abi.encodeWithSelector(DiscountNFT.NotValidHere.selector, PECA, cafe));
        discount.usePiece(cliente, PECA, cafe, 1, bytes32(0));
    }

    // ---------------------------------------------------- transferibilidade

    /// A peca e a unica coisa do sistema que circula. E de proposito.
    function test_Transferencia_ELivre() public {
        _criarPeca();
        vm.prank(relayer);
        discount.mintTo(cliente, PECA, 2);

        vm.prank(cliente);
        discount.safeTransferFrom(cliente, outro, PECA, 1, "");

        assertEq(discount.balanceOf(cliente, PECA), 1);
        assertEq(discount.balanceOf(outro, PECA), 1);
    }

    function test_Transferencia_QuemRecebeConsegueUsar() public {
        _criarPeca();
        vm.prank(relayer);
        discount.mintTo(cliente, PECA, 1);

        vm.prank(cliente);
        discount.safeTransferFrom(cliente, outro, PECA, 1, "");

        vm.prank(atendente);
        discount.usePiece(outro, PECA, cafe, 1, bytes32(0));
        assertEq(discount.balanceOf(outro, PECA), 0);
    }

    // ------------------------------------------------------------- leitura

    function test_Desconto_VemDoPrograma() public {
        vm.prank(donoCafe);
        DiscountNFT.PieceParams memory p = _params(0, 0, 0, 0);
        p.level = 2;
        discount.createPiece(PECA, p);

        // 15% do programa, nivel 2, numa conta de R$ 100 = R$ 30.
        assertEq(discount.discountFor(PECA, 10_000), 3000);
    }

    function test_Desconto_DePecaInexistenteEZero() public view {
        assertEq(discount.discountFor(999, 10_000), 0);
    }

    function test_Enumeracao_ListaNaOrdemDeCriacao() public {
        vm.startPrank(donoCafe);
        discount.createPiece(7, _params(0, 0, 0, 0));
        discount.createPiece(3, _params(0, 0, 0, 0));
        vm.stopPrank();

        uint256[] memory ids = discount.getPieceIds();
        assertEq(ids.length, 2);
        assertEq(ids[0], 7);
        assertEq(ids[1], 3);
    }

    function test_GetAllPieces_DevolveDadosETiragemJaSaida() public {
        _criarPeca();
        vm.prank(relayer);
        discount.mintTo(cliente, PECA, 2);

        (uint256[] memory ids, DiscountNFT.Piece[] memory pecas, uint256[] memory saidas) = discount.getAllPieces();
        assertEq(ids.length, 1);
        assertEq(pecas[0].programId, programa);
        assertEq(saidas[0], 2);
    }
}

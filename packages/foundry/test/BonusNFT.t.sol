// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { BonusNFT } from "../contracts/BonusNFT.sol";
import { EstablishmentRegistry } from "../contracts/EstablishmentRegistry.sol";
import { PointsVault } from "../contracts/PointsVault.sol";
import { StampLedger } from "../contracts/StampLedger.sol";
import { SubscriptionManager } from "../contracts/SubscriptionManager.sol";
import { IERC721Errors } from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

contract BonusNFTTest is Test {
    EstablishmentRegistry registry;
    SubscriptionManager subs;
    PointsVault vault;
    StampLedger ledger;
    BonusNFT bonus;

    address admin = makeAddr("admin");
    address relayer = makeAddr("relayer");
    address lojista = makeAddr("lojista");
    address user = makeAddr("user");
    address other = makeAddr("other");

    uint256 lojaId;
    uint256 constant ROUTE_ID = 7;
    uint256 constant PONTO_CIDADE = 1;

    event BonusMinted(uint256 indexed tokenId, address indexed to, uint256 indexed routeId);

    function setUp() public {
        vm.startPrank(admin);

        registry = new EstablishmentRegistry(admin);
        subs = new SubscriptionManager(admin);
        vault = new PointsVault(admin, "https://chorinho.test/pontos/{id}.json");
        ledger = new StampLedger(registry, subs, vault, admin);
        bonus = new BonusNFT(registry);

        registry.grantRole(registry.RELAYER_ROLE(), relayer);
        vault.createPointType(PONTO_CIDADE, "Ponto da Cidade", PointsVault.Scope.City, 1);
        vault.grantRole(vault.MINTER_ROLE(), address(ledger));

        lojaId = registry.registerEstablishment(lojista, keccak256("cafe"));
        subs.setSubscription(lojaId, 1, uint64(block.timestamp + 365 days), keccak256("ref"));
        bonus.setStampLedger(ledger);

        vm.stopPrank();

        vm.prank(lojista);
        ledger.setAccrualRule(
            lojaId,
            StampLedger.AccrualRule({
                minTicketCents: 500,
                centsPerStamp: 1000,
                maxStampsPerTx: 100,
                cooldownSeconds: 0,
                streakWindowSeconds: 7 days,
                pointsPerStamp: 1,
                pointTypeId: PONTO_CIDADE,
                active: true
            })
        );
    }

    /// Credita carimbos ao `user` na loja do teste.
    function _carimbar(uint64 centavos, bytes32 ref) internal {
        vm.prank(relayer);
        ledger.issueStamps(
            StampLedger.Sale({
                establishmentId: lojaId, customer: user, amountCents: centavos, productBoostBps: 0, saleRef: ref
            })
        );
    }

    function _niveis(uint256 n1, uint256 n2) internal returns (uint256[6] memory limites) {
        limites[1] = n1;
        limites[2] = n2;
        vm.prank(lojista);
        bonus.setTierThresholds(lojaId, limites);
    }

    function _mintToUser() internal returns (uint256 tokenId) {
        vm.prank(relayer);
        tokenId = bonus.mintBonus(user, ROUTE_ID, "ipfs://route-7-badge");
    }

    function test_MintByRelayer() public {
        vm.prank(relayer);
        vm.expectEmit(true, true, true, false);
        emit BonusMinted(1, user, ROUTE_ID);
        uint256 tokenId = bonus.mintBonus(user, ROUTE_ID, "ipfs://route-7-badge");

        // Os ids comecam em 1 para que zero signifique "sem peca" em badgeOf.
        assertEq(tokenId, 1);
        assertEq(bonus.ownerOf(tokenId), user);
        assertEq(bonus.tokenURI(tokenId), "ipfs://route-7-badge");
        assertEq(bonus.routeIdOf(tokenId), ROUTE_ID);
        assertEq(bonus.balanceOf(user), 1);

        // ids sao sequenciais
        vm.prank(relayer);
        assertEq(bonus.mintBonus(other, ROUTE_ID, "ipfs://x"), 2);
    }

    function test_Mint_RevertsForNonRelayer() public {
        // not even the platform admin can mint directly — only the relayer role
        vm.prank(admin);
        vm.expectRevert(BonusNFT.NotRelayer.selector);
        bonus.mintBonus(user, ROUTE_ID, "ipfs://x");

        vm.prank(user);
        vm.expectRevert(BonusNFT.NotRelayer.selector);
        bonus.mintBonus(user, ROUTE_ID, "ipfs://x");
    }

    function test_Soulbound_TransferReverts() public {
        uint256 tokenId = _mintToUser();

        vm.startPrank(user);
        vm.expectRevert(BonusNFT.SoulboundTransferNotAllowed.selector);
        bonus.transferFrom(user, other, tokenId);

        vm.expectRevert(BonusNFT.SoulboundTransferNotAllowed.selector);
        bonus.safeTransferFrom(user, other, tokenId);

        vm.expectRevert(BonusNFT.SoulboundTransferNotAllowed.selector);
        bonus.safeTransferFrom(user, other, tokenId, "");
        vm.stopPrank();

        assertEq(bonus.ownerOf(tokenId), user);
    }

    function test_Soulbound_ApprovalsRevert() public {
        uint256 tokenId = _mintToUser();

        vm.startPrank(user);
        vm.expectRevert(BonusNFT.SoulboundApprovalNotAllowed.selector);
        bonus.approve(other, tokenId);

        vm.expectRevert(BonusNFT.SoulboundApprovalNotAllowed.selector);
        bonus.setApprovalForAll(other, true);
        vm.stopPrank();
    }

    function test_BurnByOwner() public {
        uint256 tokenId = _mintToUser();

        vm.prank(user);
        bonus.burn(tokenId);

        assertEq(bonus.balanceOf(user), 0);
        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721NonexistentToken.selector, tokenId));
        bonus.ownerOf(tokenId);
    }

    function test_Burn_RevertsForNonOwner() public {
        uint256 tokenId = _mintToUser();

        // approvals are disabled, so only the owner can ever be authorized
        vm.prank(other);
        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721InsufficientApproval.selector, other, tokenId));
        bonus.burn(tokenId);
    }

    // ------------------------------------------------- peca de tempo de casa

    function test_Niveis_SoDonoOuAdminConfigura() public {
        uint256[6] memory limites;
        limites[1] = 10;

        vm.prank(other);
        vm.expectRevert(BonusNFT.NotEstablishmentOwner.selector);
        bonus.setTierThresholds(lojaId, limites);

        vm.prank(lojista);
        bonus.setTierThresholds(lojaId, limites);
        assertEq(bonus.tierThresholds(lojaId, 1), 10);
    }

    function test_TempoDeCasa_CunhaQuandoAlcanca() public {
        _niveis(5, 20);
        _carimbar(6000, "v1"); // 6 carimbos

        vm.prank(relayer);
        uint256 tokenId = bonus.mintOrUpgrade(lojaId, user, 1, "ipfs://bronze");

        assertEq(bonus.ownerOf(tokenId), user);
        assertEq(bonus.establishmentIdOf(tokenId), lojaId);
        assertEq(bonus.tierOf(tokenId), 1);
        assertEq(bonus.badgeOf(lojaId, user), tokenId);
        assertEq(bonus.tierDoCliente(lojaId, user), 1);
    }

    /**
     * O que faz esta peca valer alguma coisa: o relayer dispara, mas quem
     * decide e o contrato, lendo os carimbos de sempre no ledger. Relayer
     * comprometido nao forja nivel.
     */
    function test_TempoDeCasa_RelayerNaoForjaNivel() public {
        _niveis(5, 20);
        _carimbar(2000, "v1"); // so 2 carimbos

        vm.prank(relayer);
        vm.expectRevert(abi.encodeWithSelector(BonusNFT.TierNotEarned.selector, 2, 5));
        bonus.mintOrUpgrade(lojaId, user, 1, "ipfs://bronze");
    }

    function test_TempoDeCasa_SobeDeNivelNoMesmoToken() public {
        _niveis(5, 20);
        _carimbar(6000, "v1");

        vm.prank(relayer);
        uint256 tokenId = bonus.mintOrUpgrade(lojaId, user, 1, "ipfs://bronze");

        _carimbar(20_000, "v2"); // total 26

        vm.prank(relayer);
        uint256 mesmo = bonus.mintOrUpgrade(lojaId, user, 2, "ipfs://prata");

        assertEq(mesmo, tokenId, "a peca evolui, nao se multiplica");
        assertEq(bonus.tierOf(tokenId), 2);
        assertEq(bonus.tokenURI(tokenId), "ipfs://prata");
        assertEq(bonus.balanceOf(user), 1);
    }

    function test_TempoDeCasa_NaoDesceDeNivel() public {
        _niveis(5, 20);
        _carimbar(30_000, "v1");

        vm.startPrank(relayer);
        bonus.mintOrUpgrade(lojaId, user, 2, "ipfs://prata");
        vm.expectRevert(abi.encodeWithSelector(BonusNFT.NotAnUpgrade.selector, uint8(2), uint8(1)));
        bonus.mintOrUpgrade(lojaId, user, 1, "ipfs://bronze");
        vm.stopPrank();
    }

    function test_TempoDeCasa_RecusaNivelForaDaFaixa() public {
        _niveis(5, 20);
        _carimbar(30_000, "v1");

        vm.startPrank(relayer);
        vm.expectRevert(BonusNFT.InvalidTier.selector);
        bonus.mintOrUpgrade(lojaId, user, 0, "ipfs://x");
        vm.expectRevert(BonusNFT.InvalidTier.selector);
        bonus.mintOrUpgrade(lojaId, user, 6, "ipfs://x");
        vm.stopPrank();
    }

    function test_TempoDeCasa_SoRelayer() public {
        _niveis(5, 20);
        _carimbar(6000, "v1");

        vm.prank(lojista);
        vm.expectRevert(BonusNFT.NotRelayer.selector);
        bonus.mintOrUpgrade(lojaId, user, 1, "ipfs://bronze");
    }

    function test_TempoDeCasa_SemLedgerConfiguradoReverte() public {
        BonusNFT solto = new BonusNFT(registry);

        vm.prank(relayer);
        vm.expectRevert(BonusNFT.LedgerNotSet.selector);
        solto.mintOrUpgrade(lojaId, user, 1, "ipfs://bronze");
    }

    function test_TempoDeCasa_ELocalPorLoja() public {
        _niveis(5, 20);
        _carimbar(6000, "v1");

        vm.prank(relayer);
        bonus.mintOrUpgrade(lojaId, user, 1, "ipfs://bronze");

        // Outra loja: o cliente comeca do zero la.
        vm.prank(admin);
        uint256 outraLoja = registry.registerEstablishment(other, keccak256("padaria"));
        assertEq(bonus.badgeOf(outraLoja, user), 0);
        assertEq(bonus.tierDoCliente(outraLoja, user), 0);
    }
}

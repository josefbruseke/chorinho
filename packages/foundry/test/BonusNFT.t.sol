// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { EstablishmentRegistry } from "../contracts/EstablishmentRegistry.sol";
import { BonusNFT } from "../contracts/BonusNFT.sol";
import { IERC721Errors } from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

contract BonusNFTTest is Test {
    EstablishmentRegistry registry;
    BonusNFT bonus;

    address admin = makeAddr("admin");
    address relayer = makeAddr("relayer");
    address user = makeAddr("user");
    address other = makeAddr("other");

    uint256 constant ROUTE_ID = 7;

    event BonusMinted(uint256 indexed tokenId, address indexed to, uint256 indexed routeId);

    function setUp() public {
        registry = new EstablishmentRegistry(admin);
        bonus = new BonusNFT(registry);

        bytes32 relayerRole = registry.RELAYER_ROLE();
        vm.prank(admin);
        registry.grantRole(relayerRole, relayer);
    }

    function _mintToUser() internal returns (uint256 tokenId) {
        vm.prank(relayer);
        tokenId = bonus.mintBonus(user, ROUTE_ID, "ipfs://route-7-badge");
    }

    function test_MintByRelayer() public {
        vm.prank(relayer);
        vm.expectEmit(true, true, true, false);
        emit BonusMinted(0, user, ROUTE_ID);
        uint256 tokenId = bonus.mintBonus(user, ROUTE_ID, "ipfs://route-7-badge");

        assertEq(tokenId, 0);
        assertEq(bonus.ownerOf(tokenId), user);
        assertEq(bonus.tokenURI(tokenId), "ipfs://route-7-badge");
        assertEq(bonus.routeIdOf(tokenId), ROUTE_ID);
        assertEq(bonus.balanceOf(user), 1);

        // ids are sequential
        vm.prank(relayer);
        assertEq(bonus.mintBonus(other, ROUTE_ID, "ipfs://x"), 1);
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
}

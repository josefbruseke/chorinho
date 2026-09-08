// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { EstablishmentRegistry } from "../contracts/EstablishmentRegistry.sol";
import { DiscountNFT } from "../contracts/DiscountNFT.sol";
import { IERC1155Errors } from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

contract DiscountNFTTest is Test {
    EstablishmentRegistry registry;
    DiscountNFT discount;

    address admin = makeAddr("admin");
    address establishment = makeAddr("establishment");
    address user = makeAddr("user");
    address other = makeAddr("other");

    uint256 constant PRICE = 0.01 ether;
    uint256 constant MAIN_ID = 1;
    uint256 constant COMBO_ID = 100;

    event Minted(uint256 indexed tokenId, address indexed to, uint256 amount, uint256 paid);
    event ComboMinted(uint256 indexed mainTokenId, uint256 indexed comboTokenId, address indexed to, uint256 amount);
    event ComboMintSkipped(uint256 indexed mainTokenId, uint256 indexed comboTokenId, address indexed to);
    event Redeemed(
        uint256 indexed tokenId,
        address indexed user,
        address indexed establishment,
        uint256 amount,
        bytes32 redemptionRef
    );

    function setUp() public {
        registry = new EstablishmentRegistry(admin);
        discount = new DiscountNFT(registry);

        vm.prank(admin);
        registry.addEstablishment(establishment);

        vm.deal(user, 100 ether);
        vm.deal(other, 100 ether);
    }

    // ------------------------------------------------------------- helpers

    function _params(uint256 price, uint256 maxSupply, uint64 startTime, uint64 endTime, uint256 maxPerWallet)
        internal
        pure
        returns (DiscountNFT.CampaignParams memory p)
    {
        p.price = price;
        p.maxSupply = maxSupply;
        p.startTime = startTime;
        p.endTime = endTime;
        p.maxPerWallet = maxPerWallet;
        p.category = DiscountNFT.Category.Gastronomy;
        p.flash = maxSupply != 0 && endTime != 0;
        p.comboTokenIds = new uint256[](0);
        p.uri = "ipfs://campaign-metadata";
    }

    function _createDefaultCampaign() internal {
        vm.prank(admin);
        discount.createCampaign(MAIN_ID, _params(PRICE, 0, 0, 0, 0));
    }

    // ------------------------------------------------------ campaign admin

    function test_CreateCampaign_StoresDataAndEmitsUri() public {
        _createDefaultCampaign();
        DiscountNFT.Campaign memory c = discount.getCampaign(MAIN_ID);
        assertEq(c.price, PRICE);
        assertTrue(c.active);
        assertEq(discount.uri(MAIN_ID), "ipfs://campaign-metadata");
    }

    function test_CreateCampaign_RevertsForNonAdmin() public {
        vm.prank(user);
        vm.expectRevert(DiscountNFT.NotAdmin.selector);
        discount.createCampaign(MAIN_ID, _params(PRICE, 0, 0, 0, 0));
    }

    function test_CreateCampaign_RevertsOnDuplicate() public {
        _createDefaultCampaign();
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(DiscountNFT.CampaignAlreadyExists.selector, MAIN_ID));
        discount.createCampaign(MAIN_ID, _params(PRICE, 0, 0, 0, 0));
    }

    function test_CreateCampaign_RevertsOnInvalidWindow() public {
        vm.prank(admin);
        vm.expectRevert(DiscountNFT.InvalidWindow.selector);
        discount.createCampaign(MAIN_ID, _params(PRICE, 0, 100, 50, 0));
    }

    function test_CreateCampaign_RevertsOnUnknownComboReference() public {
        DiscountNFT.CampaignParams memory p = _params(PRICE, 0, 0, 0, 0);
        p.comboTokenIds = new uint256[](1);
        p.comboTokenIds[0] = 999; // never created
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(DiscountNFT.InvalidComboReference.selector, 999));
        discount.createCampaign(MAIN_ID, p);
    }

    function test_SetCampaignActive_TogglesMinting() public {
        _createDefaultCampaign();
        vm.prank(admin);
        discount.setCampaignActive(MAIN_ID, false);

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(DiscountNFT.CampaignNotActive.selector, MAIN_ID));
        discount.mint{ value: PRICE }(MAIN_ID, 1);
    }

    // ----------------------------------------------------------------- mint

    function test_Mint_HappyPath() public {
        _createDefaultCampaign();

        vm.prank(user);
        vm.expectEmit(true, true, false, true);
        emit Minted(MAIN_ID, user, 2, 2 * PRICE);
        discount.mint{ value: 2 * PRICE }(MAIN_ID, 2);

        assertEq(discount.balanceOf(user, MAIN_ID), 2);
        assertEq(discount.totalSupply(MAIN_ID), 2);
        assertEq(discount.mintedBy(MAIN_ID, user), 2);
        assertEq(address(discount).balance, 2 * PRICE);
    }

    function test_Mint_RevertsOnWrongPayment() public {
        _createDefaultCampaign();

        vm.startPrank(user);
        vm.expectRevert(abi.encodeWithSelector(DiscountNFT.InvalidPayment.selector, PRICE, PRICE - 1));
        discount.mint{ value: PRICE - 1 }(MAIN_ID, 1);

        // overpaying also reverts: exact payment, no refund logic
        vm.expectRevert(abi.encodeWithSelector(DiscountNFT.InvalidPayment.selector, PRICE, PRICE + 1));
        discount.mint{ value: PRICE + 1 }(MAIN_ID, 1);
        vm.stopPrank();
    }

    function testFuzz_Mint_WrongPaymentAlwaysReverts(uint256 sent) public {
        _createDefaultCampaign();
        sent = bound(sent, 0, 100 ether);
        vm.assume(sent != PRICE);

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(DiscountNFT.InvalidPayment.selector, PRICE, sent));
        discount.mint{ value: sent }(MAIN_ID, 1);
    }

    function test_Mint_RevertsBeforeWindowAndAfterWindow() public {
        uint64 start = uint64(block.timestamp + 1 days);
        uint64 end = uint64(block.timestamp + 2 days);
        vm.prank(admin);
        discount.createCampaign(MAIN_ID, _params(PRICE, 0, start, end, 0));

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(DiscountNFT.CampaignNotStarted.selector, MAIN_ID, start));
        discount.mint{ value: PRICE }(MAIN_ID, 1);

        vm.warp(end + 1);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(DiscountNFT.CampaignEnded.selector, MAIN_ID, end));
        discount.mint{ value: PRICE }(MAIN_ID, 1);
    }

    function test_Mint_SucceedsAtExactWindowBoundaries() public {
        uint64 start = uint64(block.timestamp + 1 days);
        uint64 end = uint64(block.timestamp + 2 days);
        vm.prank(admin);
        discount.createCampaign(MAIN_ID, _params(PRICE, 0, start, end, 0));

        vm.warp(start);
        vm.prank(user);
        discount.mint{ value: PRICE }(MAIN_ID, 1);

        vm.warp(end);
        vm.prank(user);
        discount.mint{ value: PRICE }(MAIN_ID, 1);

        assertEq(discount.balanceOf(user, MAIN_ID), 2);
    }

    function test_Mint_SupplyCapExactBoundary() public {
        vm.prank(admin);
        discount.createCampaign(MAIN_ID, _params(PRICE, 5, 0, 0, 0));

        vm.prank(user);
        discount.mint{ value: 5 * PRICE }(MAIN_ID, 5); // exactly maxSupply: ok

        vm.prank(other);
        vm.expectRevert(abi.encodeWithSelector(DiscountNFT.MaxSupplyExceeded.selector, MAIN_ID, 1, 0));
        discount.mint{ value: PRICE }(MAIN_ID, 1);
    }

    function test_Mint_RespectsMaxPerWallet() public {
        vm.prank(admin);
        discount.createCampaign(MAIN_ID, _params(PRICE, 0, 0, 0, 2));

        vm.startPrank(user);
        discount.mint{ value: 2 * PRICE }(MAIN_ID, 2);
        vm.expectRevert(abi.encodeWithSelector(DiscountNFT.MaxPerWalletExceeded.selector, MAIN_ID, 1, 0));
        discount.mint{ value: PRICE }(MAIN_ID, 1);
        vm.stopPrank();

        // cap is per wallet, another wallet can still mint
        vm.prank(other);
        discount.mint{ value: PRICE }(MAIN_ID, 1);
        assertEq(discount.balanceOf(other, MAIN_ID), 1);
    }

    function test_Mint_RevertsOnNonexistentCampaignAndZeroAmount() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(DiscountNFT.CampaignDoesNotExist.selector, 42));
        discount.mint(42, 1);

        _createDefaultCampaign();
        vm.prank(user);
        vm.expectRevert(DiscountNFT.ZeroAmount.selector);
        discount.mint(MAIN_ID, 0);
    }

    // ---------------------------------------------------------------- combo

    function _createComboSetup(uint256 comboMaxSupply) internal {
        vm.startPrank(admin);
        // combo target created first (leaf-first requirement)
        discount.createCampaign(COMBO_ID, _params(0, comboMaxSupply, 0, 0, 0));
        DiscountNFT.CampaignParams memory p = _params(PRICE, 0, 0, 0, 0);
        p.comboTokenIds = new uint256[](1);
        p.comboTokenIds[0] = COMBO_ID;
        discount.createCampaign(MAIN_ID, p);
        vm.stopPrank();
    }

    function test_Combo_MintsAssociatedTokenForFree() public {
        _createComboSetup(0);

        vm.prank(user);
        vm.expectEmit(true, true, true, true);
        emit ComboMinted(MAIN_ID, COMBO_ID, user, 2);
        discount.mint{ value: 2 * PRICE }(MAIN_ID, 2); // pays only for MAIN_ID

        assertEq(discount.balanceOf(user, MAIN_ID), 2);
        assertEq(discount.balanceOf(user, COMBO_ID), 2);
    }

    function test_Combo_SkippedWhenComboSupplyExhausted_MainStillMints() public {
        _createComboSetup(1);

        // first buyer takes the single combo unit
        vm.prank(other);
        discount.mint{ value: PRICE }(MAIN_ID, 1);
        assertEq(discount.balanceOf(other, COMBO_ID), 1);

        // second buyer: combo skipped, main purchase unaffected
        vm.prank(user);
        vm.expectEmit(true, true, true, false);
        emit ComboMintSkipped(MAIN_ID, COMBO_ID, user);
        discount.mint{ value: PRICE }(MAIN_ID, 1);

        assertEq(discount.balanceOf(user, MAIN_ID), 1);
        assertEq(discount.balanceOf(user, COMBO_ID), 0);
    }

    // --------------------------------------------------------------- redeem

    function test_Redeem_BurnsAndEmits() public {
        _createDefaultCampaign();
        vm.prank(user);
        discount.mint{ value: 2 * PRICE }(MAIN_ID, 2);

        bytes32 ref = keccak256("order-123");
        vm.prank(establishment);
        vm.expectEmit(true, true, true, true);
        emit Redeemed(MAIN_ID, user, establishment, 1, ref);
        discount.redeem(user, MAIN_ID, 1, ref);

        assertEq(discount.balanceOf(user, MAIN_ID), 1);
        assertEq(discount.totalSupply(MAIN_ID), 1);
    }

    function test_Redeem_RevertsForNonEstablishment() public {
        _createDefaultCampaign();
        vm.prank(user);
        discount.mint{ value: PRICE }(MAIN_ID, 1);

        vm.prank(other);
        vm.expectRevert(DiscountNFT.NotEstablishment.selector);
        discount.redeem(user, MAIN_ID, 1, bytes32(0));
    }

    function test_Redeem_RevertsAboveBalance() public {
        _createDefaultCampaign();
        vm.prank(user);
        discount.mint{ value: PRICE }(MAIN_ID, 1);

        vm.prank(establishment);
        vm.expectRevert(abi.encodeWithSelector(IERC1155Errors.ERC1155InsufficientBalance.selector, user, 1, 2, MAIN_ID));
        discount.redeem(user, MAIN_ID, 2, bytes32(0));
    }

    function test_Redeem_WorksAfterMintWindowEnded() public {
        uint64 end = uint64(block.timestamp + 1 days);
        vm.prank(admin);
        discount.createCampaign(MAIN_ID, _params(PRICE, 0, 0, end, 0));
        vm.prank(user);
        discount.mint{ value: PRICE }(MAIN_ID, 1);

        // mint window closing must not lock already-sold coupons
        vm.warp(end + 30 days);
        vm.prank(establishment);
        discount.redeem(user, MAIN_ID, 1, bytes32(0));
        assertEq(discount.balanceOf(user, MAIN_ID), 0);
    }

    // ------------------------------------------------------------- transfer

    function test_Transfer_IsUnrestricted() public {
        _createDefaultCampaign();
        vm.prank(user);
        discount.mint{ value: PRICE }(MAIN_ID, 1);

        vm.prank(user);
        discount.safeTransferFrom(user, other, MAIN_ID, 1, "");
        assertEq(discount.balanceOf(other, MAIN_ID), 1);

        // and the receiver can be redeemed against (resale keeps the benefit)
        vm.prank(establishment);
        discount.redeem(other, MAIN_ID, 1, bytes32(0));
        assertEq(discount.balanceOf(other, MAIN_ID), 0);
    }

    // ---------------------------------------------------------- enumeration

    function test_Enumeration_ListsCampaignsInCreationOrder() public {
        assertEq(discount.getCampaignIds().length, 0);

        _createComboSetup(0); // creates COMBO_ID first, then MAIN_ID

        uint256[] memory ids = discount.getCampaignIds();
        assertEq(ids.length, 2);
        assertEq(ids[0], COMBO_ID);
        assertEq(ids[1], MAIN_ID);
    }

    function test_GetAllCampaigns_ReturnsDataAndMintedCounts() public {
        _createComboSetup(0);

        vm.prank(user);
        discount.mint{ value: 2 * PRICE }(MAIN_ID, 2); // also combo-mints 2 of COMBO_ID

        (uint256[] memory ids, DiscountNFT.Campaign[] memory campaigns, uint256[] memory minted) =
            discount.getAllCampaigns();

        assertEq(ids.length, 2);
        assertEq(campaigns.length, 2);
        assertEq(minted.length, 2);

        assertEq(ids[0], COMBO_ID);
        assertEq(campaigns[0].price, 0);
        assertEq(minted[0], 2);

        assertEq(ids[1], MAIN_ID);
        assertEq(campaigns[1].price, PRICE);
        assertEq(campaigns[1].comboTokenIds.length, 1);
        assertEq(minted[1], 2);
    }

    // ------------------------------------------------------------- withdraw

    function test_Withdraw_OnlyAdmin() public {
        _createDefaultCampaign();
        vm.prank(user);
        discount.mint{ value: PRICE }(MAIN_ID, 1);

        vm.prank(user);
        vm.expectRevert(DiscountNFT.NotAdmin.selector);
        discount.withdraw(payable(user));

        address payable treasury = payable(makeAddr("treasury"));
        vm.prank(admin);
        discount.withdraw(treasury);
        assertEq(treasury.balance, PRICE);
        assertEq(address(discount).balance, 0);
    }
}

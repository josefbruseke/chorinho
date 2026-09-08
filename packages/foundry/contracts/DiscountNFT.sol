// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ERC1155 } from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import { ERC1155Supply } from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { EstablishmentRegistry } from "./EstablishmentRegistry.sol";

/**
 * @title DiscountNFT
 * @notice ERC1155 collection where each tokenId is a discount campaign
 *         (regular or flash promotion). Users mint by paying in native
 *         currency; partner establishments redeem coupons by burning them.
 *
 * Design decisions worth calling out:
 *
 * - Campaigns are a mapping inside this contract rather than per-campaign
 *   contracts (no factory): ERC1155 tokenIds are exactly the "many classes,
 *   one collection" primitive this needs.
 *
 * - Redemption burns the unit. ERC1155 units of a given tokenId are fungible,
 *   so "marking one specific unit as used" is not representable; burning plus
 *   the Redeemed event (carrying an off-chain redemption reference) is the
 *   idiomatic equivalent, and the event log preserves full history.
 *
 * - Establishments can burn from any wallet without user approval. Redemption
 *   happens in person at the point of sale, the role is granted by the
 *   platform admin, and a malicious establishment gains nothing (it destroys
 *   a coupon it would otherwise have to honor). Requiring a user signature
 *   would push EIP-712 flows into this phase for little benefit.
 *
 * - `maxPerWallet` counts units *minted* by a wallet, not units held —
 *   transfers are unrestricted by design (resale/gifting), so a hold-based
 *   cap would be trivially circumvented anyway. The cap exists to stop a
 *   single wallet from sweeping a flash promotion's supply at mint time.
 *
 * - Combo bonus tokens are minted best-effort: if the combo campaign is
 *   paused, out of its window, or out of supply, the main purchase still
 *   succeeds and ComboMintSkipped is emitted. A free add-on should never
 *   block the paid purchase. Combos resolve one level deep (a combo's own
 *   combos are not cascaded) and bypass the combo campaign's price and
 *   per-wallet cap — they are gifts, not purchases.
 */
contract DiscountNFT is ERC1155Supply, ReentrancyGuard {
    enum Category {
        Gastronomy,
        LeisureTourism,
        Sports,
        Culture,
        Apparel
    }

    struct CampaignParams {
        uint256 price; // wei per unit
        uint256 maxSupply; // 0 = unlimited
        uint64 startTime; // unix; 0 = no lower bound
        uint64 endTime; // unix; 0 = no upper bound
        uint256 maxPerWallet; // 0 = unlimited
        Category category;
        bool flash; // display flag for the frontend; scarcity itself is enforced by maxSupply + window
        uint256[] comboTokenIds; // campaigns minted for free alongside this one
        string uri; // metadata URI for this tokenId
    }

    struct Campaign {
        uint256 price;
        uint256 maxSupply;
        uint64 startTime;
        uint64 endTime;
        uint256 maxPerWallet;
        Category category;
        bool flash;
        bool active;
        bool exists;
        uint256[] comboTokenIds;
        string uri;
    }

    EstablishmentRegistry public immutable registry;

    mapping(uint256 tokenId => Campaign) private _campaigns;
    mapping(uint256 tokenId => mapping(address wallet => uint256)) public mintedBy;

    // ERC1155 has no native enumeration; this array lets the frontend load the
    // whole storefront in a single RPC call (getAllCampaigns) instead of
    // scanning CampaignCreated logs. Push-only: campaigns are never deleted,
    // only deactivated, so the array cannot need compaction.
    uint256[] private _campaignIds;

    event CampaignCreated(uint256 indexed tokenId, Category category, bool flash);
    event CampaignActiveSet(uint256 indexed tokenId, bool active);
    event CampaignUriSet(uint256 indexed tokenId, string uri);
    event Minted(uint256 indexed tokenId, address indexed to, uint256 amount, uint256 paid);
    event ComboMinted(uint256 indexed mainTokenId, uint256 indexed comboTokenId, address indexed to, uint256 amount);
    event ComboMintSkipped(uint256 indexed mainTokenId, uint256 indexed comboTokenId, address indexed to);
    /// @param redemptionRef opaque reference produced off-chain (e.g. hash of the
    ///        receipt/order id) linking this burn to a concrete redemption.
    event Redeemed(
        uint256 indexed tokenId,
        address indexed user,
        address indexed establishment,
        uint256 amount,
        bytes32 redemptionRef
    );
    event Withdrawn(address indexed to, uint256 amount);

    error NotAdmin();
    error NotEstablishment();
    error CampaignAlreadyExists(uint256 tokenId);
    error CampaignDoesNotExist(uint256 tokenId);
    error CampaignNotActive(uint256 tokenId);
    error CampaignNotStarted(uint256 tokenId, uint64 startTime);
    error CampaignEnded(uint256 tokenId, uint64 endTime);
    error MaxSupplyExceeded(uint256 tokenId, uint256 requested, uint256 available);
    error MaxPerWalletExceeded(uint256 tokenId, uint256 requested, uint256 remaining);
    error InvalidPayment(uint256 expected, uint256 sent);
    error InvalidWindow();
    error InvalidComboReference(uint256 comboTokenId);
    error ZeroAmount();
    error WithdrawFailed();

    modifier onlyAdmin() {
        if (!registry.isAdmin(msg.sender)) revert NotAdmin();
        _;
    }

    // Base URI is empty: uri() is overridden to return the per-campaign URI.
    constructor(EstablishmentRegistry _registry) ERC1155("") {
        registry = _registry;
    }

    // ---------------------------------------------------------------- admin

    function createCampaign(uint256 tokenId, CampaignParams calldata p) external onlyAdmin {
        if (_campaigns[tokenId].exists) revert CampaignAlreadyExists(tokenId);
        if (p.endTime != 0 && p.endTime <= p.startTime) revert InvalidWindow();
        // Combo targets must already exist, so campaigns are created leaf-first.
        // This also makes self-reference impossible without an explicit check.
        for (uint256 i = 0; i < p.comboTokenIds.length; i++) {
            if (!_campaigns[p.comboTokenIds[i]].exists) revert InvalidComboReference(p.comboTokenIds[i]);
        }

        _campaigns[tokenId] = Campaign({
            price: p.price,
            maxSupply: p.maxSupply,
            startTime: p.startTime,
            endTime: p.endTime,
            maxPerWallet: p.maxPerWallet,
            category: p.category,
            flash: p.flash,
            active: true,
            exists: true,
            comboTokenIds: p.comboTokenIds,
            uri: p.uri
        });
        _campaignIds.push(tokenId);

        emit CampaignCreated(tokenId, p.category, p.flash);
        emit URI(p.uri, tokenId);
    }

    function setCampaignActive(uint256 tokenId, bool active) external onlyAdmin {
        if (!_campaigns[tokenId].exists) revert CampaignDoesNotExist(tokenId);
        _campaigns[tokenId].active = active;
        emit CampaignActiveSet(tokenId, active);
    }

    function setCampaignUri(uint256 tokenId, string calldata newUri) external onlyAdmin {
        if (!_campaigns[tokenId].exists) revert CampaignDoesNotExist(tokenId);
        _campaigns[tokenId].uri = newUri;
        emit CampaignUriSet(tokenId, newUri);
        emit URI(newUri, tokenId);
    }

    function withdraw(address payable to) external onlyAdmin nonReentrant {
        uint256 balance = address(this).balance;
        (bool success,) = to.call{ value: balance }("");
        if (!success) revert WithdrawFailed();
        emit Withdrawn(to, balance);
    }

    // ----------------------------------------------------------------- mint

    function mint(uint256 tokenId, uint256 amount) external payable nonReentrant {
        if (amount == 0) revert ZeroAmount();
        Campaign storage c = _campaigns[tokenId];
        if (!c.exists) revert CampaignDoesNotExist(tokenId);
        if (!c.active) revert CampaignNotActive(tokenId);
        if (c.startTime != 0 && block.timestamp < c.startTime) revert CampaignNotStarted(tokenId, c.startTime);
        if (c.endTime != 0 && block.timestamp > c.endTime) revert CampaignEnded(tokenId, c.endTime);
        if (c.maxSupply != 0) {
            uint256 available = c.maxSupply - totalSupply(tokenId);
            if (amount > available) revert MaxSupplyExceeded(tokenId, amount, available);
        }
        if (c.maxPerWallet != 0) {
            uint256 remaining = c.maxPerWallet - mintedBy[tokenId][msg.sender];
            if (amount > remaining) revert MaxPerWalletExceeded(tokenId, amount, remaining);
        }
        // Exact payment required — no refund path means no unexpected value
        // sitting in the contract and one less external call.
        uint256 cost = c.price * amount;
        if (msg.value != cost) revert InvalidPayment(cost, msg.value);

        mintedBy[tokenId][msg.sender] += amount;
        _mint(msg.sender, tokenId, amount, "");
        emit Minted(tokenId, msg.sender, amount, msg.value);

        // Best-effort combo mints (see contract-level notes).
        uint256[] storage combos = c.comboTokenIds;
        for (uint256 i = 0; i < combos.length; i++) {
            uint256 comboId = combos[i];
            Campaign storage cc = _campaigns[comboId];
            bool inWindow = (cc.startTime == 0 || block.timestamp >= cc.startTime)
                && (cc.endTime == 0 || block.timestamp <= cc.endTime);
            bool hasSupply = cc.maxSupply == 0 || totalSupply(comboId) + amount <= cc.maxSupply;
            if (!cc.active || !inWindow || !hasSupply) {
                emit ComboMintSkipped(tokenId, comboId, msg.sender);
                continue;
            }
            _mint(msg.sender, comboId, amount, "");
            emit ComboMinted(tokenId, comboId, msg.sender, amount);
        }
    }

    // --------------------------------------------------------------- redeem

    function redeem(address user, uint256 tokenId, uint256 amount, bytes32 redemptionRef) external {
        if (!registry.isEstablishment(msg.sender)) revert NotEstablishment();
        if (amount == 0) revert ZeroAmount();
        // No campaign-window check here on purpose: the mint window governs
        // *sales*; whether an expired coupon is still honored is a business
        // decision the establishment makes at the counter.
        _burn(user, tokenId, amount);
        emit Redeemed(tokenId, user, msg.sender, amount, redemptionRef);
    }

    // ---------------------------------------------------------------- views

    function getCampaign(uint256 tokenId) external view returns (Campaign memory) {
        if (!_campaigns[tokenId].exists) revert CampaignDoesNotExist(tokenId);
        return _campaigns[tokenId];
    }

    function campaignExists(uint256 tokenId) external view returns (bool) {
        return _campaigns[tokenId].exists;
    }

    function getCampaignIds() external view returns (uint256[] memory) {
        return _campaignIds;
    }

    /// @notice Everything the storefront needs in one call: ids, full campaign
    ///         structs, and units already minted per campaign (for "remaining
    ///         supply" displays). Not paginated: campaign counts are small
    ///         (dozens) and this is a view call, so gas is not a concern.
    function getAllCampaigns()
        external
        view
        returns (uint256[] memory ids, Campaign[] memory campaigns, uint256[] memory minted)
    {
        ids = _campaignIds;
        uint256 len = ids.length;
        campaigns = new Campaign[](len);
        minted = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            campaigns[i] = _campaigns[ids[i]];
            minted[i] = totalSupply(ids[i]);
        }
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        return _campaigns[tokenId].uri;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { ERC721URIStorage } from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import { ERC721Burnable } from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import { EstablishmentRegistry } from "./EstablishmentRegistry.sol";

/**
 * @title BonusNFT
 * @notice Soulbound ERC721 awarded by the platform when a user completes a
 *         campaign/route. Route progress is tracked off-chain; the backend
 *         relayer (RELAYER_ROLE in the registry) mints the badge on completion.
 *
 * Design decisions worth calling out:
 *
 * - Soulbound is enforced in `_update`, the single choke point every OZ v5
 *   transfer path goes through: mint (from == 0) and burn (to == 0) pass,
 *   anything else reverts. `approve`/`setApprovalForAll` are also disabled so
 *   marketplaces can't even create dangling approvals for a token that can
 *   never move.
 *
 * - The owner can still burn (via ERC721Burnable): a token you cannot
 *   transfer is one you must at least be able to discard.
 *
 * - Rich metadata (route name, date, establishments involved) lives in the
 *   tokenURI JSON; only `routeId` is stored on-chain so other contracts or
 *   indexers can verify *which* route a badge attests to without parsing URIs.
 */
contract BonusNFT is ERC721URIStorage, ERC721Burnable {
    EstablishmentRegistry public immutable registry;

    uint256 private _nextTokenId;

    /// @notice Off-chain route/campaign identifier this badge was earned for.
    mapping(uint256 tokenId => uint256) public routeIdOf;

    event BonusMinted(uint256 indexed tokenId, address indexed to, uint256 indexed routeId);

    error NotRelayer();
    error SoulboundTransferNotAllowed();
    error SoulboundApprovalNotAllowed();

    constructor(EstablishmentRegistry _registry) ERC721("Chorinho Bonus", "CHORB") {
        registry = _registry;
    }

    function mintBonus(address to, uint256 routeId, string calldata uri) external returns (uint256 tokenId) {
        if (!registry.isRelayer(msg.sender)) revert NotRelayer();
        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        routeIdOf[tokenId] = routeId;
        emit BonusMinted(tokenId, to, routeId);
    }

    // ------------------------------------------------------------ soulbound

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert SoulboundTransferNotAllowed();
        return super._update(to, tokenId, auth);
    }

    function approve(address, uint256) public pure override(ERC721, IERC721) {
        revert SoulboundApprovalNotAllowed();
    }

    function setApprovalForAll(address, bool) public pure override(ERC721, IERC721) {
        revert SoulboundApprovalNotAllowed();
    }

    // ------------------------------------------- multiple-inheritance glue

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ERC1155 } from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import { ERC1155Supply } from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title PointsVault
 * @notice Os pontos compartilhados da rede. Cada tokenId e uma classe de ponto,
 *         com alcance proprio: da cidade inteira ate uma loja so.
 *
 *         ERC1155 e nao N contratos ERC20 porque "muitas classes, uma colecao"
 *         e exatamente o que o padrao resolve — e e o mesmo primitivo que o
 *         DiscountNFT ja usa neste projeto.
 *
 * @dev Soulbound de proposito. Ponto de fidelidade que pode ser vendido vira
 *      instrumento negociavel, com todo o peso regulatorio que isso carrega.
 *      Aqui ele so existe para ser trocado por recompensa no balcao.
 */
contract PointsVault is ERC1155Supply, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    /// @notice Alcance de uma classe de ponto.
    enum Scope {
        Global,
        City,
        Region,
        Neighborhood,
        Category,
        Establishment
    }

    struct PointType {
        bytes32 name;
        Scope scope;
        /// @dev Id da cidade, bairro, categoria ou loja. Ignorado em Global.
        uint256 scopeId;
        bool active;
    }

    mapping(uint256 id => PointType) public pointTypes;

    event PointTypeCreated(uint256 indexed id, bytes32 name, Scope scope, uint256 scopeId);
    event PointTypeActiveSet(uint256 indexed id, bool active);

    error SoulboundTransferNotAllowed();
    error SoulboundApprovalNotAllowed();
    error UnknownPointType();
    error InactivePointType();

    constructor(address admin, string memory uri_) ERC1155(uri_) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    // ------------------------------------------------------------ catalogo

    /**
     * @notice Cria uma classe de ponto. O id e escolhido pelo admin em vez de
     *         sequencial para que a numeracao carregue significado e continue
     *         previsivel entre redes: 1 = ponto da cidade, 2..6 = categorias,
     *         100+ = ponto proprio de loja.
     */
    function createPointType(uint256 id, bytes32 name, Scope scope, uint256 scopeId)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        pointTypes[id] = PointType({ name: name, scope: scope, scopeId: scopeId, active: true });
        emit PointTypeCreated(id, name, scope, scopeId);
    }

    function setPointTypeActive(uint256 id, bool active) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (pointTypes[id].name == bytes32(0)) revert UnknownPointType();
        pointTypes[id].active = active;
        emit PointTypeActiveSet(id, active);
    }

    // -------------------------------------------------------------- saldo

    function mint(address to, uint256 id, uint256 amount) external onlyRole(MINTER_ROLE) {
        PointType storage t = pointTypes[id];
        if (t.name == bytes32(0)) revert UnknownPointType();
        if (!t.active) revert InactivePointType();
        _mint(to, id, amount, "");
    }

    function burn(address from, uint256 id, uint256 amount) external onlyRole(BURNER_ROLE) {
        _burn(from, id, amount);
    }

    // ---------------------------------------------------------- soulbound

    /**
     * @dev Unico ponto por onde toda movimentacao do ERC1155 passa no OZ v5.
     *      Cunhar (from == 0) e queimar (to == 0) passam; transferir, nao.
     */
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values) internal override {
        if (from != address(0) && to != address(0)) revert SoulboundTransferNotAllowed();
        super._update(from, to, ids, values);
    }

    /// @dev Sem aprovacao: nao faz sentido autorizar terceiro a mover o que
    ///      nunca se move, e aprovacao pendurada so confunde carteira.
    function setApprovalForAll(address, bool) public pure override {
        revert SoulboundApprovalNotAllowed();
    }

    // ------------------------------------------- multiplas heranças

    function supportsInterface(bytes4 interfaceId) public view override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

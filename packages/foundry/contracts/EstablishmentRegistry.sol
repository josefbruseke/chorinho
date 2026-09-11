// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title EstablishmentRegistry
 * @notice Single source of truth for platform roles. The NFT contracts
 *         (DiscountNFT, BonusNFT) hold a reference to this registry and query
 *         it for authorization instead of managing their own role state.
 *
 *         Centralizing roles here means onboarding/offboarding a partner
 *         establishment (or rotating the relayer key) is a single transaction,
 *         and future contracts can plug into the same permission set.
 */
contract EstablishmentRegistry is AccessControl {
    /// @notice Partner establishments — allowed to redeem (burn) discount NFTs.
    bytes32 public constant ESTABLISHMENT_ROLE = keccak256("ESTABLISHMENT_ROLE");

    /// @notice Platform backend account — allowed to mint soulbound bonus NFTs.
    /// Created now (even though the backend is out of scope for this phase) so
    /// BonusNFT can ship with the correct authorization already wired.
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");

    // AccessControl already emits RoleGranted/RoleRevoked; these dedicated
    // events exist so an off-chain indexer can track the establishment list
    // without filtering generic role events by role hash.
    event EstablishmentAdded(address indexed account);
    event EstablishmentRemoved(address indexed account);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function addEstablishment(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(ESTABLISHMENT_ROLE, account);
        emit EstablishmentAdded(account);
    }

    function removeEstablishment(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(ESTABLISHMENT_ROLE, account);
        emit EstablishmentRemoved(account);
    }

    function isEstablishment(address account) external view returns (bool) {
        return hasRole(ESTABLISHMENT_ROLE, account);
    }

    function isRelayer(address account) external view returns (bool) {
        return hasRole(RELAYER_ROLE, account);
    }

    function isAdmin(address account) external view returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE, account);
    }

    // ------------------------------------------------- estabelecimentos

    /**
     * @notice Uma loja parceira. O conteudo (nome, foto, endereco) vive no
     *         Supabase; aqui fica so o que precisa ser provado: quem e o dono,
     *         se esta ativa, e um hash do registro off-chain para detectar
     *         adulteracao.
     */
    struct Establishment {
        address owner;
        bytes32 metadataHash;
        bool active;
        uint64 registeredAt;
    }

    mapping(uint256 id => Establishment) public establishments;

    /// @notice Loja que cada operador de PDV atende. Zero = nao opera nenhuma.
    mapping(address operator => uint256 establishmentId) public establishmentIdOf;

    /// @dev Comeca em 1 para que zero signifique "nenhuma loja" em establishmentIdOf.
    uint256 private _nextEstablishmentId = 1;

    event EstablishmentRegistered(uint256 indexed id, address indexed owner, bytes32 metadataHash);
    event EstablishmentMetadataSet(uint256 indexed id, bytes32 metadataHash);
    event EstablishmentActiveSet(uint256 indexed id, bool active);
    event OperatorAdded(uint256 indexed establishmentId, address indexed operator);
    event OperatorRemoved(uint256 indexed establishmentId, address indexed operator);

    error NotEstablishmentOwner();
    error UnknownEstablishment();
    error OperatorAlreadyBound();

    /// @notice Registra a loja na cadeia. So o admin — o cadastro passa por
    ///         aprovacao, e e a assinatura ativa que destrava a emissao.
    function registerEstablishment(address owner, bytes32 metadataHash)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        returns (uint256 id)
    {
        id = _nextEstablishmentId++;
        establishments[id] = Establishment({
            owner: owner, metadataHash: metadataHash, active: true, registeredAt: uint64(block.timestamp)
        });

        // Mantem compativel com DiscountNFT e BonusNFT, que perguntam
        // isEstablishment(address) sem saber de id.
        _grantRole(ESTABLISHMENT_ROLE, owner);
        emit EstablishmentAdded(owner);
        emit EstablishmentRegistered(id, owner, metadataHash);
    }

    function setEstablishmentMetadata(uint256 id, bytes32 metadataHash) external {
        _onlyOwnerOrAdmin(id);
        establishments[id].metadataHash = metadataHash;
        emit EstablishmentMetadataSet(id, metadataHash);
    }

    function setEstablishmentActive(uint256 id, bool active) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (establishments[id].owner == address(0)) revert UnknownEstablishment();
        establishments[id].active = active;
        emit EstablishmentActiveSet(id, active);
    }

    /// @notice Vincula um atendente a loja. Um operador atende uma loja so:
    ///         permitir varias abriria espaco para creditar carimbo no balcao
    ///         errado por descuido.
    function addOperator(uint256 establishmentId, address operator) external {
        _onlyOwnerOrAdmin(establishmentId);
        uint256 atual = establishmentIdOf[operator];
        if (atual != 0 && atual != establishmentId) revert OperatorAlreadyBound();
        establishmentIdOf[operator] = establishmentId;
        emit OperatorAdded(establishmentId, operator);
    }

    function removeOperator(address operator) external {
        uint256 id = establishmentIdOf[operator];
        if (id == 0) revert UnknownEstablishment();
        _onlyOwnerOrAdmin(id);
        delete establishmentIdOf[operator];
        emit OperatorRemoved(id, operator);
    }

    /// @notice Se `who` pode operar o balcao de `establishmentId`. O dono
    ///         tambem opera, sem precisar se cadastrar como operador.
    function isOperatorOf(address who, uint256 establishmentId) external view returns (bool) {
        if (establishmentId == 0) return false;
        return establishmentIdOf[who] == establishmentId || establishments[establishmentId].owner == who;
    }

    function isEstablishmentActive(uint256 id) external view returns (bool) {
        return establishments[id].active;
    }

    function ownerOfEstablishment(uint256 id) external view returns (address) {
        return establishments[id].owner;
    }

    function _onlyOwnerOrAdmin(uint256 id) private view {
        address owner = establishments[id].owner;
        if (owner == address(0)) revert UnknownEstablishment();
        if (msg.sender != owner && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) revert NotEstablishmentOwner();
    }
}

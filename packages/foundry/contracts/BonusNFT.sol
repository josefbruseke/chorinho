// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { ERC721URIStorage } from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import { ERC721Burnable } from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import { EstablishmentRegistry } from "./EstablishmentRegistry.sol";
import { StampLedger } from "./StampLedger.sol";

/**
 * @title BonusNFT
 * @notice Conquista intransferivel do cliente. Existe em duas formas:
 *
 *         - **Trilha**: completou um percurso pelo bairro (`mintBonus`).
 *         - **Tempo de casa**: a peca exclusiva daquela loja, que evolui de
 *           nivel conforme os carimbos de sempre se acumulam (`mintOrUpgrade`).
 *
 * Decisoes que valem destaque:
 *
 * - Soulbound no `_update`, unico ponto por onde toda movimentacao do OZ v5
 *   passa: cunhar (from == 0) e queimar (to == 0) passam, o resto reverte.
 *   `approve` e `setApprovalForAll` tambem revertem, para marketplace nao criar
 *   aprovacao pendurada de um token que nunca se move.
 *
 * - O dono pode queimar: token que nao se transfere e, no minimo, precisa poder
 *   ser descartado.
 *
 * - O relayer DISPARA a evolucao, mas nao e autoridade sobre ela: o contrato
 *   confere o total de carimbos no StampLedger antes de subir o nivel. Relayer
 *   comprometido nao consegue forjar tier.
 */
contract BonusNFT is ERC721URIStorage, ERC721Burnable {
    EstablishmentRegistry public immutable registry;

    /// @dev Mutavel para nao amarrar a ordem de deploy: o ledger e criado
    ///      depois, e exigi-lo no construtor obrigaria um deploy em duas fases.
    StampLedger public stampLedger;

    /// @dev Comeca em 1 para que `badgeOf` devolvendo zero signifique
    ///      inequivocamente "esta pessoa nao tem peca nesta loja".
    uint256 private _nextTokenId = 1;

    /// @notice Trilha que a insignia atesta. Zero quando e peca de tempo de casa.
    mapping(uint256 tokenId => uint256) public routeIdOf;

    /// @notice Loja da peca. Zero quando e trilha do bairro.
    mapping(uint256 tokenId => uint256) public establishmentIdOf;

    /// @notice Nivel atual da peca.
    mapping(uint256 tokenId => uint8) public tierOf;

    /// @notice A peca que cada cliente tem em cada loja. Uma so, que evolui.
    mapping(uint256 establishmentId => mapping(address customer => uint256 tokenId)) public badgeOf;

    /// @notice Carimbos de sempre exigidos por nivel, definidos pela loja.
    mapping(uint256 establishmentId => uint256[6] thresholds) public tierThresholds;

    uint8 public constant MAX_TIER = 5;

    event BonusMinted(uint256 indexed tokenId, address indexed to, uint256 indexed routeId);
    event BadgeMinted(uint256 indexed tokenId, uint256 indexed establishmentId, address indexed to, uint8 tier);
    event BadgeUpgraded(uint256 indexed tokenId, uint8 fromTier, uint8 toTier);
    event TierThresholdsSet(uint256 indexed establishmentId, uint256[6] thresholds);
    event StampLedgerSet(address indexed ledger);

    error NotRelayer();
    error NotAdmin();
    error NotEstablishmentOwner();
    error SoulboundTransferNotAllowed();
    error SoulboundApprovalNotAllowed();
    error InvalidTier();
    error TierNotEarned(uint256 lifetimeStamps, uint256 required);
    error NotAnUpgrade(uint8 currentTier, uint8 requestedTier);
    error LedgerNotSet();

    constructor(EstablishmentRegistry _registry) ERC721("Chorinho Bonus", "CHORB") {
        registry = _registry;
    }

    // ------------------------------------------------------------ ajustes

    function setStampLedger(StampLedger ledger) external {
        if (!registry.isAdmin(msg.sender)) revert NotAdmin();
        stampLedger = ledger;
        emit StampLedgerSet(address(ledger));
    }

    /// @notice Quantos carimbos de sempre cada nivel exige nesta loja.
    ///         Indice 0 e ignorado: nivel zero e nao ter peca nenhuma.
    function setTierThresholds(uint256 establishmentId, uint256[6] calldata thresholds) external {
        if (registry.ownerOfEstablishment(establishmentId) != msg.sender && !registry.isAdmin(msg.sender)) {
            revert NotEstablishmentOwner();
        }
        tierThresholds[establishmentId] = thresholds;
        emit TierThresholdsSet(establishmentId, thresholds);
    }

    // ------------------------------------------------------------ trilhas

    /// @notice Insignia de trilha concluida. O progresso e apurado fora da
    ///         cadeia; o relayer cunha quando fecha.
    function mintBonus(address to, uint256 routeId, string calldata uri) external returns (uint256 tokenId) {
        if (!registry.isRelayer(msg.sender)) revert NotRelayer();

        tokenId = _nextTokenId++;

        // Estado ANTES do _safeMint. Ele chama onERC721Received no destinatario,
        // que e chamada externa: gravar depois abre janela de reentrancia --
        // o mesmo buraco que derrubou o HypeBears em 2022.
        routeIdOf[tokenId] = routeId;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        emit BonusMinted(tokenId, to, routeId);
    }

    // -------------------------------------------------- tempo de casa

    /**
     * @notice Cunha a peca da loja ou sobe o nivel dela.
     * @dev O relayer dispara, mas quem decide e o contrato: o nivel so sobe se
     *      os carimbos de sempre no StampLedger alcancarem o limite que a loja
     *      configurou. Isso tira do relayer o poder de forjar conquista.
     */
    function mintOrUpgrade(uint256 establishmentId, address to, uint8 tier, string calldata uri)
        external
        returns (uint256 tokenId)
    {
        if (!registry.isRelayer(msg.sender)) revert NotRelayer();
        if (tier == 0 || tier > MAX_TIER) revert InvalidTier();
        if (address(stampLedger) == address(0)) revert LedgerNotSet();

        uint256 exigido = tierThresholds[establishmentId][tier];
        uint256 conquistado = stampLedger.lifetimeStampsOf(establishmentId, to);
        if (conquistado < exigido) revert TierNotEarned(conquistado, exigido);

        tokenId = badgeOf[establishmentId][to];

        if (tokenId == 0) {
            // Primeira peca desta loja para esta pessoa.
            tokenId = _nextTokenId++;

            // Tudo gravado antes do _safeMint, pelo mesmo motivo de sempre.
            establishmentIdOf[tokenId] = establishmentId;
            tierOf[tokenId] = tier;
            badgeOf[establishmentId][to] = tokenId;

            _safeMint(to, tokenId);
            _setTokenURI(tokenId, uri);

            emit BadgeMinted(tokenId, establishmentId, to, tier);
        } else {
            uint8 atual = tierOf[tokenId];
            if (tier <= atual) revert NotAnUpgrade(atual, tier);

            tierOf[tokenId] = tier;
            _setTokenURI(tokenId, uri);

            // _setTokenURI ja emite MetadataUpdate (ERC-4906), que e o que
            // manda carteira e marketplace recarregarem a arte do novo nivel.
            emit BadgeUpgraded(tokenId, atual, tier);
        }
    }

    // ------------------------------------------------------------ leitura

    function tierDoCliente(uint256 establishmentId, address customer) external view returns (uint8) {
        return tierOf[badgeOf[establishmentId][customer]];
    }

    // ---------------------------------------------------------- soulbound

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

    // ------------------------------------------- multiplas heranças

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        // 0x49064906 e o ERC-4906, que anuncia MetadataUpdate.
        return interfaceId == 0x49064906 || super.supportsInterface(interfaceId);
    }
}

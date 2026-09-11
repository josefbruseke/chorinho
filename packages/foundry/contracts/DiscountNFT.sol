// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ERC1155 } from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import { ERC1155Supply } from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import { DiscountProgram } from "./DiscountProgram.sol";
import { EstablishmentRegistry } from "./EstablishmentRegistry.sol";

/**
 * @title DiscountNFT
 * @notice A peca colecionavel da loja. Cada tokenId e uma peca: uma tiragem
 *         fechada, com tempo de vida proprio, que aciona um programa de
 *         desconto.
 *
 *         E a UNICA coisa neste sistema que se transfere. Carimbo, ponto e selo
 *         de conquista sao pessoais -- eles provam que VOCE esteve la, e vender
 *         isso destruiria o que significam. Ja um desconto que voce nao vai
 *         usar vale para outra pessoa, e o cupom morto deixa de ser lixo.
 *
 * Decisoes que valem explicacao:
 *
 * - **A peca nao carrega regra.** Percentual, teto, produto e em quais lojas
 *   vale moram no DiscountProgram. A loja ajusta o programa e todas as pecas ja
 *   emitidas acompanham, sem reemitir nada.
 *
 * - **`level` e o "valor" da peca** dentro do programa: bronze 1, ouro 3. O
 *   desconto e a base do programa vezes o nivel, limitado pelo teto. Assim uma
 *   colecao inteira sai de um programa so.
 *
 * - **Nao existe compra com dinheiro.** A peca se obtem gastando os proprios
 *   carimbos (pelo RewardCatalog) ou conquistando (pelo Achievements). Aceitar
 *   ETH aqui obrigaria a responder para quem vai o dinheiro, e a resposta do
 *   produto e "nenhum dinheiro flui para os comerciantes atraves de nos".
 *
 * - **`maxPerWallet` conta unidades cunhadas, nao possuidas** -- a peca e
 *   transferivel de proposito, entao um teto por posse seria burlado num
 *   toque. Ele existe para uma carteira nao varrer a tiragem inteira.
 */
contract DiscountNFT is ERC1155Supply {
    struct PieceParams {
        /// @notice O programa cujas regras esta peca aciona.
        uint256 programId;
        /// @notice O nivel da peca dentro do programa. 1 = beneficio base.
        uint256 level;
        /// @notice A tiragem. 0 = sem limite -- mas exclusividade e o ponto,
        ///         entao o painel sempre sugere um numero.
        uint256 maxSupply;
        /// @notice Tempo de vida da peca. 0 = sem limite daquele lado.
        uint64 startTime;
        uint64 endTime;
        uint256 maxPerWallet;
        string uri;
    }

    struct Piece {
        uint256 programId;
        uint256 level;
        uint256 maxSupply;
        uint64 startTime;
        uint64 endTime;
        uint256 maxPerWallet;
        bool active;
        bool exists;
        string uri;
    }

    EstablishmentRegistry public immutable registry;
    DiscountProgram public immutable programs;

    mapping(uint256 tokenId => Piece) private _pieces;
    mapping(uint256 tokenId => mapping(address wallet => uint256)) public mintedBy;

    /// @dev O ERC1155 nao enumera. Este array deixa a vitrine carregar a
    ///      colecao inteira numa chamada so, em vez de varrer eventos. So
    ///      cresce: peca nunca e apagada, so desativada.
    uint256[] private _pieceIds;

    event PieceCreated(uint256 indexed tokenId, uint256 indexed programId, uint256 level, uint256 maxSupply);
    event PieceActiveSet(uint256 indexed tokenId, bool active);
    event PieceUriSet(uint256 indexed tokenId, string uri);
    event PieceMinted(uint256 indexed tokenId, address indexed to, uint256 amount, address indexed minter);
    /// @param redemptionRef referencia opaca gerada fora da cadeia, ligando esta
    ///        queima a um atendimento concreto.
    event PieceUsed(
        uint256 indexed tokenId,
        address indexed user,
        uint256 indexed establishmentId,
        uint256 amount,
        bytes32 redemptionRef
    );

    error NotAllowedToMint();
    error NotOperator();
    error NotEstablishmentOwner();
    error PieceAlreadyExists(uint256 tokenId);
    error UnknownPiece(uint256 tokenId);
    error PieceNotActive(uint256 tokenId);
    error PieceNotStarted(uint256 tokenId, uint64 startTime);
    error PieceExpired(uint256 tokenId, uint64 endTime);
    error MaxSupplyExceeded(uint256 tokenId, uint256 requested, uint256 available);
    error MaxPerWalletExceeded(uint256 tokenId, uint256 requested, uint256 remaining);
    error UnknownProgram();
    error InvalidLevel();
    error InvalidWindow();
    error NotValidHere(uint256 tokenId, uint256 establishmentId);
    error ZeroAmount();

    /// @dev A URI base fica vazia: `uri()` devolve a de cada peca.
    constructor(EstablishmentRegistry _registry, DiscountProgram _programs) ERC1155("") {
        registry = _registry;
        programs = _programs;
    }

    // ------------------------------------------------------------ catalogo

    /**
     * @notice Cria uma peca de um programa.
     * @dev Quem pode e o dono do estabelecimento que criou o programa, ou o
     *      admin da plataforma. Nao e mais so o admin: a colecao e da loja.
     */
    function createPiece(uint256 tokenId, PieceParams calldata p) external {
        if (_pieces[tokenId].exists) revert PieceAlreadyExists(tokenId);
        if (!programs.programExists(p.programId)) revert UnknownProgram();
        if (p.level == 0) revert InvalidLevel();
        if (p.endTime != 0 && p.endTime <= p.startTime) revert InvalidWindow();

        _onlyProgramOwnerOrAdmin(p.programId);

        _pieces[tokenId] = Piece({
            programId: p.programId,
            level: p.level,
            maxSupply: p.maxSupply,
            startTime: p.startTime,
            endTime: p.endTime,
            maxPerWallet: p.maxPerWallet,
            active: true,
            exists: true,
            uri: p.uri
        });
        _pieceIds.push(tokenId);

        emit PieceCreated(tokenId, p.programId, p.level, p.maxSupply);
        emit URI(p.uri, tokenId);
    }

    function setPieceActive(uint256 tokenId, bool active) external {
        Piece storage piece = _pieces[tokenId];
        if (!piece.exists) revert UnknownPiece(tokenId);
        _onlyProgramOwnerOrAdmin(piece.programId);

        piece.active = active;
        emit PieceActiveSet(tokenId, active);
    }

    function setPieceUri(uint256 tokenId, string calldata newUri) external {
        Piece storage piece = _pieces[tokenId];
        if (!piece.exists) revert UnknownPiece(tokenId);
        _onlyProgramOwnerOrAdmin(piece.programId);

        piece.uri = newUri;
        emit PieceUriSet(tokenId, newUri);
        emit URI(newUri, tokenId);
    }

    // -------------------------------------------------------------- emitir

    /**
     * @notice Entrega a peca a alguem.
     * @dev So os contratos que sabem por que ela foi merecida: o RewardCatalog
     *      (o cliente gastou os proprios carimbos) e o Achievements (o cliente
     *      bateu um criterio). Os dois recebem RELAYER_ROLE no deploy. O
     *      proprio relayer da plataforma tambem passa, para o caminho em que o
     *      servidor atesta uma venda avulsa.
     */
    function mintTo(address to, uint256 tokenId, uint256 amount) external {
        if (!registry.isRelayer(msg.sender)) revert NotAllowedToMint();
        if (amount == 0) revert ZeroAmount();

        Piece storage piece = _pieces[tokenId];
        if (!piece.exists) revert UnknownPiece(tokenId);
        if (!piece.active) revert PieceNotActive(tokenId);
        if (piece.startTime != 0 && block.timestamp < piece.startTime) {
            revert PieceNotStarted(tokenId, piece.startTime);
        }
        if (piece.endTime != 0 && block.timestamp > piece.endTime) revert PieceExpired(tokenId, piece.endTime);

        if (piece.maxSupply != 0) {
            uint256 available = piece.maxSupply - totalSupply(tokenId);
            if (amount > available) revert MaxSupplyExceeded(tokenId, amount, available);
        }
        if (piece.maxPerWallet != 0) {
            uint256 remaining = piece.maxPerWallet - mintedBy[tokenId][to];
            if (amount > remaining) revert MaxPerWalletExceeded(tokenId, amount, remaining);
        }

        mintedBy[tokenId][to] += amount;
        _mint(to, tokenId, amount, "");
        emit PieceMinted(tokenId, to, amount, msg.sender);
    }

    // ---------------------------------------------------------------- usar

    /**
     * @notice Queima a peca no balcao, em troca do desconto.
     * @dev Duas condicoes, e as duas importam. Quem chama precisa operar
     *      AQUELA loja (ou ser o relayer), e o programa da peca precisa valer
     *      nela. A segunda e o que sustenta a pool: uma loja que nao aceitou o
     *      convite nao e obrigada a honrar a peca da vizinha.
     *
     *      Nao ha conferencia da janela de emissao aqui: o tempo de vida
     *      governa a EMISSAO, e honrar uma peca vencida e decisao de balcao.
     *      O que vale e o programa estar valendo agora, e isso `validAt` diz.
     */
    function usePiece(address user, uint256 tokenId, uint256 establishmentId, uint256 amount, bytes32 redemptionRef)
        external
    {
        if (amount == 0) revert ZeroAmount();
        Piece storage piece = _pieces[tokenId];
        if (!piece.exists) revert UnknownPiece(tokenId);

        if (!registry.isOperatorOf(msg.sender, establishmentId) && !registry.isRelayer(msg.sender)) {
            revert NotOperator();
        }
        if (!programs.validAt(piece.programId, establishmentId)) revert NotValidHere(tokenId, establishmentId);

        _burn(user, tokenId, amount);
        emit PieceUsed(tokenId, user, establishmentId, amount, redemptionRef);
    }

    // ------------------------------------------------------------- leitura

    /// @notice Quanto esta peca desconta numa conta de `billCents`. E o numero
    ///         que o atendente le pronto, sem fazer conta de cabeca.
    function discountFor(uint256 tokenId, uint256 billCents) external view returns (uint256) {
        Piece storage piece = _pieces[tokenId];
        if (!piece.exists) return 0;
        return programs.discountFor(piece.programId, piece.level, billCents);
    }

    function getPiece(uint256 tokenId) external view returns (Piece memory) {
        if (!_pieces[tokenId].exists) revert UnknownPiece(tokenId);
        return _pieces[tokenId];
    }

    function pieceExists(uint256 tokenId) external view returns (bool) {
        return _pieces[tokenId].exists;
    }

    function getPieceIds() external view returns (uint256[] memory) {
        return _pieceIds;
    }

    /// @notice Tudo o que a vitrine precisa numa chamada: ids, pecas e quantas
    ///         ja sairam de cada tiragem. Sem paginacao -- sao dezenas, e e
    ///         view.
    function getAllPieces()
        external
        view
        returns (uint256[] memory ids, Piece[] memory pieces, uint256[] memory minted)
    {
        ids = _pieceIds;
        uint256 len = ids.length;
        pieces = new Piece[](len);
        minted = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            pieces[i] = _pieces[ids[i]];
            minted[i] = totalSupply(ids[i]);
        }
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        return _pieces[tokenId].uri;
    }

    function _onlyProgramOwnerOrAdmin(uint256 programId) private view {
        uint256 dono = programs.getProgram(programId).ownerEstablishmentId;
        if (registry.ownerOfEstablishment(dono) != msg.sender && !registry.isAdmin(msg.sender)) {
            revert NotEstablishmentOwner();
        }
    }
}

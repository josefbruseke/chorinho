// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { EstablishmentRegistry } from "./EstablishmentRegistry.sol";

/**
 * @title DiscountProgram
 * @notice A regra de desconto com nome, criada pela loja: "Clube da Manha --
 *         15%, ate as 11h, so cafes".
 *
 *         As pecas colecionaveis (DiscountNFT) nao carregam regra nenhuma:
 *         elas apontam para um programa daqui e trazem so o proprio nivel. Foi
 *         de proposito -- a loja muda o teto ou a validade do programa e todas
 *         as pecas ja emitidas acompanham, sem precisar reemitir coisa alguma.
 *
 * @dev Um programa pode ser de uma loja so ou CONJUNTO, valendo numa lista de
 *      estabelecimentos. A lista se monta por convite e aceite: a peca so vale
 *      onde a loja disse que sim. Sem isso, uma loja poderia obrigar a vizinha
 *      a dar desconto sem ela saber -- e o primeiro lojista a descobrir isso
 *      nunca mais confia na plataforma.
 */
contract DiscountProgram {
    /// @notice Percentual desconta uma fracao da conta; ValorFixo desconta um
    ///         numero de centavos, aconteca o que acontecer com o total.
    enum DiscountKind {
        Percentual,
        ValorFixo
    }

    /// @notice O estado de uma loja dentro de um programa conjunto. `Saiu` e
    ///         diferente de `Nenhuma` de proposito: quem saiu ja esteve dentro,
    ///         e o convite nao precisa ser refeito do zero.
    enum Membership {
        Nenhuma,
        Convidada,
        Aceita,
        Saiu
    }

    struct Program {
        /// @notice Quem criou e manda no programa.
        uint256 ownerEstablishmentId;
        bytes32 name;
        DiscountKind kind;
        /// @notice Em pontos-base quando Percentual (1500 = 15%), em centavos
        ///         quando ValorFixo. O beneficio real e este numero vezes o
        ///         nivel da peca.
        uint256 baseBenefit;
        /// @notice Teto do desconto em centavos. Zero = sem teto. Existe para o
        ///         percentual: 20% de uma conta de mil reais sem teto e um
        ///         prejuizo que o lojista nao viu chegando.
        uint256 capCents;
        /// @notice Hash do produto a que o desconto se aplica. Zero = a loja
        ///         inteira.
        bytes32 product;
        uint64 startTime;
        uint64 endTime;
        /// @notice Se aceita outras lojas por convite.
        bool joint;
        bool active;
        bool exists;
        /// @notice Hash do registro no Supabase, para detectar adulteracao.
        bytes32 metadataHash;
    }

    /// @dev Teto absoluto do percentual: cem por cento. Nivel de peca alto num
    ///      programa generoso chegaria a descontar mais que a conta.
    uint256 public constant BPS_DENOMINATOR = 10_000;

    EstablishmentRegistry public immutable registry;

    mapping(uint256 programId => Program) private _programs;
    mapping(uint256 programId => mapping(uint256 establishmentId => Membership)) public membershipOf;

    /// @dev So cresce. Quem sai continua na lista, com `membershipOf` dizendo a
    ///      verdade -- e o front filtra. Compactar array para economizar
    ///      leitura de view nao vale o gas de escrita.
    mapping(uint256 programId => uint256[]) private _members;

    uint256 private _nextProgramId = 1;

    event ProgramCreated(uint256 indexed programId, uint256 indexed ownerEstablishmentId, bytes32 name, bool joint);
    event ProgramActiveSet(uint256 indexed programId, bool active);
    event EstablishmentInvited(uint256 indexed programId, uint256 indexed establishmentId);
    event EstablishmentJoined(uint256 indexed programId, uint256 indexed establishmentId);
    event EstablishmentLeft(uint256 indexed programId, uint256 indexed establishmentId);

    error NotEstablishmentOwner();
    error UnknownProgram();
    error UnknownEstablishment();
    error ProgramIsNotJoint();
    error AlreadyAMember();
    error NotInvited();
    error NotAMember();
    error InvalidBenefit();
    error InvalidWindow();

    constructor(EstablishmentRegistry _registry) {
        registry = _registry;
    }

    // ------------------------------------------------------------ programa

    function createProgram(
        uint256 ownerEstablishmentId,
        bytes32 name,
        DiscountKind kind,
        uint256 baseBenefit,
        uint256 capCents,
        bytes32 product,
        uint64 startTime,
        uint64 endTime,
        bool joint,
        bytes32 metadataHash
    ) external returns (uint256 programId) {
        _onlyOwnerOrAdmin(ownerEstablishmentId);

        // Programa que nao desconta nada nao e programa.
        if (baseBenefit == 0) revert InvalidBenefit();
        if (kind == DiscountKind.Percentual && baseBenefit > BPS_DENOMINATOR) revert InvalidBenefit();
        if (endTime != 0 && endTime <= startTime) revert InvalidWindow();

        programId = _nextProgramId++;
        _programs[programId] = Program({
            ownerEstablishmentId: ownerEstablishmentId,
            name: name,
            kind: kind,
            baseBenefit: baseBenefit,
            capCents: capCents,
            product: product,
            startTime: startTime,
            endTime: endTime,
            joint: joint,
            active: true,
            exists: true,
            metadataHash: metadataHash
        });

        // Quem cria ja esta dentro. Assim `validAt` nao precisa de um ramo
        // separado para o dono, e programa de uma loja so e apenas um programa
        // conjunto que nunca convidou ninguem.
        membershipOf[programId][ownerEstablishmentId] = Membership.Aceita;
        _members[programId].push(ownerEstablishmentId);

        emit ProgramCreated(programId, ownerEstablishmentId, name, joint);
        emit EstablishmentJoined(programId, ownerEstablishmentId);
    }

    function setProgramActive(uint256 programId, bool active) external {
        Program storage p = _programs[programId];
        if (!p.exists) revert UnknownProgram();
        _onlyOwnerOrAdmin(p.ownerEstablishmentId);

        p.active = active;
        emit ProgramActiveSet(programId, active);
    }

    // ------------------------------------------------------------- a pool

    function invite(uint256 programId, uint256 establishmentId) external {
        Program storage p = _programs[programId];
        if (!p.exists) revert UnknownProgram();
        if (!p.joint) revert ProgramIsNotJoint();
        _onlyOwnerOrAdmin(p.ownerEstablishmentId);
        if (registry.ownerOfEstablishment(establishmentId) == address(0)) revert UnknownEstablishment();

        Membership atual = membershipOf[programId][establishmentId];
        if (atual == Membership.Aceita || atual == Membership.Convidada) revert AlreadyAMember();

        membershipOf[programId][establishmentId] = Membership.Convidada;
        emit EstablishmentInvited(programId, establishmentId);
    }

    /**
     * @notice A loja convidada entra na pool.
     * @dev Quem chama e o dono ou o gerente da loja CONVIDADA, nunca o dono do
     *      programa. E este o ponto em que o desconto deixa de ser imposicao e
     *      vira acordo.
     */
    function acceptInvite(uint256 programId, uint256 establishmentId) external {
        if (!_programs[programId].exists) revert UnknownProgram();
        _onlyOwnerOrAdmin(establishmentId);
        if (membershipOf[programId][establishmentId] != Membership.Convidada) revert NotInvited();

        membershipOf[programId][establishmentId] = Membership.Aceita;
        _members[programId].push(establishmentId);
        emit EstablishmentJoined(programId, establishmentId);
    }

    /**
     * @notice A loja sai da pool.
     * @dev Vale dali em diante: peca apresentada depois disso nao e mais aceita
     *      nela. Honrar indefinidamente o que ja foi emitido seria prender o
     *      lojista num acordo do qual ele quer sair -- e a tela do cliente
     *      mostra em quais lojas a peca ainda vale, entao ninguem descobre no
     *      balcao.
     */
    function leaveProgram(uint256 programId, uint256 establishmentId) external {
        Program storage p = _programs[programId];
        if (!p.exists) revert UnknownProgram();
        _onlyOwnerOrAdmin(establishmentId);
        if (membershipOf[programId][establishmentId] != Membership.Aceita) revert NotAMember();

        membershipOf[programId][establishmentId] = Membership.Saiu;
        emit EstablishmentLeft(programId, establishmentId);
    }

    // ------------------------------------------------------------- leitura

    /// @notice Se uma peca deste programa pode ser usada nesta loja, agora. E o
    ///         que o balcao consulta antes de aceitar a peca.
    function validAt(uint256 programId, uint256 establishmentId) external view returns (bool) {
        Program storage p = _programs[programId];
        if (!p.exists || !p.active) return false;
        if (p.startTime != 0 && block.timestamp < p.startTime) return false;
        if (p.endTime != 0 && block.timestamp > p.endTime) return false;
        return membershipOf[programId][establishmentId] == Membership.Aceita;
    }

    /**
     * @notice Quanto uma peca de nivel `level` desconta numa conta de
     *         `billCents`.
     * @dev O desconto nunca passa da conta nem do teto do programa. Devolver
     *      centavos, e nao percentual, tira do balcao a chance de errar a
     *      conta: o atendente le o numero pronto.
     */
    function discountFor(uint256 programId, uint256 level, uint256 billCents) external view returns (uint256) {
        Program storage p = _programs[programId];
        if (!p.exists || level == 0 || billCents == 0) return 0;

        uint256 desconto = p.kind == DiscountKind.Percentual
            ? (billCents * p.baseBenefit * level) / BPS_DENOMINATOR
            : p.baseBenefit * level;

        if (p.capCents != 0 && desconto > p.capCents) desconto = p.capCents;
        return desconto > billCents ? billCents : desconto;
    }

    function getProgram(uint256 programId) external view returns (Program memory) {
        if (!_programs[programId].exists) revert UnknownProgram();
        return _programs[programId];
    }

    function programExists(uint256 programId) external view returns (bool) {
        return _programs[programId].exists;
    }

    /// @notice Todas as lojas que ja passaram pela pool. O estado de cada uma
    ///         vem de `membershipOf` -- quem saiu continua aqui.
    function membersOf(uint256 programId) external view returns (uint256[] memory) {
        return _members[programId];
    }

    function _onlyOwnerOrAdmin(uint256 establishmentId) private view {
        if (registry.ownerOfEstablishment(establishmentId) != msg.sender && !registry.isAdmin(msg.sender)) {
            revert NotEstablishmentOwner();
        }
    }
}

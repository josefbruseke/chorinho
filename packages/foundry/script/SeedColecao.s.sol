// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { Achievements } from "../contracts/Achievements.sol";
import { DiscountNFT } from "../contracts/DiscountNFT.sol";
import { DiscountProgram } from "../contracts/DiscountProgram.sol";
import { RewardCatalog } from "../contracts/RewardCatalog.sol";

/**
 * @notice Poe no ar uma colecao de verdade, para a demonstracao ter o que
 *         mostrar sem ninguem cadastrar nada a mao.
 *
 *         Monta os tres gatilhos de uma peca, que e o que precisa ser visto:
 *         o DIRETO (troca por carimbos, recompensa 11), a CONQUISTA (voltar
 *         tres vezes) e o programa CONJUNTO entre o cafe e as vizinhas, que so
 *         vale onde houve aceite.
 *
 *         Ids fixos, na mesma ordem, para o espelho no Supabase ser escrito sem
 *         adivinhacao. Idempotente: o que ja existe e pulado.
 *
 *         Uso: bun run seed:colecao   (depois do seed:balcao)
 */
contract SeedColecao is Script {
    /// @dev Ids que o SeedBalcao registra, em ordem alfabetica de nome.
    uint256 constant CAFE = 3;
    uint256 constant LIVRARIA = 6;
    uint256 constant PADARIA = 7;

    uint256 constant PROGRAMA_CLUBE = 1;
    uint256 constant PROGRAMA_ROTA = 2;

    uint256 constant PECA_BRONZE = 1;
    uint256 constant PECA_OURO = 2;
    uint256 constant PECA_ROTA = 3;

    function run() external {
        DiscountProgram programs = DiscountProgram(_deployedAddress("DiscountProgram"));
        DiscountNFT discount = DiscountNFT(_deployedAddress("DiscountNFT"));
        RewardCatalog catalog = RewardCatalog(_deployedAddress("RewardCatalog"));
        Achievements achievements = Achievements(_deployedAddress("Achievements"));

        vm.startBroadcast();

        // ------------------------------------------------------- programas

        if (!programs.programExists(PROGRAMA_CLUBE)) {
            programs.createProgram(
                CAFE,
                "Clube da Manha",
                DiscountProgram.DiscountKind.Percentual,
                1000, // 10% por nivel
                2000, // teto de R$ 20 -- sem ele, uma conta grande vira prejuizo
                bytes32(0), // vale na loja toda
                0,
                0,
                false,
                keccak256("clube-da-manha")
            );
            console.log("Programa 1: Clube da Manha, no Cafe do Bairro");
        }

        if (!programs.programExists(PROGRAMA_ROTA)) {
            programs.createProgram(
                CAFE,
                "Rota da Vila",
                DiscountProgram.DiscountKind.ValorFixo,
                500, // R$ 5 por nivel
                0,
                bytes32(0),
                0,
                0,
                true, // conjunto: aceita vizinhas
                keccak256("rota-da-vila")
            );

            // A padaria aceita; a livraria e convidada e NAO aceita. E de
            // proposito: a demonstracao precisa mostrar a peca sendo recusada
            // em quem nao entrou na pool.
            programs.invite(PROGRAMA_ROTA, PADARIA);
            programs.acceptInvite(PROGRAMA_ROTA, PADARIA);
            programs.invite(PROGRAMA_ROTA, LIVRARIA);
            console.log("Programa 2: Rota da Vila, com a Padaria dentro e a Livraria so convidada");
        }

        // ----------------------------------------------------------- pecas

        if (!discount.pieceExists(PECA_BRONZE)) {
            discount.createPiece(PECA_BRONZE, _peca(PROGRAMA_CLUBE, 1, 50, 0, "Bronze do Clube"));
            console.log("Peca 1: Bronze do Clube -- 10%, tiragem de 50");
        }

        if (!discount.pieceExists(PECA_OURO)) {
            // Nivel 3 no mesmo programa: 30%, mas o teto de R$ 20 continua
            // valendo. E assim que uma colecao inteira sai de um programa so.
            discount.createPiece(PECA_OURO, _peca(PROGRAMA_CLUBE, 3, 10, 1, "Ouro do Clube"));
            console.log("Peca 2: Ouro do Clube -- 30% ate o teto, tiragem de 10");
        }

        if (!discount.pieceExists(PECA_ROTA)) {
            discount.createPiece(PECA_ROTA, _peca(PROGRAMA_ROTA, 1, 100, 0, "Rota da Vila"));
            console.log("Peca 3: Rota da Vila -- R$ 5 em qualquer loja da pool");
        }

        // ----------------------------------- o gatilho direto: troca por selo

        (uint256 lojaDaRecompensa,,,,,,,,,,) = catalog.rewards(11);
        if (lojaDaRecompensa == 0) {
            catalog.createReward(CAFE, 10, 1, 0, 0, 0, 0, PECA_BRONZE, keccak256("troca-bronze"));
            console.log("Recompensa 11: 10 carimbos viram a peca de bronze");
        }

        // ------------------------------------------------------ conquistas

        if (!achievements.achievementExists(1)) {
            achievements.createAchievement(
                CAFE,
                Achievements.Criterion.Visits,
                3,
                0,
                0,
                0,
                PECA_BRONZE,
                true,
                0,
                "https://chorinho.app/nft/selo/1.json",
                keccak256("tres-visitas")
            );
            console.log("Conquista 1: voltar tres vezes -- selo e peca de bronze");
        }

        if (!achievements.achievementExists(2)) {
            achievements.createAchievement(
                CAFE,
                Achievements.Criterion.LifetimeStamps,
                25,
                0,
                0,
                0,
                PECA_OURO,
                true,
                0,
                "https://chorinho.app/nft/selo/2.json",
                keccak256("vinte-e-cinco-carimbos")
            );
            console.log("Conquista 2: 25 carimbos de sempre -- selo e peca de ouro");
        }

        vm.stopBroadcast();
        console.log("Colecao no ar.");
    }

    function _peca(uint256 programId, uint256 level, uint256 maxSupply, uint256 maxPerWallet, string memory nome)
        private
        pure
        returns (DiscountNFT.PieceParams memory p)
    {
        p.programId = programId;
        p.level = level;
        p.maxSupply = maxSupply;
        p.maxPerWallet = maxPerWallet;
        p.uri = string.concat("https://chorinho.app/nft/peca/", nome, ".json");
    }

    function _deployedAddress(string memory contractName) internal view returns (address) {
        string memory path = string.concat(vm.projectRoot(), "/deployments/", vm.toString(block.chainid), ".json");
        string memory json = vm.readFile(path);
        string[] memory keys = vm.parseJsonKeys(json, "$");
        for (uint256 i = 0; i < keys.length; i++) {
            if (keccak256(bytes(keys[i])) == keccak256(bytes("networkName"))) continue;
            string memory name = vm.parseJsonString(json, string.concat(".", keys[i]));
            if (keccak256(bytes(name)) == keccak256(bytes(contractName))) {
                return vm.parseAddress(keys[i]);
            }
        }
        revert(string.concat(contractName, " not found in deployments json; run `bun run deploy` first"));
    }
}

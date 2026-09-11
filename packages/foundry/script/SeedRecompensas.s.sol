// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { RewardCatalog } from "../contracts/RewardCatalog.sol";

/**
 * @notice Poe recompensas de verdade no catalogo local.
 *
 *         A ordem e fixa: o id 1 e sempre a barba da Navalha de Ouro, em
 *         qualquer maquina. E isso que deixa o espelho no Supabase ser escrito
 *         sem adivinhacao.
 *
 *         Idempotente: recompensa que ja existe e pulada.
 *
 *         Uso: bun seed:recompensas   (depois de `bun run seed:balcao`)
 */
contract SeedRecompensas is Script {
    uint256 constant PONTO_CIDADE = 1;

    struct Oferta {
        uint256 loja;
        uint256 selos;
        uint256 pontos;
        string titulo;
    }

    function run() external {
        RewardCatalog catalog = RewardCatalog(_deployedAddress("RewardCatalog"));

        Oferta[10] memory ofertas = [
            Oferta(1, 8, 0, "Barba alinhada de cortesia"),
            Oferta(2, 10, 0, "Revisao completa da bicicleta"),
            Oferta(3, 5, 0, "Cafe coado com pao de queijo"),
            Oferta(3, 0, 500, "Combo do bairro (pontos da cidade)"),
            Oferta(4, 10, 0, "Queijo minas artesanal, 200g"),
            Oferta(5, 6, 0, "Aula avulsa de yoga"),
            Oferta(6, 15, 0, "Livro da selecao da casa"),
            Oferta(7, 4, 0, "Pao na chapa com cafe"),
            Oferta(8, 9, 0, "Cesta de frutas da estacao"),
            Oferta(3, 12, 0, "Almoco do dia")
        ];

        vm.startBroadcast();

        for (uint256 i = 0; i < ofertas.length; i++) {
            uint256 id = i + 1;
            (uint256 lojaExistente,,,,,,,,,) = catalog.rewards(id);
            if (lojaExistente != 0) continue;

            Oferta memory o = ofertas[i];
            catalog.createReward(
                o.loja,
                o.selos,
                PONTO_CIDADE,
                o.pontos,
                0,
                0,
                // Sem teto de estoque na demonstracao: limite de resgate e
                // decisao comercial de cada loja, nao do seed.
                0,
                keccak256(bytes(o.titulo))
            );
            console.log("Recompensa criada:", id, o.titulo);
        }

        vm.stopBroadcast();
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
        revert(string.concat(contractName, " not found in deployments json; run `bun deploy` first"));
    }
}

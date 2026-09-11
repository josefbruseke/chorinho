// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { EstablishmentRegistry } from "../contracts/EstablishmentRegistry.sol";
import { StampLedger } from "../contracts/StampLedger.sol";
import { SubscriptionManager } from "../contracts/SubscriptionManager.sol";

/**
 * @notice Deixa o balcao local pronto para operar.
 *
 *         Registra as oito lojas de demonstracao na cadeia, liga a assinatura
 *         de cada uma e configura a regra de carimbos. Os ids saem em ordem
 *         alfabetica de nome, a mesma ordem usada para gravar `onchain_id` no
 *         Supabase — assim o id 3 e sempre o Cafe do Bairro, em qualquer
 *         maquina.
 *
 *         Idempotente: rodar de novo nao duplica loja nenhuma.
 *
 *         Uso: bun seed:balcao   (cadeia no ar e contratos implantados antes)
 */
contract SeedBalcao is Script {
    /// @dev Conta #1 do anvil. E a "dona" das lojas locais — separada da conta
    ///      que faz o deploy para que o teste passe pelo caminho real, em que
    ///      dono e relayer sao pessoas diferentes.
    address constant DONO_LOCAL = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;

    /// @dev Classe de ponto criada pelo DeployLoyalty.
    uint256 constant PONTO_CIDADE = 1;

    string[8] nomes = [
        "Barbearia Navalha de Ouro",
        "Bicicletaria Pedala",
        "Cafe do Bairro",
        "Emporio da Esquina",
        "Estudio Raiz",
        "Livraria Beco do Verso",
        "Padaria Trigo Santo",
        "Quitanda da Dona Zica"
    ];

    function run() external {
        EstablishmentRegistry registry = EstablishmentRegistry(_deployedAddress("EstablishmentRegistry"));
        StampLedger ledger = StampLedger(_deployedAddress("StampLedger"));
        SubscriptionManager subscriptions = SubscriptionManager(_deployedAddress("SubscriptionManager"));

        vm.startBroadcast();

        for (uint256 i = 0; i < nomes.length; i++) {
            uint256 id = i + 1;

            if (registry.ownerOfEstablishment(id) == address(0)) {
                registry.registerEstablishment(DONO_LOCAL, keccak256(bytes(nomes[i])));
                console.log("Loja registrada:", id, nomes[i]);
            }

            if (!subscriptions.isActive(id)) {
                subscriptions.setSubscription(id, 2, uint64(block.timestamp + 365 days), bytes32(0));
            }

            ledger.setAccrualRule(
                id,
                StampLedger.AccrualRule({
                    // R$ 10 de piso: abaixo disso o programa nao se paga.
                    minTicketCents: 1000,
                    // Cada R$ 10 de compra valem um carimbo.
                    centsPerStamp: 1000,
                    maxStampsPerTx: 10,
                    // Zero em rede local de proposito: com intervalo minimo nao
                    // da para testar duas vendas seguidas para o mesmo cliente.
                    // A regra de cooldown tem cobertura nos testes do contrato.
                    cooldownSeconds: 0,
                    // Uma semana mantem a sequencia: faz mais sentido numa
                    // barbearia que um dia.
                    streakWindowSeconds: 7 days,
                    pointsPerStamp: 10,
                    pointTypeId: PONTO_CIDADE,
                    active: true
                })
            );
        }

        vm.stopBroadcast();
        console.log("Balcao local pronto. Oito lojas ativas, com assinatura e regra de carimbos.");
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

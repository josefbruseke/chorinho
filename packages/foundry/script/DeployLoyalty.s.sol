// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DeployHelpers.s.sol";
import { Achievements } from "../contracts/Achievements.sol";
import { BonusNFT } from "../contracts/BonusNFT.sol";
import { DiscountNFT } from "../contracts/DiscountNFT.sol";
import { DiscountProgram } from "../contracts/DiscountProgram.sol";
import { EstablishmentRegistry } from "../contracts/EstablishmentRegistry.sol";
import { PointsVault } from "../contracts/PointsVault.sol";
import { RewardCatalog } from "../contracts/RewardCatalog.sol";
import { StampLedger } from "../contracts/StampLedger.sol";
import { SubscriptionManager } from "../contracts/SubscriptionManager.sol";

/**
 * @notice Sobe a plataforma inteira e liga os papeis entre os contratos.
 *
 *         A ordem importa: o registry e a fonte de permissao e vem primeiro; o
 *         PointsVault precisa existir antes do StampLedger, que o recebe no
 *         construtor; o DiscountProgram antes do DiscountNFT, que consulta as
 *         regras nele; e as concessoes de papel vem por ultimo, quando todos os
 *         enderecos ja existem.
 *
 * bun run deploy                        # rede local
 * bun run deploy:sepolia                # Sepolia da Ethereum
 */
contract DeployLoyalty is ScaffoldETHDeploy {
    /// @dev Classe de ponto padrao. Id fixo para continuar previsivel entre
    ///      redes: 1 e sempre o ponto da cidade.
    uint256 constant PONTO_CIDADE = 1;

    function run() external ScaffoldEthDeployerRunner {
        EstablishmentRegistry registry = new EstablishmentRegistry(deployer);
        SubscriptionManager subscriptions = new SubscriptionManager(deployer);
        PointsVault points = new PointsVault(deployer, "https://chorinho.app/pontos/{id}.json");
        StampLedger ledger = new StampLedger(registry, subscriptions, points, deployer);

        DiscountProgram programs = new DiscountProgram(registry);
        DiscountNFT discount = new DiscountNFT(registry, programs);
        BonusNFT bonus = new BonusNFT(registry);
        RewardCatalog catalog = new RewardCatalog(registry, ledger, points, discount);
        Achievements achievements = new Achievements(registry, ledger, bonus, discount);

        // Quem credita ponto e o ledger; quem queima e o catalogo, na entrega
        // da recompensa. Papeis separados para que nenhum dos dois possa fazer
        // o trabalho do outro.
        points.grantRole(points.MINTER_ROLE(), address(ledger));
        points.grantRole(points.BURNER_ROLE(), address(catalog));

        // O RELAYER_ROLE do registry e a chave que abre tres portas: queimar
        // selo pelo ledger, cunhar peca no DiscountNFT e cunhar selo no
        // BonusNFT. Os dois contratos que entregam recompensa precisam dele.
        registry.grantRole(registry.RELAYER_ROLE(), address(catalog));
        registry.grantRole(registry.RELAYER_ROLE(), address(achievements));

        // A peca de tempo de casa confere o total de carimbos antes de subir
        // de nivel -- por isso precisa saber onde o ledger mora.
        bonus.setStampLedger(ledger);

        points.createPointType(PONTO_CIDADE, "Ponto da Cidade", PointsVault.Scope.City, 1);

        /**
         * O relayer da plataforma, em QUALQUER rede.
         *
         * Isto vivia dentro de um `if (block.chainid == 31337)`, e era o
         * bloqueador numero um de publicar em rede publica: sem RELAYER_ROLE
         * ninguem consegue emitir carimbo pelo servidor, e o balcao recusa
         * toda venda com "o relayer nao tem permissao nesta loja".
         *
         * Por padrao e o proprio deployer. `RELAYER_ADDRESS` separa as duas
         * contas para o dia em que quem paga o gas e quem muda regra nao
         * puderem ser a mesma pessoa.
         */
        registry.grantRole(registry.RELAYER_ROLE(), deployer);
        subscriptions.grantRole(subscriptions.BILLING_ORACLE_ROLE(), deployer);

        address relayer = vm.envOr("RELAYER_ADDRESS", address(0));
        if (relayer != address(0) && relayer != deployer) {
            registry.grantRole(registry.RELAYER_ROLE(), relayer);
        }

        deployments.push(Deployment("EstablishmentRegistry", address(registry)));
        deployments.push(Deployment("SubscriptionManager", address(subscriptions)));
        deployments.push(Deployment("PointsVault", address(points)));
        deployments.push(Deployment("StampLedger", address(ledger)));
        deployments.push(Deployment("DiscountProgram", address(programs)));
        deployments.push(Deployment("DiscountNFT", address(discount)));
        deployments.push(Deployment("BonusNFT", address(bonus)));
        deployments.push(Deployment("RewardCatalog", address(catalog)));
        deployments.push(Deployment("Achievements", address(achievements)));
    }
}

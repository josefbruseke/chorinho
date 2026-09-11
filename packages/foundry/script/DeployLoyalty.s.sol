// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DeployHelpers.s.sol";
import { EstablishmentRegistry } from "../contracts/EstablishmentRegistry.sol";
import { SubscriptionManager } from "../contracts/SubscriptionManager.sol";
import { PointsVault } from "../contracts/PointsVault.sol";
import { StampLedger } from "../contracts/StampLedger.sol";
import { DiscountNFT } from "../contracts/DiscountNFT.sol";
import { BonusNFT } from "../contracts/BonusNFT.sol";
import { RewardCatalog } from "../contracts/RewardCatalog.sol";

/**
 * @notice Sobe a plataforma inteira e liga os papeis entre os contratos.
 *
 *         A ordem importa: o registry e a fonte de permissao e vem primeiro;
 *         o PointsVault precisa existir antes do StampLedger, que o recebe no
 *         construtor; e as concessoes de papel vem por ultimo, quando todos os
 *         enderecos ja existem.
 *
 * bun deploy --file DeployLoyalty.s.sol                        # anvil local
 * bun deploy --file DeployLoyalty.s.sol --network baseSepolia  # testnet
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

        DiscountNFT discount = new DiscountNFT(registry);
        BonusNFT bonus = new BonusNFT(registry);
        RewardCatalog catalog = new RewardCatalog(registry, ledger, points);

        // Quem credita ponto e o ledger; quem queima e o catalogo, na entrega
        // da recompensa. Papeis separados para que nenhum dos dois possa fazer
        // o trabalho do outro.
        points.grantRole(points.MINTER_ROLE(), address(ledger));
        points.grantRole(points.BURNER_ROLE(), address(catalog));

        // O catalogo precisa queimar selo pelo ledger na hora do resgate.
        registry.grantRole(registry.RELAYER_ROLE(), address(catalog));

        // A peca de tempo de casa confere o total de carimbos antes de subir
        // de nivel -- por isso precisa saber onde o ledger mora.
        bonus.setStampLedger(ledger);

        points.createPointType(PONTO_CIDADE, "Ponto da Cidade", PointsVault.Scope.City, 1);

        // Em rede local o proprio deployer faz o papel do relayer e do oraculo
        // de cobranca, para o fluxo completo rodar sem backend.
        if (block.chainid == 31_337) {
            registry.grantRole(registry.RELAYER_ROLE(), deployer);
            subscriptions.grantRole(subscriptions.BILLING_ORACLE_ROLE(), deployer);
        }

        deployments.push(Deployment("EstablishmentRegistry", address(registry)));
        deployments.push(Deployment("SubscriptionManager", address(subscriptions)));
        deployments.push(Deployment("PointsVault", address(points)));
        deployments.push(Deployment("StampLedger", address(ledger)));
        deployments.push(Deployment("DiscountNFT", address(discount)));
        deployments.push(Deployment("BonusNFT", address(bonus)));
        deployments.push(Deployment("RewardCatalog", address(catalog)));
    }
}

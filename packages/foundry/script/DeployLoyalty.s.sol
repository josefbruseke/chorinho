// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DeployHelpers.s.sol";
import { EstablishmentRegistry } from "../contracts/EstablishmentRegistry.sol";
import { DiscountNFT } from "../contracts/DiscountNFT.sol";
import { BonusNFT } from "../contracts/BonusNFT.sol";

/**
 * @notice Deploys the loyalty platform: registry first (source of roles),
 *         then both NFT contracts wired to it. The deployer account becomes
 *         the platform admin (DEFAULT_ADMIN_ROLE on the registry).
 *
 * bun deploy --file DeployLoyalty.s.sol                        # local anvil
 * bun deploy --file DeployLoyalty.s.sol --network baseSepolia  # Base Sepolia (requires keystore)
 */
contract DeployLoyalty is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        EstablishmentRegistry registry = new EstablishmentRegistry(deployer);
        DiscountNFT discount = new DiscountNFT(registry);
        BonusNFT bonus = new BonusNFT(registry);

        // Recorded in deployments/<chainId>.json so tooling (e.g. the seed
        // script) can find the addresses without parsing broadcast files.
        deployments.push(Deployment("EstablishmentRegistry", address(registry)));
        deployments.push(Deployment("DiscountNFT", address(discount)));
        deployments.push(Deployment("BonusNFT", address(bonus)));
    }
}

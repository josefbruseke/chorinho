// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { DiscountNFT } from "../contracts/DiscountNFT.sol";
import { EstablishmentRegistry } from "../contracts/EstablishmentRegistry.sol";

/**
 * @notice Seeds the local chain with example campaigns so the storefront has
 *         something to show. Local/testnet tooling only — never part of a
 *         production deploy.
 *
 *         Physical commerce ("Chorinho"): campaigns from authentic local
 *         businesses (cafes, bakeries, barbershops, emporiums, bookstores),
 *         with metadata carrying establishment/neighborhood/cuisine for the
 *         frontend cards.
 *
 *         Metadata is embedded as `data:` URIs (plain JSON) so the demo works
 *         fully offline: no IPFS, no metadata server. Campaigns without an
 *         image field fall back to the frontend's category placeholder art.
 *
 *         Idempotent: campaigns that already exist are skipped, so re-running
 *         after adding a new entry is safe.
 *
 *         Usage: bun seed   (chain running + contracts deployed first)
 */
contract SeedCampaigns is Script {
    // Anvil's default account #1 — granted ESTABLISHMENT_ROLE on local chains
    // so the /parceiro scanner flow is testable without manual role setup.
    address constant LOCAL_ESTABLISHMENT = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;

    function run() external {
        DiscountNFT discount = DiscountNFT(_deployedAddress("DiscountNFT"));
        EstablishmentRegistry registry = EstablishmentRegistry(_deployedAddress("EstablishmentRegistry"));

        vm.startBroadcast();

        if (block.chainid == 31337 && !registry.isEstablishment(LOCAL_ESTABLISHMENT)) {
            registry.addEstablishment(LOCAL_ESTABLISHMENT);
            console.log("Granted establishment role to anvil account #1");
        }

        // Culture / Care local business: Barbershop loyalty voucher
        _create(
            discount,
            10,
            _simple(
                0.008 ether,
                20,
                DiscountNFT.Category.Culture,
                unicode'data:application/json,{"name":"Corte com barba alinhada de cortesia","description":"Corte de cabelo completo na navalha com direito a barba alinhada e toalha quente como chorinho de cortesia no balcão.","establishment":"Barbearia Navalha de Ouro","neighborhood":"Centro","cuisine":"Barbearia & Cuidados"}'
            )
        );

        // Leisure / Bookstore local business
        _create(
            discount,
            11,
            _simple(
                0.006 ether,
                50,
                DiscountNFT.Category.Culture,
                unicode'data:application/json,{"name":"Livro Selecionado + Café no Balcão","description":"Na compra de qualquer livro da seleção especial de clássicos, ganhe um café filtrado especial servido no balcão da livraria.","establishment":"Livraria & Sebo Central","neighborhood":"Centro Histórico","cuisine":"Livraria & Café"}'
            )
        );

        // Gastronomy — Local coffee shop loyalty with combo
        DiscountNFT.CampaignParams memory cafe = _simple(
            0.003 ether,
            100,
            DiscountNFT.Category.Gastronomy,
            unicode'data:application/json,{"name":"Café Filtrado Especial + Pão de Queijo","description":"Peça um café coado especial no método V60 e ganhe um pão de queijo artesanal da serra como chorinho da casa. De brinde, um vale-cuidado na Barbearia Navalha de Ouro.","establishment":"Café do Bairro","neighborhood":"Centro Histórico","cuisine":"Cafeteria Artesanal"}'
        );
        cafe.comboTokenIds = new uint256[](1);
        cafe.comboTokenIds[0] = 10;
        _create(discount, 1, cafe);

        _create(
            discount,
            2,
            _simple(
                0.003 ether,
                0, // unlimited
                DiscountNFT.Category.Gastronomy,
                unicode'data:application/json,{"name":"Pão de Fermentação Natural + Focaccia","description":"Leve um sourdough de fermentação lenta de 24h e ganhe uma fatia de focaccia fresca com alecrim e azeite de oliva como chorinho.","establishment":"Padaria Trigo Santo","neighborhood":"Vila Verde","cuisine":"Panificação Artesanal"}'
            )
        );

        _create(
            discount,
            3,
            _simple(
                0.005 ether,
                0, // unlimited
                DiscountNFT.Category.Gastronomy,
                unicode'data:application/json,{"name":"Vinho Regional + Queijo Canastra","description":"Na compra de uma garrafa de vinho colonial selecionado, ganhe uma porção degustação de queijo Canastra meia cura artesanal.","establishment":"Empório da Terra","neighborhood":"Jardim das Flores","cuisine":"Empório & Delicatessen"}'
            )
        );

        _create(
            discount,
            4,
            _simple(
                0.0025 ether,
                60,
                DiscountNFT.Category.Gastronomy,
                unicode'data:application/json,{"name":"Gelato Artesanal com Casquinha Trufada","description":"2 bolas do autêntico gelato italiano na casquinha artesanal com recheio de brigadeiro belga como chorinho cortesia.","establishment":"Gelato da Praça","neighborhood":"Praça Central","cuisine":"Gelateria Artesanal"}'
            )
        );

        // Flash promotion: limited supply + 2h window + per-wallet cap.
        DiscountNFT.CampaignParams memory flashPromo = _simple(
            0.003 ether,
            10,
            DiscountNFT.Category.Gastronomy,
            unicode'data:application/json,{"name":"Só hoje: Burger Artesanal + Batata com Chorinho de Cheddar","description":"Apenas 10 passes válidos por 2 horas: burger smash na brasa com batatas crocantes e chorinho extra de cheddar cremoso.","establishment":"Braseiro do Bairro","neighborhood":"Centro","cuisine":"Hamburgueria"}'
        );
        flashPromo.flash = true;
        flashPromo.startTime = uint64(block.timestamp);
        flashPromo.endTime = uint64(block.timestamp + 2 hours);
        flashPromo.maxPerWallet = 2;
        _create(discount, 5, flashPromo);

        vm.stopBroadcast();
    }

    function _create(DiscountNFT discount, uint256 tokenId, DiscountNFT.CampaignParams memory p) internal {
        if (discount.campaignExists(tokenId)) {
            console.log("Campaign %s already exists, skipping", tokenId);
            return;
        }
        discount.createCampaign(tokenId, p);
        console.log("Created campaign %s", tokenId);
    }

    function _simple(uint256 price, uint256 maxSupply, DiscountNFT.Category category, string memory uri)
        internal
        pure
        returns (DiscountNFT.CampaignParams memory p)
    {
        p.price = price;
        p.maxSupply = maxSupply;
        p.category = category;
        p.uri = uri;
        p.comboTokenIds = new uint256[](0);
    }

    /// @dev Looks a contract up in deployments/<chainId>.json, written by the
    ///      deploy script. The file maps address => contract name.
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

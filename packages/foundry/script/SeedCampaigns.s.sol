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
 *         Restaurant-first ("Floripa em Dobro"): most campaigns are gastronomy
 *         offers from fictional Floripa restaurants, with metadata carrying
 *         establishment/neighborhood/cuisine for the frontend cards. A couple
 *         of non-food campaigns feed the "Outras experiências" section.
 *
 *         Metadata is embedded as `data:` URIs (plain JSON) so the demo works
 *         fully offline: no IPFS, no metadata server. Campaigns without an
 *         image field fall back to the frontend's category placeholder art.
 *
 *         Idempotent: campaigns that already exist are skipped, so re-running
 *         after adding a new entry is safe.
 *
 *         Usage: yarn seed   (chain running + contracts deployed first)
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

        // Non-gastronomy first: campaign 10 is the combo target of campaign 1,
        // and createCampaign requires combo references to already exist.
        _create(
            discount,
            10,
            _simple(
                0.008 ether,
                15, // small supply on purpose: lets the demo show "combo skipped when gift sold out"
                DiscountNFT.Category.Sports,
                unicode'data:application/json,{"name":"Aula de surf na Joaquina — 30% off","description":"Desconto de 30% em aula de surf para iniciantes na praia da Joaquina. Prancha e roupa de borracha incluídas.","establishment":"Joaquina Surf School","neighborhood":"Joaquina","cuisine":"Aula de surf"}'
            )
        );

        _create(
            discount,
            11,
            _simple(
                0.01 ether,
                50,
                DiscountNFT.Category.LeisureTourism,
                unicode'data:application/json,{"name":"Passeio de escuna 2x1","description":"Dois ingressos pelo preço de um no passeio de escuna pela Baía Norte, com parada na Ilha de Anhatomirim.","establishment":"Floripa Boat Tours","neighborhood":"Centro","cuisine":"Passeio de barco"}'
            )
        );

        // Gastronomy — the heart of the product. Campaign 1 carries a combo:
        // buying the shrimp sequence also mints the surf coupon (id 10).
        DiscountNFT.CampaignParams memory ostradamus = _simple(
            0.004 ether,
            100,
            DiscountNFT.Category.Gastronomy,
            unicode'data:application/json,{"name":"Sequência de camarão em dobro","description":"Peça uma sequência de camarão e leve duas: entrada, camarão à milanesa, ao alho e óleo e casquinha de siri, para duas pessoas pelo preço de uma. De brinde, um cupom de aula de surf na Joaquina.","establishment":"Ostradamus","neighborhood":"Ribeirão da Ilha","cuisine":"Frutos do mar"}'
        );
        ostradamus.comboTokenIds = new uint256[](1);
        ostradamus.comboTokenIds[0] = 10;
        _create(discount, 1, ostradamus);

        _create(
            discount,
            2,
            _simple(
                0.003 ether,
                0, // unlimited
                DiscountNFT.Category.Gastronomy,
                unicode'data:application/json,{"name":"Rodízio de pizza: pague 1, leve 2","description":"Um rodízio pago, dois comensais servidos. Válido de terça a quinta no salão, mediante reserva.","establishment":"Forno da Lagoa","neighborhood":"Lagoa da Conceição","cuisine":"Pizzaria"}'
            )
        );

        _create(
            discount,
            3,
            _simple(
                0.002 ether,
                0, // unlimited
                DiscountNFT.Category.Gastronomy,
                unicode'data:application/json,{"name":"Café colonial em dobro","description":"Pague um café colonial e leve dois, de terça a quinta, no nosso salão do Mercado Público.","establishment":"Casa da Ilha","neighborhood":"Centro","cuisine":"Cafeteria"}'
            )
        );

        _create(
            discount,
            4,
            _simple(
                0.0035 ether,
                40,
                DiscountNFT.Category.Gastronomy,
                unicode'data:application/json,{"name":"Tainha na taquara em dobro","description":"Na temporada da tainha, cada porção pedida vem em dobro — acompanha pirão e salada para dividir.","establishment":"Rancho do Seu Nino","neighborhood":"Barra da Lagoa","cuisine":"Cozinha açoriana"}'
            )
        );

        // Flash promotion: limited supply + 2h window + per-wallet cap.
        DiscountNFT.CampaignParams memory flashPromo = _simple(
            0.0025 ether,
            10,
            DiscountNFT.Category.Gastronomy,
            unicode'data:application/json,{"name":"Só hoje: combo burger em dobro","description":"Só 10 cupons, válidos por 2 horas: peça um combo burger + fritas + bebida e leve dois.","establishment":"Braseiro 48","neighborhood":"Trindade","cuisine":"Hamburgueria"}'
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
        revert(string.concat(contractName, " not found in deployments json; run `yarn deploy` first"));
    }
}

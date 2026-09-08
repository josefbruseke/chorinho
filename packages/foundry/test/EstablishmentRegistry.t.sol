// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { EstablishmentRegistry } from "../contracts/EstablishmentRegistry.sol";
import { IAccessControl } from "@openzeppelin/contracts/access/IAccessControl.sol";

contract EstablishmentRegistryTest is Test {
    EstablishmentRegistry registry;

    address admin = makeAddr("admin");
    address establishment = makeAddr("establishment");
    address relayer = makeAddr("relayer");
    address rando = makeAddr("rando");

    event EstablishmentAdded(address indexed account);
    event EstablishmentRemoved(address indexed account);

    function setUp() public {
        registry = new EstablishmentRegistry(admin);
    }

    function test_DeployerParamIsAdmin() public view {
        assertTrue(registry.isAdmin(admin));
        assertFalse(registry.isAdmin(rando));
    }

    function test_AdminAddsAndRemovesEstablishment() public {
        vm.prank(admin);
        vm.expectEmit(true, false, false, false);
        emit EstablishmentAdded(establishment);
        registry.addEstablishment(establishment);
        assertTrue(registry.isEstablishment(establishment));

        vm.prank(admin);
        vm.expectEmit(true, false, false, false);
        emit EstablishmentRemoved(establishment);
        registry.removeEstablishment(establishment);
        assertFalse(registry.isEstablishment(establishment));
    }

    function test_AddEstablishment_RevertsForNonAdmin() public {
        // cache before pranking: a view call to the getter would consume the prank
        bytes32 adminRole = registry.DEFAULT_ADMIN_ROLE();
        vm.prank(rando);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, rando, adminRole)
        );
        registry.addEstablishment(establishment);
    }

    function test_RemoveEstablishment_RevertsForNonAdmin() public {
        vm.prank(admin);
        registry.addEstablishment(establishment);

        vm.prank(rando);
        vm.expectRevert();
        registry.removeEstablishment(establishment);
    }

    function test_RelayerRoleManagedByAdmin() public {
        bytes32 relayerRole = registry.RELAYER_ROLE();
        assertFalse(registry.isRelayer(relayer));
        vm.prank(admin);
        registry.grantRole(relayerRole, relayer);
        assertTrue(registry.isRelayer(relayer));

        vm.prank(rando);
        vm.expectRevert();
        registry.grantRole(relayerRole, rando);
    }

    function test_AdminTransfer() public {
        address newAdmin = makeAddr("newAdmin");

        vm.startPrank(admin);
        registry.grantRole(registry.DEFAULT_ADMIN_ROLE(), newAdmin);
        registry.renounceRole(registry.DEFAULT_ADMIN_ROLE(), admin);
        vm.stopPrank();

        assertFalse(registry.isAdmin(admin));
        assertTrue(registry.isAdmin(newAdmin));

        // old admin lost its powers
        vm.prank(admin);
        vm.expectRevert();
        registry.addEstablishment(establishment);

        // new admin has them
        vm.prank(newAdmin);
        registry.addEstablishment(establishment);
        assertTrue(registry.isEstablishment(establishment));
    }
}

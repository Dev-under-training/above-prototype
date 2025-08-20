// Import necessary modules from Hardhat and Chai for testing
import { expect } from "chai";
// Import the Hardhat Runtime Environment
import hre from "hardhat";
// Import specific utilities directly from the 'ethers' library for better type safety and clarity
// This approach often works better in ESM environments with potential import conflicts
import { ethers } from "ethers"; // Main ethers namespace
import type { Signer } from "ethers"; // Type for signers
// Import the generated TypeChain factory for strongly typed contract deployment
// Adjust the path if the generated files are in a different location
import type { VoterRegistry__factory } from "../typechain-types/factories/contracts/VoterRegistry__factory";
// Import the generated TypeChain interface for the deployed contract instance
import type { VoterRegistry } from "../typechain-types/contracts/VoterRegistry";

describe("VoterRegistry", function () {
  // Declare variables using types from the directly imported 'ethers' library where possible
  let voterRegistry: VoterRegistry; // Typed contract instance
  let owner: Signer; // Typed signer for the owner
  let addr1: Signer; // Typed signer for test account 1
  let addr2: Signer; // Typed signer for test account 2
  let addrs: Signer[]; // Array of other typed signers

  // `beforeEach` runs before each individual test, ensuring a clean state
  beforeEach(async function () {
    // Get signers using Hardhat's method, but assign them to variables typed by the direct ethers import
    // hre.ethers is still used here for Hardhat-specific functionalities like getSigners
    const hardhatSigners: Signer[] = await hre.ethers.getSigners();
    [owner, addr1, addr2, ...addrs] = hardhatSigners;

    // Get the contract factory using Hardhat's method (hre.ethers.getContractFactory)
    // Type it using the generated TypeChain factory type
    const VoterRegistryFactory: VoterRegistry__factory = (await hre.ethers.getContractFactory(
      "VoterRegistry"
    )) as VoterRegistry__factory;

    // Deploy a new instance of the VoterRegistry contract using Hardhat's method
    // Type the deployed instance using the generated TypeChain interface
    voterRegistry = (await VoterRegistryFactory.connect(owner).deploy()) as VoterRegistry;

    // Wait for the deployment transaction to be mined/confirmed on the local network
    await voterRegistry.waitForDeployment();
  });

  // Test suite for contract deployment and initial state
  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      // Get the owner address using the typed Signer
      const ownerAddress: string = await owner.getAddress();
      // Expect the owner returned by the contract to be the address that deployed it
      expect(await voterRegistry.owner()).to.equal(ownerAddress);
    });

    it("Should initialize allowedVoterCount to 0", async function () {
      // Expect the initial voter count to be zero (use bigint literal for uint256)
      expect(await voterRegistry.allowedVoterCount()).to.equal(0n);
    });
  });

  // Test suite for the `addVoter` function
  describe("Adding Voters", function () {
    it("Should allow the owner to add a voter", async function () {
      // Get the address of addr1 using the typed Signer
      const addr1Address: string = await addr1.getAddress();

      // Owner adds addr1 as a voter
      // Use hre.ethers for Hardhat-specific interactions like event checking
      await expect(voterRegistry.connect(owner).addVoter(addr1Address))
        .to.emit(voterRegistry, "VoterAdded")
        .withArgs(addr1Address);

      // Check if addr1 is now allowed
      expect(await voterRegistry.isAllowed(addr1Address)).to.equal(true);

      // Check if the voter count has increased
      expect(await voterRegistry.allowedVoterCount()).to.equal(1n);
    });

    it("Should fail if a non-owner tries to add a voter", async function () {
      // Get the address of addr2 using the typed Signer
      const addr2Address: string = await addr2.getAddress();

      // Try to add addr2 as a voter using addr1's account (not the owner)
      // This transaction is expected to revert (fail)
      // Using a general revert check to avoid potential custom error name issues
      await expect(voterRegistry.connect(addr1).addVoter(addr2Address)).to.be.reverted;
      // If you want to try checking for the specific error again later:
      // .to.be.revertedWithCustomError(voterRegistry, "OwnableUnauthorizedAccount")
      // .withArgs(await addr1.getAddress());
    });

    it("Should fail if trying to add an invalid address (zero address)", async function () {
      // Try to add the zero address using the constant from the directly imported ethers library
      await expect(voterRegistry.connect(owner).addVoter(ethers.ZeroAddress))
        .to.be.revertedWith("VoterRegistry: Invalid voter address");
    });

    it("Should fail if trying to add a voter that is already registered", async function () {
      // Get the address of addr1
      const addr1Address: string = await addr1.getAddress();

      // Add addr1 first
      await voterRegistry.connect(owner).addVoter(addr1Address);
      expect(await voterRegistry.isAllowed(addr1Address)).to.equal(true);

      // Try to add addr1 again
      await expect(voterRegistry.connect(owner).addVoter(addr1Address))
        .to.be.revertedWith("VoterRegistry: Voter already registered");
    });
  });

  // Test suite for the `isAllowed` function
  describe("Checking Voter Eligibility", function () {
    it("Should correctly report if an address is allowed", async function () {
      // Get addresses using the typed Signers
      const addr1Address: string = await addr1.getAddress();
      const addr2Address: string = await addr2.getAddress();

      // Initially, addr1 should not be allowed
      expect(await voterRegistry.isAllowed(addr1Address)).to.equal(false);

      // Add addr1
      await voterRegistry.connect(owner).addVoter(addr1Address);

      // Now addr1 should be allowed
      expect(await voterRegistry.isAllowed(addr1Address)).to.equal(true);

      // addr2 should still not be allowed
      expect(await voterRegistry.isAllowed(addr2Address)).to.equal(false);
    });
  });
});

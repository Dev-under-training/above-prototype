// scripts/simple_check.ts
// Import the Hardhat Runtime Environment to get network access
import hre from "hardhat";
// Import the standalone Ethers.js library
import { ethers } from "ethers";

async function main() {
  console.log("Attempting to use standalone Ethers.js with Hardhat provider...");

  try {
    // --- Use standalone Ethers.js ---
    // Get the network provider from Hardhat's Runtime Environment
    // This connects Ethers.js to the Hardhat network (e.g., localhost node)
    const provider = hre.ethers.provider; // This should work as hre.network should be available

    console.log("Connected to Hardhat network provider.");
    console.log("Network name:", hre.network.name);
    console.log("Chain ID:", (await provider.getNetwork()).chainId.toString());

    // Create an Ethers.js Wallet/Signer using the provider
    // Hardhat automatically provides test accounts. We can get their private keys
    // if needed, but for basic interaction, we often just need the provider for read ops
    // or use hre.ethers.getSigners() if the plugin *did* load correctly for that part.
    // Since hre.ethers is broken, let's see if we can get signers via the provider's potential link
    // or fallback to manual methods if needed. Let's first try accessing signers via hre.ethers.provider's link.
    // Often, even if hre.ethers is broken, hre.ethers.provider might still be a valid Ethers.js provider
    // linked to the Hardhat network.

    // Let's try a different approach to get signers, using the underlying provider/connection info
    // Hardhat node exposes accounts. We can try to get them.
    // However, the standard way is hre.ethers.getSigners(). Let's see if just the provider part works.

    console.log("\nAttempting to get signers via hre.ethers.getSigners() (might fail)...");
    let signers;
    try {
        signers = await hre.ethers.getSigners(); // This part of hre.ethers might still work
        console.log("Success getting signers via hre.ethers.getSigners()!");
    } catch (signerError) {
        console.warn("Failed to get signers via hre.ethers.getSigners():", signerError);
        console.log("Falling back to manual signer creation (requires private key, not ideal for scripts) or checking if provider has a direct way.");
        // If hre.ethers.getSigners() also fails, we are quite stuck for easy signer access in scripts.
        // For manual testing, you'd use the private keys printed by `npx hardhat node`.
        // For now, let's focus on read operations using the provider.
        signers = []; // Placeholder
    }

    if (signers && signers.length > 0) {
        console.log("Number of signers available:", signers.length);
        console.log("First signer address:", await signers[0].getAddress());
    } else {
         console.log("Proceeding with provider-only interactions for now.");
    }


    console.log("\nAttempting to interact with a compiled contract (requires artifacts)...");
    // To interact with a contract, we need its ABI and bytecode (from artifacts)
    // and connect it to the provider/signer.
    try {
        // Get the contract artifact (this should work if contracts are compiled)
        const voterRegistryArtifact = await hre.artifacts.readArtifact("VoterRegistry");
        console.log("Success! Read VoterRegistry artifact.");
        // console.log("ABI Sample:", voterRegistryArtifact.abi.slice(0, 2)); // Print first 2 ABI entries

        // If we had a signer, we could deploy or connect:
        // const VoterRegistryFactory = new ethers.ContractFactory(voterRegistryArtifact.abi, voterRegistryArtifact.bytecode, signer);
        // Or connect to an existing deployment:
        // const deployedVoterRegistry = new ethers.Contract(deployedAddress, voterRegistryArtifact.abi, signerOrProvider);

        if (signers && signers.length > 0) {
             console.log("Would deploy or connect using the available signer and artifact if logic continued...");
        } else {
             console.log("Would connect using the provider and artifact for read-only calls if logic continued...");
        }

    } catch (artifactError) {
        console.error("Failed to read VoterRegistry artifact:");
        console.error(artifactError);
    }


    console.log("\n--- Standalone Ethers.js check script completed (partial success expected due to hre.ethers issue) ---");

  } catch (error) {
    console.error("FAILURE in main logic:");
    console.error(error);
    process.exitCode = 1;
    return; // Exit early on failure
  }
}

main().catch((error) => {
  console.error("Unhandled error in simple_check:");
  console.error(error);
  process.exitCode = 1;
});
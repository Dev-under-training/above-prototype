// scripts/deploy_manual.ts
// Import Hardhat Runtime Environment for artifacts/config
import hre from "hardhat";
// Import the standalone Ethers.js library
import { ethers } from "ethers";
// Import dotenv to load environment variables from a .env file
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// --- READ PRIVATE KEY FROM ENVIRONMENT VARIABLE ---
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;

// Network endpoint for the local Hardhat node
const HARDHAT_NETWORK_URL = "http://127.0.0.1:8545";

async function main() {
    console.log("Starting manual deployment script using standalone Ethers.js...");

    // --- 1. Connect to the Hardhat Network Provider ---
    const provider = new ethers.JsonRpcProvider(HARDHAT_NETWORK_URL);
    console.log(`Connected to Hardhat network at ${HARDHAT_NETWORK_URL}`);

    // --- 2. Create Deployer Signer ---
    // Check if the private key was provided via environment variable
    if (!DEPLOYER_PRIVATE_KEY) {
        throw new Error("CRITICAL ERROR: DEPLOYER_PRIVATE_KEY environment variable is not set. Please ensure you have a .env file with DEPLOYER_PRIVATE_KEY=your_actual_key_here");
    }
    const deployerWallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
    const deployerAddress = await deployerWallet.getAddress();
    console.log(`Deployer Address: ${deployerAddress}`);
    console.log(`Deployer Balance: ${ethers.formatEther(await provider.getBalance(deployerAddress))} ETH`);

    // --- 3. Read Contract Artifacts ---
    console.log("Loading contract artifacts...");
    const voterRegistryArtifact = await hre.artifacts.readArtifact("VoterRegistry");
    const aboveBallotArtifact = await hre.artifacts.readArtifact("ABOVEBallot");
    console.log("Artifacts loaded successfully.");

    // --- 4. Deploy VoterRegistry ---
    console.log("Deploying VoterRegistry...");
    const voterRegistryFactory = new ethers.ContractFactory(
        voterRegistryArtifact.abi,
        voterRegistryArtifact.bytecode,
        deployerWallet
    );
    const voterRegistry = await voterRegistryFactory.deploy();
    await voterRegistry.waitForDeployment();
    const voterRegistryAddress = await voterRegistry.getAddress();
    console.log(`VoterRegistry deployed to: ${voterRegistryAddress}`);

    // --- 5. Deploy ABOVEBallot ---
    console.log("Deploying ABOVEBallot...");
    const aboveBallotFactory = new ethers.ContractFactory(
        aboveBallotArtifact.abi,
        aboveBallotArtifact.bytecode,
        deployerWallet
    );
    // Pass the deployed VoterRegistry address to the ABOVEBallot constructor
    const aboveBallot = await aboveBallotFactory.deploy(voterRegistryAddress);
    await aboveBallot.waitForDeployment();
    const aboveBallotAddress = await aboveBallot.getAddress();
    console.log(`ABOVEBallot deployed to: ${aboveBallotAddress}`);

    // --- 6. Basic Interaction Testing ---
    console.log("\n--- Testing VoterRegistry ---");
    // Example interaction: Add deployer as a voter (using the deployed contract instance)
    console.log(`Adding deployer (${deployerAddress}) as a voter...`);
    const addVoterTx = await voterRegistry.connect(deployerWallet).addVoter(deployerAddress);
    const addVoterReceipt = await addVoterTx.wait();
    console.log(`Voter added in tx: ${addVoterReceipt?.hash}`);

    // Check if deployer is allowed
    const isDeployerAllowed = await voterRegistry.isAllowed(deployerAddress);
    console.log(`Is deployer (${deployerAddress}) allowed? ${isDeployerAllowed}`);

    console.log("\n--- Deployment and Basic Interaction Complete ---");
    console.log(`VoterRegistry Address: ${voterRegistryAddress}`);
    console.log(`ABOVEBallot Address: ${aboveBallotAddress}`);
    console.log("SUCCESS: Contracts deployed and basic interaction verified using standalone Ethers.js!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("ERROR in deployment script:");
        console.error(error);
        process.exit(1);
    });
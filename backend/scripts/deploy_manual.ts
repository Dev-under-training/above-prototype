// scripts/deploy_manual.ts
// Import Hardhat Runtime Environment for artifacts/config
import hre from "hardhat";
// Import the standalone Ethers.js library
import { ethers } from "ethers";
// Import dotenv to load environment variables from a .env file
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// --- READ PRIVATE KEYS AND NETWORK CONFIGURATION FROM ENVIRONMENT VARIABLES ---
// Ensure your .env file contains SEPOLIA_PRIVATE_KEY
const DEPLOYER_PRIVATE_KEY = process.env.SEPOLIA_PRIVATE_KEY;
// Ensure your .env file contains SEP_ABOVE_TOKEN_ADDRESS
const SEP_ABOVE_TOKEN_ADDRESS = process.env.SEP_ABOVE_TOKEN_ADDRESS;

// Network endpoint for Sepolia Testnet
// CRITICAL: Ensure there is NO trailing space in your URL
const SEPOLIA_NETWORK_URL = "https://sepolia.infura.io/v3/ab8470a6c1704dbbb870f3ae84cbab5b"; // Ensure this matches your setup
// --- END CONFIGURATION ---

async function main() {
    console.log("Starting manual deployment script using standalone Ethers.js for Sepolia...");

    // --- 1. Connect to the Sepolia Network Provider ---
    const provider = new ethers.JsonRpcProvider(SEPOLIA_NETWORK_URL.trim()); // .trim() to remove any potential whitespace
    console.log(`Connected to Sepolia network at ${SEPOLIA_NETWORK_URL}`);

    // --- 2. Create Deployer Signer ---
    // Check if the private key was provided via environment variable
    if (!DEPLOYER_PRIVATE_KEY) {
        throw new Error("CRITICAL ERROR: SEPOLIA_PRIVATE_KEY environment variable is not set. Please ensure you have a .env file with SEPOLIA_PRIVATE_KEY=your_actual_sepolia_key_here");
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

    // --- 5. Validate ABOVE Token Address ---
    console.log("Validating ABOVE Token Address from .env...");
    if (!SEP_ABOVE_TOKEN_ADDRESS) {
        throw new Error("CRITICAL ERROR: SEP_ABOVE_TOKEN_ADDRESS environment variable is not set. Please ensure you have a .env file with SEP_ABOVE_TOKEN_ADDRESS=your_deployed_above_token_address_on_sepolia");
    }
    // Basic validation (check if it looks like an address)
    if (!ethers.isAddress(SEP_ABOVE_TOKEN_ADDRESS)) {
         throw new Error(`CRITICAL ERROR: SEP_ABOVE_TOKEN_ADDRESS from .env ('${SEP_ABOVE_TOKEN_ADDRESS}') is not a valid Ethereum address.`);
    }
    const aboveTokenAddress = SEP_ABOVE_TOKEN_ADDRESS; // Use the validated address
    console.log(`Using ABOVE Token Address from .env: ${aboveTokenAddress}`);

    // --- 6. Deploy ABOVEBallot ---
    console.log("Deploying ABOVEBallot...");
    const aboveBallotFactory = new ethers.ContractFactory(
        aboveBallotArtifact.abi,
        aboveBallotArtifact.bytecode,
        deployerWallet
    );
    // --- PASS THE REQUIRED CONSTRUCTOR ARGUMENTS ---
    // Pass the deployed VoterRegistry address AND the ABOVE Token address loaded from .env
    const aboveBallot = await aboveBallotFactory.deploy(voterRegistryAddress, aboveTokenAddress);
    await aboveBallot.waitForDeployment();
    const aboveBallotAddress = await aboveBallot.getAddress();
    console.log(`ABOVEBallot deployed to: ${aboveBallotAddress}`);

    // --- 7. Basic Interaction Testing ---
    console.log("\n--- Testing VoterRegistry ---");
    // Example interaction: Add deployer as a voter (using the deployed contract instance)
    console.log(`Adding deployer (${deployerAddress}) as a voter...`);
    // Cast to any to avoid potential typing issues if TypeChain paths are problematic in VS Code
    const typedVoterRegistry: any = voterRegistry;
    const addVoterTx = await typedVoterRegistry.connect(deployerWallet).addVoter(deployerAddress);
    const addVoterReceipt = await addVoterTx.wait();
    console.log(`Voter added in tx: ${addVoterReceipt?.hash}`);

    // Check if deployer is allowed
    const isDeployerAllowed = await typedVoterRegistry.isAllowed(deployerAddress);
    console.log(`Is deployer (${deployerAddress}) allowed? ${isDeployerAllowed}`);

    console.log("\n--- Deployment and Basic Interaction Complete ---");
    console.log(`VoterRegistry Address: ${voterRegistryAddress}`);
    console.log(`ABOVEBallot Address: ${aboveBallotAddress}`);
    console.log("SUCCESS: Contracts deployed and basic interaction verified using standalone Ethers.js for Sepolia!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("ERROR in deployment script:");
        console.error(error);
        process.exit(1);
    });
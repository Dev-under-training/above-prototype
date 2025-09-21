// scripts/deploy_token.ts
// Import Hardhat Runtime Environment for artifacts/config
import hre from "hardhat";
// Import the standalone Ethers.js library
import { ethers } from "ethers";
// Import dotenv to load environment variables from a .env file
import * as dotenv from "dotenv";
// Import TypeChain type for the ABOVE contract (assuming types were generated correctly)
// Adjust the path if your TypeChain output directory is different
import type { ABOVE } from "../types/typechain-types/contracts/ABOVE.ts"; // Use the type if available

// Load environment variables from .env file
dotenv.config();

// --- READ PRIVATE KEY FROM ENVIRONMENT VARIABLE ---
// Ensure your .env file contains SEPOLIA_PRIVATE_KEY
const DEPLOYER_PRIVATE_KEY = process.env.SEPOLIA_PRIVATE_KEY;

// Network endpoint for Sepolia Testnet
// CRITICAL: Ensure there is NO trailing space in your URL
const SEPOLIA_NETWORK_URL = "https://sepolia.infura.io/v3/ab8470a6c1704dbbb870f3ae84cbab5b"; // <-- TRAILING SPACE REMOVED

// --- CONFIGURATION FOR THE ABOVE TOKEN ---
// Define the list of beneficiaries for the periodic distribution
// These are the addresses you specified
const DISTRIBUTION_BENEFICIARIES = [
  "0x5419E83859f759782cb5b768fD2B7335B07fc6FA",
  "0x20dfef6E3A7Ce1D61DFA2a6f9fDB3B6a466830c1",
  "0x7ae08b16AeE309Fba172C5c4665cF3696D2eEDde"
];

// Define the lock duration for the owner's tokens (3 days for testnet)
const OWNER_LOCK_DURATION_SECONDS = 3 * 24 * 60 * 60; // 259,200 seconds
// --- END CONFIGURATION ---

async function main() {
    console.log("Starting ABOVE Token deployment script using standalone Ethers.js for Sepolia...");

    // --- 1. Connect to the Sepolia Network Provider ---
    const provider = new ethers.JsonRpcProvider(SEPOLIA_NETWORK_URL.trim()); // .trim() is extra safety
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

    // --- 3. Read ABOVE Token Contract Artifact ---
    console.log("Loading ABOVE token contract artifact...");
    const aboveTokenArtifact = await hre.artifacts.readArtifact("ABOVE");
    console.log("ABOVE token artifact loaded successfully.");

    // --- 4. Deploy ABOVE Token ---
    console.log("Deploying ABOVE Token...");
    const aboveTokenFactory = new ethers.ContractFactory(
        aboveTokenArtifact.abi,
        aboveTokenArtifact.bytecode,
        deployerWallet
    );

    // --- Deploy the token, explicitly typing the instance ---
    // Deploy the token, passing the required constructor arguments:
    // 1. initialOwner (the deployer)
    // 2. _ownerLockDurationSeconds (3 days for testnet)
    // 3. _distributionBeneficiaries (the list of addresses)
    // Type the deployed instance using the generated TypeChain interface (if types are working)
    const aboveToken = (await aboveTokenFactory.deploy(
    deployerAddress,
    OWNER_LOCK_DURATION_SECONDS,
    DISTRIBUTION_BENEFICIARIES
)) as unknown as ABOVE; // Use the TypeChain type
    await aboveToken.waitForDeployment();
    const aboveTokenAddress = await aboveToken.getAddress();
    console.log(`ABOVE Token deployed to: ${aboveTokenAddress}`);

    // --- 5. Basic Interaction Testing ---
    console.log("\n--- Testing ABOVE Token ---");
    try {
        // Now TypeScript knows these methods exist on `aboveToken` if types are correct
        const initialBalance = await aboveToken.balanceOf(deployerAddress);
        console.log(`Deployer (${deployerAddress}) ABOVE balance: ${ethers.formatUnits(initialBalance, 18)} ABOVE`);

        const tokenName = await aboveToken.name();
        const tokenSymbol = await aboveToken.symbol();
        const tokenDecimals = await aboveToken.decimals();
        console.log(`Token Name: ${tokenName}`);
        console.log(`Token Symbol: ${tokenSymbol}`);
        console.log(`Token Decimals: ${tokenDecimals.toString()}`);

        // Example: Check the owner lock details
        const ownerLockDuration = await aboveToken.ownerLockDuration();
        const ownerLockedAmount = await aboveToken.ownerLockedAmount();
        console.log(`Owner Lock Duration (seconds): ${ownerLockDuration.toString()}`);
        console.log(`Owner Locked Amount: ${ethers.formatUnits(ownerLockedAmount, 18)} ABOVE`);

        console.log("\n--- ABOVE Token Deployment and Basic Interaction Complete ---");
        console.log(`ABOVE Token Address: ${aboveTokenAddress}`);
        console.log("SUCCESS: ABOVE Token deployed and basic interaction verified!");
    } catch (error) {
        console.warn("Warning: Some read interactions failed, but deployment might still be successful. Check contract public getters.", error);
        console.log("\n--- ABOVE Token Deployment Complete (with read warnings) ---");
        console.log(`ABOVE Token Address: ${aboveTokenAddress}`);
        console.log("Please verify the deployment on Sepolia Etherscan.");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("ERROR in ABOVE token deployment script:");
        console.error(error);
        process.exit(1);
    });

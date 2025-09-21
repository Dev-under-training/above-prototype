// hardhat.config.cts (Hardhat 2.x style, ESM, with solidity overrides)
/// <reference types="node" />
import "@nomicfoundation/hardhat-toolbox"; // Import the toolbox plugin
import * as dotenv from "dotenv"; // Import dotenv

dotenv.config(); // Load .env variables

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  // --- Configure Solidity compiler ---
  // Use an object configuration to allow overrides
  solidity: {
    version: "0.8.28", // Ensure this matches your contract's pragma (e.g., pragma solidity ^0.8.20;)
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
    // Add the 'overrides' section to exclude specific files causing issues
    overrides: {
      // Specify the relative path from the project root to the problematic file
      "contracts/Counter.t.sol": {
        // Setting the version to a non-existent or incompatible version
        // effectively excludes it from compilation in Hardhat 2.x
        version: "0.0.0" // Invalid version to prevent compilation
      }
    }
  },
  // --- End Solidity configuration ---
  networks: {
    // Sepolia Testnet configuration
    sepolia: {
      // Note: 'type: "http"' might not be needed or allowed in Hardhat v2 config
      // If including it causes issues, you can comment it out or remove it.
      // type: "http",
      url: "https://sepolia.infura.io/v3/ab8470a6c1704dbbb870f3ae84cbab5b", // Ensure no trailing space
      accounts: process.env.SEPOLIA_PRIVATE_KEY ? [process.env.SEPOLIA_PRIVATE_KEY] : [],
    },
  },
  typechain: {
    outDir: "types/typechain-types",
    target: "ethers-v5", // Match the installed @typechain/ethers-v5
  },
  // --- Removed the 'paths' section as it didn't resolve the HH404 error ---
  // paths: {
  //   tests: "ignored_tests",
  // },
  // --- End of removed paths section ---
};
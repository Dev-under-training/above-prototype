// src/web3Config.ts
// --- Import necessary modules from Reown AppKit and Wagmi ---
import { createAppKit } from '@reown/appkit/react'; // Main function to create the AppKit modal
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'; // Adapter for Wagmi
// Import network definitions and types from the main @reown/appkit package
import { hardhat } from '@reown/appkit/networks'; // Import the Hardhat network definition
import type { AppKitNetwork } from '@reown/appkit/networks'; // Import the AppKitNetwork type for explicit typing

// --- Import required modules from @tanstack/react-query ---
import { QueryClient } from '@tanstack/react-query'; // Import the QueryClient class

// 0. Setup queryClient (required for wagmi and AppKit)
export const queryClient = new QueryClient();

// 1. Get projectId from https://cloud.reown.com
// IMPORTANT: Replace 'YOUR_PROJECT_ID' with your actual Project ID from Reown Cloud
export const projectId = '9fc727f7fc67cf6d113a64450bb5f44b'; // e.g., '9fc...44b'

// 2. Create a metadata object (optional but recommended)
const metadata = {
  name: 'ABOVE Voting App',
  description: 'Auditable Ballots On a Verifiable Ecosystem',
  url: 'http://localhost:5173', // Origin must match your domain & subdomain
  icons: ['https://avatars.githubusercontent.com/u/37784886'] // Replace with your app's icon URL
};

// 3. Set the networks
// Explicitly type the networks array to ensure it matches the expected tuple type [AppKitNetwork, ...AppKitNetwork[]]
// This guarantees at least one network is present.
const networks: [AppKitNetwork, ...AppKitNetwork[]] = [hardhat];

// --- Check Network Definition (Optional but Recommended) ---
// The predefined 'hardhat' network might not have the exact RPC URL or chain ID expected.
// It's often safer to define a custom localhost network for development.
// Uncomment and adjust the following block to define a custom Hardhat localhost network:
/*
import { defineChain } from '@reown/appkit/networks'; // Function to define a custom chain

// Define the custom Hardhat localhost network
const hardhatLocalhost: AppKitNetwork = defineChain({
  id: 31337, // Standard Hardhat network chain ID
  name: 'Hardhat Local',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] }, // Default Hardhat node RPC URL
  },
  blockExplorers: {
    default: { name: 'Hardhat Explorer', url: 'http://localhost:8545' }, // Placeholder, Hardhat usually doesn't have one
  },
  testnet: true, // Mark as testnet
});

// Use the custom network in the networks array
const networks: [AppKitNetwork, ...AppKitNetwork[]] = [hardhatLocalhost];
*/

// 4. Create Wagmi Adapter
// The adapter bridges AppKit with Wagmi
const wagmiAdapter = new WagmiAdapter({
  networks, // Pass the explicitly typed networks array
  projectId, // Pass the Reown Project ID
  // ssr: true // Enable Server-Side Rendering if needed (for frameworks like Next.js)
});

// 5. Create the AppKit modal instance
// This initializes the connection logic and UI
let appKitInstance: ReturnType<typeof createAppKit> | null = null;

if (projectId && projectId !== '9fc727f7fc67cf6d113a64450bb5f44b') {
  try {
    appKitInstance = createAppKit({
      adapters: [wagmiAdapter], // Pass the configured Wagmi adapter
      networks,                // Pass the explicitly typed networks array
      projectId,              // Pass the Project ID
      metadata,               // Pass the metadata
      features: {
        analytics: true, // Optional - defaults to your Cloud configuration
        // onramp: true, // Enable on-ramp feature if desired
      },
      // themeMode: 'light', // Set initial theme mode if desired ('dark', 'light')
    });
    console.log("Reown AppKit initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize Reown AppKit:", error);
  }
} else {
  console.warn('Reown AppKit Project ID not found or is placeholder. Wallet connection features will be limited.');
  // appKitInstance remains null
}

// Export necessary items for use in main.tsx and App components
export { wagmiAdapter }; // Export the adapter instance
export type { AppKit } from '@reown/appkit'; // Export AppKit type if needed (from main package)
export { appKitInstance }; // Export the initialized AppKit instance (could be null)

// Note: The actual Wagmi config is inside wagmiAdapter.wagmiConfig if you need direct access:
// You can access it like: wagmiAdapter.wagmiConfig

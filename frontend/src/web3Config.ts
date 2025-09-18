// src/web3Config.ts
// --- Minimal Reown AppKit + Wagmi Setup (Based on Reown Docs) ---
import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { hardhat, sepolia } from '@reown/appkit/networks';
import { QueryClient } from '@tanstack/react-query';

// 0. Setup QueryClient (Required by React Query / Wagmi)
export const queryClient = new QueryClient();

// 1. Get projectId from https://cloud.reown.com
// CRITICAL: Replace 'YOUR_PROJECT_ID' with your actual Project ID
export const projectId = '9fc727f7fc67cf6d113a64450bb5f44b'; // YOUR ACTUAL PROJECT ID

// 2. Create Metadata (Required)
const metadata = {
  name: 'ABOVE Voting App',
  description: 'Auditable Ballots On a Verifiable Ecosystem',
  url: 'http://localhost:5173', // origin must match your domain & subdomain
  icons: ['https://avatars.githubusercontent.com/u/37784886']
};

// 3. Define Networks (Required)
import type { AppKitNetwork } from '@reown/appkit/networks';
const networks: [AppKitNetwork, ...AppKitNetwork[]] = [sepolia]; // Use local Hardhat network

// 4. Create Wagmi Adapter (Required for EVM)
// The adapter bridges AppKit with Wagmi and includes 'injected' connector
export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
});

// 5. Create AppKit Modal Instance (Required)
// This initializes the core AppKit functionality
createAppKit({
  adapters: [wagmiAdapter], // Pass the Wagmi adapter instance
  networks,                // Pass the networks
  projectId,              // Pass the Project ID
  metadata,               // Pass the metadata
  // Enable essential features
  features: {
    analytics: true, // Optional - enable analytics
  },
  themeMode: 'light' // Optional - set initial theme
});

// Note: Providers (WagmiProvider, QueryClientProvider) are needed in main.tsx

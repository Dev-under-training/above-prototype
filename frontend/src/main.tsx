// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
// Import global styles if you have them
// import './index.css';

// Import necessary providers from wagmi and @tanstack/react-query
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider } from '@tanstack/react-query';

// Import the configuration objects created in web3Config.ts
import { wagmiAdapter, queryClient } from './web3Config.ts'; // Adjust path if needed

// Define the root component that wraps the App with the required providers
function RootApp() {
  return (
    <React.StrictMode>
      {/* Provide the Wagmi configuration obtained from the WagmiAdapter */}
      <WagmiProvider config={wagmiAdapter.wagmiConfig}>
        {/* Provide the React Query client, required by Wagmi and AppKit internally */}
        <QueryClientProvider client={queryClient}>
          {/* Render the main application component */}
          <App />
        </QueryClientProvider>
      </WagmiProvider>
    </React.StrictMode>
  );
}

// Find the root DOM element where the React app will be mounted
const container = document.getElementById('root');
if (!container) {
  throw new Error('Failed to find the root element with id "root"');
}

// Create the React root and render the RootApp component
const root = ReactDOM.createRoot(container);
root.render(<RootApp />);

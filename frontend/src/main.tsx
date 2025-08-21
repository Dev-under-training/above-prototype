// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
// Import CSS (if you have a global CSS file, e.g., index.css)
// import './index.css';

// Import necessary providers from wagmi and @tanstack/react-query
// Note: AppKit handles much of the Wagmi setup internally via the adapter
import { WagmiProvider } from 'wagmi'; // Still need WagmiProvider
import { QueryClientProvider } from '@tanstack/react-query'; // Still need QueryClientProvider

// Import your web3 configuration (including the wagmi adapter and queryClient)
import { wagmiAdapter, queryClient } from './web3Config.ts'; // Adjust path if needed

// 1. Define the main App component wrapped with providers
// The structure is WagmiProvider (using config from adapter) -> QueryClientProvider -> App
function RootApp() {
  return (
    <React.StrictMode>
      {/* Wrap the App with WagmiProvider and pass the wagmiConfig from the adapter */}
      {/* The wagmiAdapter contains the fully configured wagmi config */}
      <WagmiProvider config={wagmiAdapter.wagmiConfig}>
        {/* Wrap with QueryClientProvider and pass the queryClient instance */}
        <QueryClientProvider client={queryClient}>
          {/* Render your main App component */}
          {/* The AppKit modal is initialized in web3Config.ts */}
          {/* Its UI components (like <appkit-button>) will be used inside App.tsx */}
          <App />
        </QueryClientProvider>
      </WagmiProvider>
    </React.StrictMode>
  );
}

// 2. Get the root DOM element
const container = document.getElementById('root');
if (!container) {
  throw new Error('Failed to find the root element with id "root"');
}

// 3. Create the React root and render the App
const root = ReactDOM.createRoot(container);
root.render(<RootApp />);

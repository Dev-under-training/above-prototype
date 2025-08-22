// src/components/WalletStatus.tsx
import React from 'react';
import { useAccount, useChainId } from 'wagmi';

/**
 * Component to display the status of the connected wallet.
 * Shows the address and chain ID.
 */
const WalletStatus: React.FC = () => {
  const { address, isConnected, status } = useAccount();
  const chainId = useChainId();

  if (!isConnected) {
    return (
      <div className="wallet-status">
        <p><strong>Wallet Status:</strong> Not connected</p>
      </div>
    );
  }

  return (
    <div className="wallet-status">
      <p><strong>Status:</strong> {status}</p>
      <p><strong>Connected Wallet:</strong> {address}</p>
      <p><strong>Connected Chain ID:</strong> {chainId}</p>
    </div>
  );
};

export default WalletStatus;
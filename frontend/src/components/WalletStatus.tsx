// src/components/WalletStatus.tsx
import React from 'react';
import { useAccount, useChainId } from 'wagmi';
import { useABOVEBallot } from '../hooks/useABOVEBallot'; // Import the hook
import { formatUnits } from 'viem'; // Import formatUnits for token display

/**
 * Component to display the status of the connected wallet.
 * Shows the address, chain ID, and ABOVE token balance.
 */
const WalletStatus: React.FC = () => {
  const { address, isConnected, status } = useAccount();
  const chainId = useChainId();

  // Use the hook to get the ABOVE token balance
  const {
    aboveTokenBalance,
    isFetchingAboveTokenBalance,
    isAboveTokenBalanceError,
    aboveTokenBalanceError,
  } = useABOVEBallot(null); // Pass null as campaignId, we just need global data

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
      {/* Display ABOVE Token Balance */}
      {isFetchingAboveTokenBalance ? (
        <p><strong>ABOVE Token Balance:</strong> Loading...</p>
      ) : isAboveTokenBalanceError ? (
        <p style={{ color: 'red' }}><strong>ABOVE Token Balance Error:</strong> {aboveTokenBalanceError?.message}</p>
      ) : (
        <p><strong>ABOVE Token Balance:</strong> {aboveTokenBalance !== undefined ? formatUnits(aboveTokenBalance, 18) : '0'} ABOVE</p>
      )}
    </div>
  );
};

export default WalletStatus;
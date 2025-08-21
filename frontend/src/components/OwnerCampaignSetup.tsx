// frontend/src/components/OwnerCampaignSetup.tsx
import React, { useState } from 'react';
// Import Wagmi hooks for reading owner and writing to the contract
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
// Import contract configuration
import { CONTRACT_ADDRESSES, ABOVE_BALLOT_ABI } from '../contracts/contractConfig';

const OwnerCampaignSetup: React.FC = () => {
  const { address, isConnected } = useAccount();

  // --- Check if the connected user is the owner ---
  const { data: ownerAddress, isLoading: isOwnerLoading, isError: isOwnerError } = useReadContract({
    address: CONTRACT_ADDRESSES.aboveBallot,
    abi: ABOVE_BALLOT_ABI,
    functionName: 'owner',
  });

  const isOwner = isConnected && ownerAddress && address?.toLowerCase() === ownerAddress.toLowerCase();
  const isOwnerCheckComplete = !isOwnerLoading && !isOwnerError;

  // --- State for form inputs ---
  const [choices, setChoices] = useState<string[]>(['', '']); // Start with two empty choices
  const [isSingleVote, setIsSingleVote] = useState<boolean>(true); // Default to single vote
  // --- NEW: State for campaign description ---
  const [campaignDescription, setCampaignDescription] = useState<string>('');
  // --- END OF NEW CODE ---

  // --- State for transaction handling ---
  const [txStatus, setTxStatus] = useState<string>(''); // For general status messages
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // Overall submission state

  // --- Wagmi hooks for writing the transactions ---
  // Transaction 1: setBasicCampaign
  const { data: hash1, isPending: isPending1, writeContract: writeContract1 } = useWriteContract();
  // Transaction 2: setCampaignDescription (optional)
  const { data: hash2, isPending: isPending2, writeContract: writeContract2 } = useWriteContract();

  // --- Wagmi hooks for waiting for transaction receipts ---
  const { isLoading: isConfirming1, isSuccess: isConfirmed1 } = useWaitForTransactionReceipt({
    hash: hash1,
  });
  const { isLoading: isConfirming2, isSuccess: isConfirmed2 } = useWaitForTransactionReceipt({
    hash: hash2,
  });

  // --- Handle form input changes ---
  const handleChoiceChange = (index: number, value: string) => {
    const newChoices = [...choices];
    newChoices[index] = value;
    setChoices(newChoices);
  };

  const addChoice = () => {
    setChoices([...choices, '']);
  };

  const removeChoice = (index: number) => {
    if (choices.length > 1) { // Ensure at least one choice remains
      const newChoices = choices.filter((_, i) => i !== index);
      setChoices(newChoices);
    }
  };

  // --- Handle form submission ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nonEmptyChoices = choices.filter(choice => choice.trim() !== '');
    if (nonEmptyChoices.length === 0) {
      alert('Please enter at least one choice.');
      return;
    }

    setIsSubmitting(true);
    setTxStatus('Initiating campaign setup...');

    try {
      // --- 1. Send setBasicCampaign transaction ---
      console.log("Sending setBasicCampaign transaction with:", nonEmptyChoices, isSingleVote);
      writeContract1({
        address: CONTRACT_ADDRESSES.aboveBallot,
        abi: ABOVE_BALLOT_ABI,
        functionName: 'setBasicCampaign',
        args: [nonEmptyChoices, isSingleVote],
      });

      // --- 2. If description is provided, send setCampaignDescription transaction ---
      // We initiate the second transaction immediately after the first.
      // The UI will show status for both.
      if (campaignDescription.trim() !== '') {
        console.log("Sending setCampaignDescription transaction with:", campaignDescription);
        writeContract2({
          address: CONTRACT_ADDRESSES.aboveBallot,
          abi: ABOVE_BALLOT_ABI,
          functionName: 'setCampaignDescription',
          args: [campaignDescription.trim()],
        });
      } else {
        // If no description, mark the second "transaction" as conceptually complete
        // This simplifies the success check logic below.
        // In a more complex app, you might track this differently.
      }

    } catch (err) {
      console.error("Error initiating transactions:", err);
      setTxStatus('Failed to initiate transaction(s). See console for details.');
      setIsSubmitting(false);
    }
  };

  // --- Determine overall success state ---
  // Consider successful if:
  // 1. The main setup tx (setBasicCampaign) is confirmed.
  // 2. If a description was provided, the description tx (setCampaignDescription) is also confirmed.
  // 3. If no description was provided, we only care about the main setup tx.
  const mainTxDone = hash1 && (isConfirmed1 || isConfirming1); // Main tx started and is processing/confirmed
  const descTxNeeded = campaignDescription.trim() !== '';
  const descTxDone = !descTxNeeded || (hash2 && (isConfirmed2 || isConfirming2)); // If needed, it's started/processing/confirmed
  const isOverallSuccess = mainTxDone && descTxDone && isConfirmed1 && (!descTxNeeded || isConfirmed2);

  // --- Render UI based on state ---
  if (!isConnected) {
    return <div className="owner-setup-section"><p>Please connect your wallet to manage campaigns.</p></div>;
  }

  if (isOwnerLoading) {
    return <div className="owner-setup-section"><p>Checking owner status...</p></div>;
  }

  if (isOwnerError) {
    return <div className="owner-setup-section"><p>Error checking owner status.</p></div>;
  }

  if (isOwnerCheckComplete && !isOwner) {
    // Optionally hide or show a message if the user is not the owner
    // For now, we'll just return null to hide the component
    return null;
    // Or, uncomment the line below to show a message:
    // return <div className="owner-setup-section"><p>You are not the owner of this contract.</p></div>;
  }

  return (
    <div className="owner-setup-section" style={{ border: '1px solid #ccc', padding: '15px', margin: '20px 0', borderRadius: '5px' }}>
      <h3>Owner: Set Up Basic Campaign</h3>
      <form onSubmit={handleSubmit}>
        {/* --- NEW: Campaign Description Input --- */}
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="campaign-description" style={{ display: 'block', marginBottom: '5px' }}>
            Tell us about your campaign (Optional):
          </label>
          <textarea
            id="campaign-description"
            value={campaignDescription}
            onChange={(e) => setCampaignDescription(e.target.value)}
            placeholder="Provide details about this voting campaign..."
            rows={4}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            maxLength={1000} // Optional character limit
            disabled={isSubmitting} // Disable while submitting
          />
          {/* Optional: Display character count */}
          {/* <div style={{ fontSize: '0.8em', color: '#666', textAlign: 'right' }}>
            {campaignDescription.length}/1000 characters
          </div> */}
        </div>
        {/* --- END OF NEW CODE --- */}

        <div>
          <label>
            <input
              type="checkbox"
              checked={isSingleVote}
              onChange={(e) => setIsSingleVote(e.target.checked)}
              disabled={isSubmitting} // Disable while submitting
            />
            Single Vote Only (Uncheck for Multiple Selections)
          </label>
        </div>
        <br />
        <h4>Choices:</h4>
        {choices.map((choice, index) => (
          <div key={index} style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '100px' }}>Choice {index + 1}:</label>
            <input
              type="text"
              value={choice}
              onChange={(e) => handleChoiceChange(index, e.target.value)}
              placeholder={`Option ${index + 1}`}
              style={{ flexGrow: 1, marginRight: '10px' }}
              disabled={isSubmitting} // Disable while submitting
            />
            <button
              type="button"
              onClick={() => removeChoice(index)}
              disabled={isSubmitting || choices.length <= 1} // Disable while submitting or if only one choice
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addChoice}
          style={{ marginRight: '10px' }}
          disabled={isSubmitting} // Disable while submitting
        >
          Add Choice
        </button>
        <button
          type="submit"
          disabled={isSubmitting || isPending1 || isPending2} // Disable while any tx is pending/submitting
        >
          {isSubmitting || isPending1 || isPending2 ? 'Processing...' : 'Set Up Campaign'}
        </button>

        {/* --- Display Transaction Status --- */}
        {(isPending1 || isConfirming1 || hash1) && (
          <div style={{ marginTop: '10px' }}>
            <strong>Main Setup Tx:</strong>
            {hash1 && <div>Hash: {hash1}</div>}
            {isPending1 && <div>Status: Awaiting confirmation...</div>}
            {isConfirming1 && <div>Status: Confirming on blockchain...</div>}
            {isConfirmed1 && <div style={{ color: 'green' }}>Status: Confirmed!</div>}
          </div>
        )}
        {descTxNeeded && (isPending2 || isConfirming2 || hash2) && (
          <div style={{ marginTop: '10px' }}>
            <strong>Description Tx:</strong>
            {hash2 && <div>Hash: {hash2}</div>}
            {isPending2 && <div>Status: Awaiting confirmation...</div>}
            {isConfirming2 && <div>Status: Confirming on blockchain...</div>}
            {isConfirmed2 && <div style={{ color: 'green' }}>Status: Confirmed!</div>}
          </div>
        )}
        {txStatus && <div style={{ marginTop: '10px' }}><strong>Status:</strong> {txStatus}</div>}
        {isOverallSuccess && (
          <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#d4edda', color: '#155724', borderRadius: '5px' }}>
            <strong>Success!</strong> Campaign setup {descTxNeeded ? 'and description ' : ''}have been submitted successfully.
          </div>
        )}
        {/* --- End of Transaction Status Display --- */}
      </form>
    </div>
  );
};

export default OwnerCampaignSetup;
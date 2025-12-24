import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Contract, Wallet } from 'ethers';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import { mockIpfsUpload } from '../utils/ipfs';
import { encryptWithAddress } from '../utils/crypto';
import '../styles/UploadPanel.css';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

type UploadPanelProps = {
  onStored: () => void;
  instance: any;
  zamaLoading: boolean;
  zamaError: string | null;
};

export function UploadPanel({ onStored, instance, zamaLoading, zamaError }: UploadPanelProps) {
  const { address } = useAccount();
  const signerPromise = useEthersSigner();

  const [file, setFile] = useState<File | null>(null);
  const [ipfsHash, setIpfsHash] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isStoring, setIsStoring] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const isContractReady = CONTRACT_ADDRESS.toLowerCase() !== ZERO_ADDRESS;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] || null;
    setFile(nextFile);
    setIpfsHash('');
    setUploadMessage('');
    setErrorMessage('');
    setTxHash('');
  };

  const handleUpload = async () => {
    if (!file) {
      setErrorMessage('Select a file before generating an IPFS hash.');
      return;
    }

    setIsUploading(true);
    setErrorMessage('');
    setUploadMessage('');

    try {
      const result = await mockIpfsUpload(file, setUploadMessage);
      setIpfsHash(result.hash);
    } catch (error) {
      console.error('IPFS upload failed:', error);
      setErrorMessage('Failed to generate IPFS hash.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleStore = async () => {
    if (!file || !ipfsHash) {
      setErrorMessage('Generate an IPFS hash first.');
      return;
    }

    if (!address || !instance || !signerPromise) {
      setErrorMessage('Connect your wallet and wait for encryption service.');
      return;
    }

    if (!isContractReady) {
      setErrorMessage('Contract address is not set yet.');
      return;
    }

    setIsStoring(true);
    setErrorMessage('');

    try {
      const keyWallet = Wallet.createRandom();
      const encryptedHash = await encryptWithAddress(keyWallet.address, ipfsHash);

      const input = instance.createEncryptedInput(CONTRACT_ADDRESS, address);
      input.addAddress(keyWallet.address);
      const encryptedInput = await input.encrypt();

      const signer = await signerPromise;
      if (!signer) {
        throw new Error('Signer not available');
      }

      const vault = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await vault.storeFile(
        file.name,
        encryptedHash,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      setTxHash(tx.hash);
      await tx.wait();

      onStored();
    } catch (error) {
      console.error('Failed to store file:', error);
      setErrorMessage('Transaction failed. Check wallet and try again.');
    } finally {
      setIsStoring(false);
    }
  };

  return (
    <div className="vault-card upload-card">
      <div className="card-header">
        <div>
          <h3>Upload & encrypt</h3>
          <p>Generate a hash and store encrypted metadata on-chain.</p>
        </div>
        <span className="chip">Local file</span>
      </div>

      <div className="upload-zone">
        <label className="file-label">
          <input type="file" onChange={handleFileChange} />
          <span>{file ? 'Replace file' : 'Choose file'}</span>
        </label>
        <div className="file-meta">
          <p className="file-name">{file ? file.name : 'No file selected'}</p>
          <p className="file-detail">
            {file ? `${Math.round(file.size / 1024)} KB · ${file.type || 'Unknown type'}` : 'Select a local file to begin.'}
          </p>
        </div>
      </div>

      <div className="action-row">
        <button
          className="primary-button"
          onClick={handleUpload}
          disabled={!file || isUploading}
        >
          {isUploading ? 'Generating hash...' : 'Generate IPFS hash'}
        </button>
        <button
          className="secondary-button"
          onClick={handleStore}
          disabled={
            !file ||
            !ipfsHash ||
            isStoring ||
            zamaLoading ||
            !address ||
            !instance ||
            !isContractReady
          }
        >
          {zamaLoading ? 'Initializing Zama...' : isStoring ? 'Storing on-chain...' : 'Encrypt & store'}
        </button>
      </div>

      {uploadMessage && (
        <div className="status-line">
          <span className="status-pill">{uploadMessage}</span>
        </div>
      )}

      {ipfsHash && (
        <div className="hash-card">
          <p className="hash-title">Generated IPFS hash</p>
          <p className="hash-value">{ipfsHash}</p>
        </div>
      )}

      {txHash && (
        <div className="hash-card">
          <p className="hash-title">Transaction submitted</p>
          <p className="hash-value">{txHash}</p>
        </div>
      )}

      {zamaError && <p className="error-text">{zamaError}</p>}
      {errorMessage && <p className="error-text">{errorMessage}</p>}
      {!isContractReady && (
        <p className="helper-text">
          Set the deployed contract address in `home/src/config/contracts.ts`.
        </p>
      )}
    </div>
  );
}

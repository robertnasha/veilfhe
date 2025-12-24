import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import { decryptWithAddress } from '../utils/crypto';
import '../styles/FileLibrary.css';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

type FileLibraryProps = {
  refreshToken: number;
  instance: any;
  zamaLoading: boolean;
};

type VaultFile = {
  index: number;
  fileName: string;
  encryptedIpfsHash: string;
  encryptedKeyAddress: string;
  createdAt: bigint;
  decryptedHash?: string;
  decryptedKey?: string;
};

export function FileLibrary({ refreshToken, instance, zamaLoading }: FileLibraryProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const signerPromise = useEthersSigner();

  const [files, setFiles] = useState<VaultFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeDecrypt, setActiveDecrypt] = useState<number | null>(null);

  const contractAddress = useMemo(() => CONTRACT_ADDRESS as `0x${string}`, []);
  const isContractReady = CONTRACT_ADDRESS.toLowerCase() !== ZERO_ADDRESS;

  const fetchFiles = useCallback(async () => {
    if (!address || !publicClient || !isContractReady) {
      setFiles([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const count = (await publicClient.readContract({
        address: contractAddress,
        abi: CONTRACT_ABI,
        functionName: 'getFileCount',
        args: [address],
      })) as bigint;

      const total = Number(count);
      if (!total) {
        setFiles([]);
        return;
      }

      const entries = await Promise.all(
        Array.from({ length: total }, async (_value, index) => {
          const file = (await publicClient.readContract({
            address: contractAddress,
            abi: CONTRACT_ABI,
            functionName: 'getFile',
            args: [address, BigInt(index)],
          })) as readonly [string, string, string, bigint];

          return {
            index,
            fileName: file[0] as string,
            encryptedIpfsHash: file[1] as string,
            encryptedKeyAddress: file[2] as string,
            createdAt: file[3] as bigint,
          } satisfies VaultFile;
        })
      );

      setFiles(entries);
    } catch (error) {
      console.error('Failed to fetch files:', error);
      setErrorMessage('Unable to load on-chain records.');
    } finally {
      setIsLoading(false);
    }
  }, [address, contractAddress, isContractReady, publicClient]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles, refreshToken]);

  const decryptFile = async (file: VaultFile) => {
    if (!instance || !address || !signerPromise) {
      setErrorMessage('Connect your wallet and wait for the encryption service.');
      return;
    }

    setActiveDecrypt(file.index);
    setErrorMessage('');

    try {
      const keypair = instance.generateKeypair();
      const handleContractPairs = [
        {
          handle: file.encryptedKeyAddress,
          contractAddress: CONTRACT_ADDRESS,
        },
      ];

      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';
      const contractAddresses = [CONTRACT_ADDRESS];

      const eip712 = instance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimeStamp,
        durationDays
      );

      const signer = await signerPromise;
      if (!signer) {
        throw new Error('Signer not available');
      }

      const signature = await signer.signTypedData(
        eip712.domain,
        {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        eip712.message
      );

      const result = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays
      );

      const decryptedKey = result[file.encryptedKeyAddress as string] as string;
      if (!decryptedKey) {
        throw new Error('Missing decrypted key');
      }
      const decryptedHash = await decryptWithAddress(decryptedKey, file.encryptedIpfsHash);

      setFiles((prev) =>
        prev.map((item) =>
          item.index === file.index
            ? { ...item, decryptedHash, decryptedKey }
            : item
        )
      );
    } catch (error) {
      console.error('Decrypt failed:', error);
      setErrorMessage('Failed to decrypt the selected file record.');
    } finally {
      setActiveDecrypt(null);
    }
  };

  return (
    <div className="vault-card library-card">
      <div className="card-header">
        <div>
          <h3>Your vault</h3>
          <p>Review encrypted entries stored for your wallet.</p>
        </div>
        <span className="chip">On-chain</span>
      </div>

      {!isContractReady && (
        <p className="helper-text">
          Set the deployed contract address in `home/src/config/contracts.ts`.
        </p>
      )}

      {!address && <p className="empty-text">Connect your wallet to load stored files.</p>}
      {address && isLoading && <p className="empty-text">Loading files...</p>}
      {address && !isLoading && files.length === 0 && (
        <p className="empty-text">No files stored yet. Upload one to get started.</p>
      )}

      {files.length > 0 && (
        <div className="file-list">
          {files.map((file) => (
            <div className="file-card" key={`${file.fileName}-${file.index}`}>
              <div className="file-card-header">
                <div>
                  <p className="file-title">{file.fileName}</p>
                  <p className="file-subtitle">
                    Stored {new Date(Number(file.createdAt) * 1000).toLocaleString()}
                  </p>
                </div>
                <span className="chip muted">#{file.index}</span>
              </div>

              <div className="file-detail-block">
                <p className="label">Encrypted IPFS hash</p>
                <p className="hash-preview">{file.encryptedIpfsHash}</p>
              </div>

              {file.decryptedHash ? (
                <div className="file-detail-block highlight">
                  <p className="label">Decrypted IPFS hash</p>
                  <p className="hash-preview">{file.decryptedHash}</p>
                  <p className="helper-text">Key address: {file.decryptedKey}</p>
                </div>
              ) : (
                <button
                  className="secondary-button"
                  onClick={() => decryptFile(file)}
                  disabled={activeDecrypt === file.index || zamaLoading}
                >
                  {activeDecrypt === file.index ? 'Decrypting...' : 'Decrypt key & reveal hash'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {errorMessage && <p className="error-text">{errorMessage}</p>}
    </div>
  );
}

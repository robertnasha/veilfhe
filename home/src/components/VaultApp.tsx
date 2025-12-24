import { useState } from 'react';
import { Header } from './Header';
import { UploadPanel } from './UploadPanel';
import { FileLibrary } from './FileLibrary';
import { useZamaInstance } from '../hooks/useZamaInstance';
import '../styles/VaultApp.css';

export function VaultApp() {
  const [refreshToken, setRefreshToken] = useState(0);
  const { instance, isLoading, error } = useZamaInstance();

  return (
    <div className="vault-shell">
      <Header />
      <section className="vault-hero">
        <div className="hero-copy">
          <p className="hero-eyebrow">Encrypted file registry</p>
          <h2 className="hero-title">Store file fingerprints, keep the keys private.</h2>
          <p className="hero-description">
            Veil Vault keeps file names and encrypted IPFS hashes on-chain while the encryption key stays protected
            by Zama FHE. Only your wallet can decrypt it to reveal the original hash.
          </p>
          <div className="hero-tags">
            <span>FHE-protected key</span>
            <span>IPFS hash encryption</span>
            <span>Sepolia ready</span>
          </div>
        </div>
        <div className="hero-panel">
          <div className="hero-panel-title">How it works</div>
          <ol className="hero-steps">
            <li>Generate a local IPFS hash for the file.</li>
            <li>Create a random address to encrypt the hash.</li>
            <li>Store the encrypted hash + FHE key on-chain.</li>
            <li>Decrypt the key to reveal the IPFS hash.</li>
          </ol>
        </div>
      </section>

      <section className="vault-grid">
        <UploadPanel
          onStored={() => setRefreshToken((token) => token + 1)}
          instance={instance}
          zamaLoading={isLoading}
          zamaError={error}
        />
        <FileLibrary refreshToken={refreshToken} instance={instance} zamaLoading={isLoading} />
      </section>
    </div>
  );
}

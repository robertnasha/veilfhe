import { ConnectButton } from '@rainbow-me/rainbowkit';
import '../styles/Header.css';

export function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="brand">
          <div className="brand-mark" />
          <div>
            <p className="brand-title">Veil Vault</p>
            <p className="brand-subtitle">Encrypted file registry for IPFS metadata</p>
          </div>
        </div>
        <ConnectButton />
      </div>
    </header>
  );
}

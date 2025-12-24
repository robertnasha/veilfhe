# VeilFHE File Vault

VeilFHE is a privacy-first file registry that records encrypted file metadata on-chain while keeping the file content off-chain. It uses Zama FHE to protect a randomly generated key address, letting users recover their IPFS hash only after decrypting that key.

## What This Project Solves

Sharing or storing file references on-chain usually exposes the file hash publicly. This project keeps the IPFS hash encrypted and only recoverable by the file owner, while still letting the blockchain act as the immutable registry of file metadata.

## Key Advantages

- Privacy-preserving metadata: encrypted hash and encrypted key address are stored on-chain.
- Simple user flow: select a file, generate a random key address, encrypt, and store.
- No external IPFS dependency during development: a pseudo upload generates a random IPFS hash.
- Clear separation of responsibilities: UI handles crypto, contract handles storage.
- Audit-friendly records: on-chain events and timestamps for every file entry.

## How It Works

1. The user selects a local file.
2. A pseudo IPFS upload returns a random IPFS hash.
3. The app generates a random EVM address A.
4. The IPFS hash is encrypted with address A off-chain.
5. Address A is encrypted with Zama FHE and sent on-chain.
6. The contract stores: file name, encrypted IPFS hash, encrypted address A, and timestamp.
7. The user can later decrypt address A and recover the IPFS hash.

## Technology Stack

- Smart contracts: Solidity + Hardhat
- FHE: Zama FHEVM
- Frontend: React + Vite
- Wallet UI: RainbowKit
- Read calls: viem
- Write calls: ethers
- Package manager: npm

## Repository Structure

```
contracts/   Solidity contracts (VeilFileVault)
deploy/      Hardhat deploy scripts
home/        Frontend (React + Vite)
tasks/       Hardhat tasks

test/        Contract tests
```

## Smart Contract

The core contract is `VeilFileVault`:

- Stores `fileName`, `encryptedIpfsHash`, `encryptedKeyAddress`, `createdAt`
- Emits an event for every stored file
- Uses Zama FHE `eaddress` to keep the key address private
- Read functions accept an explicit user address (no implicit `msg.sender`)

## Frontend

The UI lives in `home/` and implements the full user flow:

- Local file selection and pseudo IPFS hash generation
- Random key address creation
- Off-chain encryption of the IPFS hash using address A
- Zama encryption for address A
- On-chain storage and retrieval of file records
- Decryption flow to recover the IPFS hash

Notes:

- The frontend uses the ABI generated in `deployments/sepolia`.
- No environment variables are used in the frontend.
- Reads use viem; writes use ethers.

## Development and Usage

### Prerequisites

- Node.js 20+
- npm

### Install

```bash
npm install
```

### Compile and Test

```bash
npm run compile
npm run test
```

### Local Deployment (Hardhat Node)

```bash
npx hardhat node
npx hardhat deploy --network hardhat
```

### Sepolia Deployment

Create a `.env` file (do not use a mnemonic):

```
INFURA_API_KEY=your_infura_key
PRIVATE_KEY=your_private_key
ETHERSCAN_API_KEY=optional
```

Then deploy:

```bash
npx hardhat deploy --network sepolia
```

### Useful Tasks

```bash
npx hardhat --network sepolia task:vault-address
npx hardhat --network sepolia task:vault-count --user 0x...
npx hardhat --network sepolia task:vault-store --filename "report.pdf" --hash "Qm..." --keyaddress 0x...
npx hardhat --network sepolia task:vault-file --user 0x... --index 0
```

### Frontend Development

```bash
cd home
npm install
npm run dev
```

The frontend is intended to point at Sepolia rather than a localhost network.

## Security and Limitations

- This project stores file metadata only, not file contents.
- The IPFS hash is encrypted off-chain; the blockchain never sees the plaintext hash.
- The IPFS upload step is intentionally pseudo for development speed.
- Key management is user-owned; losing the key address means the hash cannot be recovered.

## Future Plans

- Replace pseudo IPFS with real IPFS pinning and upload status.
- Add selective sharing of file records via re-encryption flows.
- Improve key recovery and backup UX.
- Add pagination and filtering for large file lists.
- Integrate audit trails and optional access policies.
- Provide an on-chain indexer for faster file discovery.

## License

BSD-3-Clause-Clear. See `LICENSE`.

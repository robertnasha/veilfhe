import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { VeilFileVault } from "../types";
import { expect } from "chai";

type Signers = {
  alice: HardhatEthersSigner;
};

describe("VeilFileVaultSepolia", function () {
  let signers: Signers;
  let vaultContract: VeilFileVault;
  let vaultContractAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const vaultDeployment = await deployments.get("VeilFileVault");
      vaultContractAddress = vaultDeployment.address;
      vaultContract = await ethers.getContractAt("VeilFileVault", vaultDeployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("stores a file record on Sepolia", async function () {
    steps = 8;

    this.timeout(4 * 40000);

    progress("Encrypting random key address...");
    const randomKeyAddress = ethers.Wallet.createRandom().address;
    const encryptedKey = await fhevm
      .createEncryptedInput(vaultContractAddress, signers.alice.address)
      .addAddress(randomKeyAddress)
      .encrypt();

    const fileName = "sepolia-demo.txt";
    const encryptedHash = "QmEncryptedHashValue";

    progress(`Call storeFile(...) VeilFileVault=${vaultContractAddress} signer=${signers.alice.address}...`);
    const tx = await vaultContract
      .connect(signers.alice)
      .storeFile(fileName, encryptedHash, encryptedKey.handles[0], encryptedKey.inputProof);
    await tx.wait();

    progress("Call getFileCount()...");
    const count = await vaultContract.getFileCount(signers.alice.address);
    expect(count).to.be.greaterThan(0);

    progress("Call getFile()...");
    const file = await vaultContract.getFile(signers.alice.address, count - 1n);
    expect(file[0]).to.eq(fileName);
    expect(file[1]).to.eq(encryptedHash);
  });
});

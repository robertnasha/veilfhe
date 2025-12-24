import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { VeilFileVault, VeilFileVault__factory } from "../types";
import { expect } from "chai";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("VeilFileVault")) as VeilFileVault__factory;
  const vaultContract = (await factory.deploy()) as VeilFileVault;
  const vaultContractAddress = await vaultContract.getAddress();

  return { vaultContract, vaultContractAddress };
}

describe("VeilFileVault", function () {
  let signers: Signers;
  let vaultContract: VeilFileVault;
  let vaultContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ vaultContract, vaultContractAddress } = await deployFixture());
  });

  it("stores a file record and returns it", async function () {
    const randomKeyAddress = ethers.Wallet.createRandom().address;
    const encryptedInput = await fhevm
      .createEncryptedInput(vaultContractAddress, signers.alice.address)
      .addAddress(randomKeyAddress)
      .encrypt();

    const fileName = "report.pdf";
    const encryptedHash = "QmEncryptedHashValue";

    const tx = await vaultContract
      .connect(signers.alice)
      .storeFile(fileName, encryptedHash, encryptedInput.handles[0], encryptedInput.inputProof);
    await tx.wait();

    const count = await vaultContract.getFileCount(signers.alice.address);
    expect(count).to.eq(1);

    const file = await vaultContract.getFile(signers.alice.address, 0);
    expect(file[0]).to.eq(fileName);
    expect(file[1]).to.eq(encryptedHash);
    expect(file[2]).to.not.eq(ethers.ZeroHash);
    expect(file[3]).to.not.eq(0);
  });
});

import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * Example:
 *   - npx hardhat --network sepolia task:vault-address
 */
task("task:vault-address", "Prints the VeilFileVault address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;

  const vault = await deployments.get("VeilFileVault");

  console.log("VeilFileVault address is " + vault.address);
});

/**
 * Example:
 *   - npx hardhat --network sepolia task:vault-count --user 0x...
 */
task("task:vault-count", "Returns the number of files stored for a user")
  .addOptionalParam("address", "Optionally specify the VeilFileVault contract address")
  .addOptionalParam("user", "User address to query")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const vaultDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("VeilFileVault");
    console.log(`VeilFileVault: ${vaultDeployment.address}`);

    const signers = await ethers.getSigners();
    const userAddress = taskArguments.user || signers[0].address;

    const vault = await ethers.getContractAt("VeilFileVault", vaultDeployment.address);
    const count = await vault.getFileCount(userAddress);
    console.log(`File count for ${userAddress}: ${count}`);
  });

/**
 * Example:
 *   - npx hardhat --network sepolia task:vault-store --filename "report.pdf" --hash "Qm..." --keyaddress 0x...
 */
task("task:vault-store", "Stores a file entry")
  .addOptionalParam("address", "Optionally specify the VeilFileVault contract address")
  .addParam("filename", "File name to store")
  .addParam("hash", "Encrypted IPFS hash")
  .addOptionalParam("keyaddress", "Random address used for encryption")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const vaultDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("VeilFileVault");
    console.log(`VeilFileVault: ${vaultDeployment.address}`);

    const signers = await ethers.getSigners();

    const vault = await ethers.getContractAt("VeilFileVault", vaultDeployment.address);
    const keyAddress = taskArguments.keyaddress || ethers.Wallet.createRandom().address;

    const encryptedValue = await fhevm
      .createEncryptedInput(vaultDeployment.address, signers[0].address)
      .addAddress(keyAddress)
      .encrypt();

    const tx = await vault
      .connect(signers[0])
      .storeFile(taskArguments.filename, taskArguments.hash, encryptedValue.handles[0], encryptedValue.inputProof);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status} keyAddress=${keyAddress}`);
  });

/**
 * Example:
 *   - npx hardhat --network sepolia task:vault-file --user 0x... --index 0
 */
task("task:vault-file", "Fetch a file record")
  .addOptionalParam("address", "Optionally specify the VeilFileVault contract address")
  .addParam("index", "File index")
  .addOptionalParam("user", "User address to query")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const vaultDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("VeilFileVault");
    console.log(`VeilFileVault: ${vaultDeployment.address}`);

    const signers = await ethers.getSigners();
    const userAddress = taskArguments.user || signers[0].address;

    const vault = await ethers.getContractAt("VeilFileVault", vaultDeployment.address);
    const file = await vault.getFile(userAddress, taskArguments.index);
    console.log(file);
  });

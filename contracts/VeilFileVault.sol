// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, eaddress, externalEaddress} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Veil File Vault
/// @notice Stores file metadata with an encrypted key address using FHE.
contract VeilFileVault is ZamaEthereumConfig {
    struct FileRecord {
        string fileName;
        string encryptedIpfsHash;
        eaddress encryptedKeyAddress;
        uint256 createdAt;
    }

    mapping(address => FileRecord[]) private _files;

    event FileStored(address indexed owner, uint256 index, string fileName, uint256 timestamp);

    /// @notice Store a new file entry for the caller.
    /// @param fileName Original file name
    /// @param encryptedIpfsHash IPFS hash encrypted off-chain with a random address
    /// @param encryptedKeyAddress Encrypted random address used for the hash encryption
    /// @param inputProof Proof for the encrypted address input
    function storeFile(
        string calldata fileName,
        string calldata encryptedIpfsHash,
        externalEaddress encryptedKeyAddress,
        bytes calldata inputProof
    ) external {
        require(bytes(fileName).length > 0, "File name required");
        require(bytes(encryptedIpfsHash).length > 0, "Encrypted hash required");

        eaddress keyAddress = FHE.fromExternal(encryptedKeyAddress, inputProof);
        FHE.allowThis(keyAddress);
        FHE.allow(keyAddress, msg.sender);

        _files[msg.sender].push(
            FileRecord({
                fileName: fileName,
                encryptedIpfsHash: encryptedIpfsHash,
                encryptedKeyAddress: keyAddress,
                createdAt: block.timestamp
            })
        );

        emit FileStored(msg.sender, _files[msg.sender].length - 1, fileName, block.timestamp);
    }

    /// @notice Return the number of files stored for a user.
    /// @param user User address to query
    function getFileCount(address user) external view returns (uint256) {
        return _files[user].length;
    }

    /// @notice Get a file record for a user.
    /// @param user User address to query
    /// @param index File index
    function getFile(
        address user,
        uint256 index
    )
        external
        view
        returns (string memory fileName, string memory encryptedIpfsHash, eaddress encryptedKeyAddress, uint256 createdAt)
    {
        require(index < _files[user].length, "Index out of bounds");
        FileRecord storage record = _files[user][index];
        return (record.fileName, record.encryptedIpfsHash, record.encryptedKeyAddress, record.createdAt);
    }
}

const assetProto = require("fob/assets");
const crypto = require("crypto");
const { createCipheriv, createDecipheriv } = require("crypto");

function PKCS5Padding(ciphertext, blockSize) {
  const padding = blockSize - (ciphertext.length % blockSize);
  const padtext = Buffer.alloc(padding, padding);
  return Buffer.concat([ciphertext, padtext]);
}

function PKCS5Trimming(encrypt) {
  const padding = encrypt[encrypt.length - 1];
  return encrypt.slice(0, encrypt.length - padding);
}

class FOBChaincode {
  AESEncryptAsset(encKey, IV, value) {
    if (IV.length !== 16) {
      throw new Error("IV is not 16 bytes");
    }
    const src = value.toString();
    const key = Buffer.from(encKey);
    const block = crypto.createCipheriv("aes-256-cbc", key, IV);
    let content = Buffer.from(src);
    content = PKCS5Padding(content, block.blockSize);
    let crypted = Buffer.alloc(content.length);
    crypted = block.update(content);
    return Buffer.concat([IV, crypted]);
  }

  AESDecryptAsset(encKey, key, stub) {
    const valueInBytes = fetch(stub, key, true);
    const data = valueInBytes.slice(16);
    const block = crypto.createDecipheriv("aes-256-cbc", encKey, valueInBytes.slice(0, 16));
    let decrypted = Buffer.alloc(data.length);
    decrypted = block.update(data);
    return PKCS5Trimming(decrypted);
  }

  getEncList(stub, assetAddress, RSAkeySeed, AESKey, userAddressList) {
    const assetEncKeysList = new assetProto.AssetEncryptionKeysList();
    assetEncKeysList.Address = assetAddress;
    assetEncKeysList.AssetAddress = assetAddress;

    const encSetList = [];
    for (const userAddress of userAddressList) {
      const user = this.getUserAsset(stub, userAddress);
      const encryptedAESKey = this.encryptAESKey(AESKey, RSAkeySeed, user.RSAPublicKey);
      const encSet = new assetProto.AssetEncryptionKeysList_EncryptionSet();
      encSet.UserAddress = user.Address;
      encSet.EncryptedAESKey = encryptedAESKey;
      encSetList.push(encSet);
    }

    assetEncKeysList.EncryptionSet = encSetList;
    return assetEncKeysList;
  }

  updateEncList(stub, RSAkeySeed, AESKey, userAddressList, assetEncKeysList) {
    const encSetList = [];
    for (const userAddress of userAddressList) {
      const user = this.getUserAsset(stub, userAddress);
      const encryptedAESKey = this.encryptAESKey(AESKey, RSAkeySeed, user.RSAPublicKey);
      const encSet = new assetProto.AssetEncryptionKeysList_EncryptionSet();
      encSet.UserAddress = user.Address;
      encSet.EncryptedAESKey = encryptedAESKey;
      encSetList.push(encSet);
    }

    assetEncKeysList.EncryptionSet = encSetList;
    return assetEncKeysList;
  }

  encryptAESKey(AESKey, RSAkeySeed, RSAPublicKeyString) {
    const block = crypto.createPublicKey(RSAPublicKeyString);
    const randomSource = Buffer.from(RSAkeySeed);
    const encryptedAESKeyBytes = crypto.publicEncrypt(
      {
        key: block,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      AESKey
    );
    const encryptedAESKey = encryptedAESKeyBytes.toString("hex");
    return encryptedAESKey;
  }

  validateRSAKey(publicKeyAsbytes) {
    const block = crypto.createPublicKey(publicKeyAsbytes);
    const pub = crypto.publicKeyToRSAPublicKeyPEM(block);
    if (pub) {
      return pub;
    } else {
      throw new Error("Key type is not RSA");
    }
  }
}



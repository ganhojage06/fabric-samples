const assetProto = require("fob/assets");
const proto = require("github.com/golang/protobuf/proto");
const shim = require("github.com/hyperledger/fabric-chaincode-go/shim");
const pb = require("github.com/hyperledger/fabric-protos-go/peer");

FOBChaincode.prototype.getUserAsset = function(stub, userAddress) {
    let UserObject = new assetProto.Account();
    let userAsbytes, err;
    [userAsbytes, err] = fetch(stub, ASSET_PREFIX_USER + userAddress, true);
    if (err != null) {
        return [UserObject, returnError("ERR_RDUSR_1", "Fetch error [User]")];
    }
    [err] = proto.Unmarshal(userAsbytes, UserObject);
    if (err != null) {
        return [UserObject, returnError("ERR_RDUSR_2", "Couldn't Unmarshal User")];
    }
    return [UserObject, null];
};

FOBChaincode.prototype.setUserAsset = function(stub, userAddress, userObject, overwrite) {
    let userAsBytes, err;
    [userAsBytes, err] = proto.Marshal(userObject);
    if (err != null) {
        return returnError("ERR_SETUSR_1", err.Error());
    }
    [err] = store(stub, ASSET_PREFIX_USER + userAddress, userAsBytes, overwrite);
    if (err != null) {
        return returnError("ERR_SETUSR_2", err.Error());
    }
    return null;
};

FOBChaincode.prototype.getAdminUserAsset = function(stub) {
    let adminObject = new assetProto.AdminUser();
    let adminUserAsBytes, err;
    [adminUserAsBytes, err] = fetch(stub, ASSET_PREFIX_ADMIN_USER, true);
    if (err != null) {
        return [adminObject, returnError("ERR_RDADMINUSR_1", "Fetch error [Admin User]")];
    }
    [err] = proto.Unmarshal(adminUserAsBytes, adminObject);
    if (err != null) {
        return [adminObject, returnError("ERR_RDADMINUSR_2", "Couldn't Unmarshal Admin User")];
    }
    return [adminObject, null];
};

FOBChaincode.prototype.setAdminUserAsset = function(stub, adminObject, overwrite) {
    let adminUserAsBytes, err;
    [adminUserAsBytes, err] = proto.Marshal(adminObject);
    if (err != null) {
        return returnError("ERR_SETADMINUSR_1", err.Error());
    }
    [err] = store(stub, ASSET_PREFIX_ADMIN_USER, adminUserAsBytes, overwrite);
    if (err != null) {
        return returnError("ERR_SETADMINUSR_2", err.Error());
    }
    return null;
};

FOBChaincode.prototype.getContractAsset = function(stub, contractAddress, AESKey) {
    let contractObject = new assetProto.Contract();
    let contartAsbytes, err;
    [contartAsbytes, err] = t.AESDecryptAsset(AESKey, ASSET_PREFIX_CONTRACT + contractAddress, stub);
    if (err != null) {
        return [contractObject, returnError("ERR_RDCONT_1", "Fetch error [Contract]")];
    }
    [err] = proto.Unmarshal(contartAsbytes, contractObject);
    if (err != null) {
        return [contractObject, returnError("ERR_RDCONT_2", "Couldn't Unmarshal Contract")];
    }
    return [contractObject, null];
};

FOBChaincode.prototype.getGenericContractAsset = function(stub, contractAddress, AESKey) {
    let contractObject = new assetProto.GenericContract();
    let contartAsbytes, err;
    [contartAsbytes, err] = t.AESDecryptAsset(AESKey, ASSET_PREFIX_CONTRACT + contractAddress, stub);
    if (err != null) {
        return [contractObject, returnError("ERR_RDCONT_1", "Fetch error [Contract]")];
    }
    [err] = proto.Unmarshal(contartAsbytes, contractObject);
    if (err != null) {
        return [contractObject, returnError("ERR_RDCONT_2", "Couldn't Unmarshal Contract")];
    }
    return [contractObject, null];
};

FOBChaincode.prototype.setContractAsset = function(stub, contractAddress, contractObject, AESKey, IV, overwrite) {
    let contractAsBytes, err;
    [contractAsBytes, err] = proto.Marshal(contractObject);
    if (err != null) {
        return returnError("ERR_SETCONT_1", err.Error());
    }
    let encryptedContractBytes;
    [encryptedContractBytes, err] = t.AESEncryptAsset(AESKey, IV, contractAsBytes);
    if (err != null) {
        return returnError("ERR_SETCONT_2", err.Error());
    }
    [err] = store(stub, ASSET_PREFIX_CONTRACT + contractAddress, encryptedContractBytes, overwrite);
    if (err != null) {
        return returnError("ERR_SETCONT_2", err.Error());
    }
    return null;
};

FOBChaincode.prototype.setGenericContractAsset = function(stub, contractAddress, contractObject, AESKey, IV, overwrite) {
    let contractAsBytes, err;
    [contractAsBytes, err] = proto.Marshal(contractObject);
    if (err != null) {
        return returnError("ERR_SETCONT_1", err.Error());
    }
    let encryptedContractBytes;
    [encryptedContractBytes, err] = t.AESEncryptAsset(AESKey, IV, contractAsBytes);
    if (err != null) {
        return returnError("ERR_SETCONT_2", err.Error());
    }
    [err] = store(stub, ASSET_PREFIX_CONTRACT + contractAddress, encryptedContractBytes, overwrite);
    if (err != null) {
        return returnError("ERR_SETCONT_2", err.Error());
    }
    return null;
};

FOBChaincode.prototype.setDiscoutingAsset = function(stub, discoutingAddress, discountingObject, AESKey, IV, overwrite) {
    let discoutingAsBytes, err;
    [discoutingAsBytes, err] = proto.Marshal(discountingObject);
    if (err != null) {
        return returnError("ERR_SETCONT_1", err.Error());
    }
    let encryptedDiscountingBytes;
    [encryptedDiscountingBytes, err] = t.AESEncryptAsset(AESKey, IV, discoutingAsBytes);
    if (err != null) {
        return returnError("ERR_SETCONT_2", err.Error());
    }
    [err] = store(stub, ASSET_PREFIX_DISCOUTING + discoutingAddress, encryptedDiscountingBytes, overwrite);
    if (err != null) {
        return returnError("ERR_SETCONT_2", err.Error());
    }
    return null;
};

FOBChaincode.prototype.getdiscountingAsset = function(stub, discountingAddress, AESKey) {
    let discountingObject = new assetProto.Discounting();
    let discountingAsbytes, err;
    [discountingAsbytes, err] = t.AESDecryptAsset(AESKey, ASSET_PREFIX_DISCOUTING + discountingAddress, stub);
    if (err != null) {
        return [discountingObject, returnError("ERR_RDCONT_1", "Fetch error [discounting]")];
    }
    [err] = proto.Unmarshal(discountingAsbytes, discountingObject);
    if (err != null) {
        return [discountingObject, returnError("ERR_RDCONT_2", "Couldn't Unmarshal discounting")];
    }
    return [discountingObject, null];
};

FOBChaincode.prototype.getEncryptionListAsset = function(stub, encryptionListAddress) {
    let encryptionListObject = new assetProto.AssetEncryptionKeysList();
    let encryptionListAsbytes, err;
    [encryptionListAsbytes, err] = fetch(stub, ASSET_PREFIX_ENC + encryptionListAddress, true);
    if (err != null) {
        return [encryptionListObject, returnError("ERR_RDENCLST_1", "Fetch error [Enc List]")];
    }
    [err] = proto.Unmarshal(encryptionListAsbytes, encryptionListObject);
    if (err != null) {
        return [encryptionListObject, returnError("ERR_RDENCLST_2", "Couldn't Unmarshal Enc List")];
    }
    return [encryptionListObject, null];
};

FOBChaincode.prototype.setEncryptionListAsset = function(stub, encryptionListAddress, encryptionListObject, overwrite) {
    let encryptionListAsbytes, err;
    [encryptionListAsbytes, err] = proto.Marshal(encryptionListObject);
    if (err != null) {
        return returnError("ERR_SETENCLST_1", err.Error());
    }
    [err] = store(stub, ASSET_PREFIX_ENC + encryptionListAddress, encryptionListAsbytes, overwrite);
    if (err != null) {
        return returnError("ERR_SETENCLST_2", err.Error());
    }
    return null;
};

FOBChaincode.prototype.setTransactionTrail = function(stub, assetAddress, assetPrefix, action, message, metadata, overwrite) {
    let transactionTrail = new assetProto.Trail();
    let trailAddress = assetPrefix + assetAddress.substring(0, 32) + stub.GetTxID().substring(0, 32);
    transactionTrail.Address = trailAddress;
    transactionTrail.AssetPrefix = assetPrefix;
    transactionTrail.AssetAddress = assetAddress;
    transactionTrail.TxnId = stub.GetTxID();
    let timestamp, millis;
    [timestamp, err] = stub.GetTxTimestamp();
    if (err != null) {
        return returnError("ERR_SETTXNTRL_1", "Timestamp Error");
    }
    millis = (timestamp.Seconds * 1000) + (timestamp.Nanos / 1000000);
    transactionTrail.Timestamp = millis;
    let userAddress;
    [userAddress, err] = getAccountAddress(stub);
    if (err != null) {
        return err;
    }
    transactionTrail.UserAddress = userAddress;
    transactionTrail.Action = action;
    transactionTrail.Message = message;
    transactionTrail.Metadata = metadata;
    let transactionTrailAsbytes;
    [transactionTrailAsbytes, err] = proto.Marshal(transactionTrail);
    if (err != null) {
        return returnError("ERR_SETTXNTRL_2", err.Error());
    }
    [err] = store(stub, ASSET_PREFIX_TRAIL + trailAddress, transactionTrailAsbytes, overwrite);
    if (err != null) {
        return returnError("ERR_SETTXNTRL_3", err.Error());
    }
    return null;
};

FOBChaincode.prototype.query = function(stub, args) {
    if (args.length < 1) {
        returnError("ERR_QUERY_1", "Fetch error [ARGS]");
    }
    let dataAsBytes, err;
    [dataAsBytes, err] = fetch(stub, args[0], true);
    if (err != null) {
        return shim.Error(returnError("ERR_QUERY_2", "Fetch error").Error());
    }
    return shim.Success(dataAsBytes);
};



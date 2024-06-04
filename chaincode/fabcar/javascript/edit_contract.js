const shim = require('fabric-shim');
const pb = require('fabric-protos');

function editContract(stub, args, tMap) {
    const requiredTMap = ['RSA_SEED', 'NEW_AESKEY', 'AESKEY', 'IV', 'CONTRACT_NUMBER'];
    if (!areAllRequiredTMapPresent(tMap, requiredTMap)) {
        return shim.error(returnError("ERR_EDITCONT_1", "Missing Transient Field(s).").Error());
    }
    const AESKey = tMap['AESKEY'];
    const aesIV = tMap['IV'];
    const newAESKey = tMap['NEW_AESKEY'];
    const RSAKeySeed = tMap['RSA_SEED'];
    let userAddressList = [];
    const contractNumber = tMap['CONTRACT_NUMBER'].toString();
    const contractAddress = getHash(contractNumber);
    let edited = '';
    let contract;
    try {
        contract = t.getContractAsset(stub, contractAddress, AESKey);
    } catch (err) {
        return shim.error(returnError("ERR_EDITCONT_2", err.Error()).Error());
    }
    const editedData = (changeName, oldValue, newValue) => {
        edited += `\n ${changeName} \n Old : ${oldValue} \n New : ${newValue} `;
    };

    userAddressList, contractParties, err = t.editParties(stub, tMap, contract.Parties, editedData);

    for (const seller of contract.Parties.Sellers) {
        userAddressList.push(seller.Address);
    }
    for (const buyer of contract.Parties.Sellers) {
        userAddressList.push(buyer.Address);
    }
    contract.Parties = contractParties;

    let adminObject;
    try {
        adminObject = t.getAdminUserAsset(stub);
    } catch (err) {
        return shim.error(returnError("ERR_EDITCONT_18", err.Error()).Error());
    }
    userAddressList.push(adminObject.Address);

    let assetEncList;
    try {
        assetEncList = t.getEncList(stub, contractAddress, RSAKeySeed, newAESKey, userAddressList);
    } catch (err) {
        return shim.error(returnError("ERR_EDITCONT_19", err.Error()).Error());
    }
    try {
        t.setEncryptionListAsset(stub, contractAddress, assetEncList, true);
    } catch (err) {
        return shim.error(returnError("ERR_EDITCONT_20", err.Error()).Error());
    }

    try {
        t.setContractAsset(stub, contractAddress, contract, newAESKey, aesIV, true);
    } catch (err) {
        return shim.error(returnError("ERR_EDITCONT_21", err.Error()).Error());
    }

    try {
        t.setTransactionTrail(stub, contractAddress, ASSET_PREFIX_CONTRACT, assetProto.Action_ACTION_UPDATE_CONTRACT,
            "Contact Edited" + edited, "", false);
    } catch (err) {
        return shim.error(returnError("ERR_EDITCONT_22", err.Error()).Error());
    }

    return shim.success(Buffer.from("Contact updated successfully"));
}

function editGenericContract(stub, args, tMap) {
    const requiredTMap = ['RSA_SEED', 'NEW_AESKEY', 'AESKEY', 'IV', 'ASSET_NUMBER'];
    if (!areAllRequiredTMapPresent(tMap, requiredTMap)) {
        return shim.error(returnError("ERR_EDITCONT_1", "Missing Transient Field(s).").Error());
    }
    const AESKey = tMap['AESKEY'];
    const aesIV = tMap['IV'];
    const newAESKey = tMap['NEW_AESKEY'];
    const RSAKeySeed = tMap['RSA_SEED'];
    const assetNumber = tMap['ASSET_NUMBER'].toString();
    const contractAddress = getHash(assetNumber);
    let contract;
    try {
        contract = t.getGenericContractAsset(stub, contractAddress, AESKey);
    } catch (err) {
        return shim.error(returnError("ERR_EDITCONT_2", err.Error()).Error());
    }
    let userAddressList = [];
    if (tMap['STAKE_HOLDERS'].length !== 0) {
        const jsonString = tMap['STAKE_HOLDERS'].toString();
        const stakeHolders = JSON.parse(jsonString);

        for (let i = 0; i < stakeHolders.length; i++) {
            userAddressList.push(stakeHolders[i].Address);
            const userType = stakeHolders[i].Role;
            const [userRoleCheck, , err] = t.checkUserType(stub, stakeHolders[i].Address, userType);
            if (err) {
                return shim.error(returnError("ERR_CHECK_USERTYPE_1", err.Error()).Error());
            }
            if (!userRoleCheck) {
                return shim.error(returnError("ERR_ADDPARTIES_1", "Error while checking stakeholder user type").Error());
            }
        }
        contract.StakeHoldersList = stakeHolders;
    }
    if (tMap['CONTRACT_DATA'].length !== 0) {
        contract.ContractData = tMap['CONTRACT_DATA'].toString();
    }

    let adminObject;
    try {
        adminObject = t.getAdminUserAsset(stub);
    } catch (err) {
        return shim.error(returnError("ERR_EDITCONT_18", err.Error()).Error());
    }
    userAddressList.push(adminObject.Address);

    let assetEncList;
    try {
        assetEncList = t.getEncList(stub, contractAddress, RSAKeySeed, newAESKey, userAddressList);
    } catch (err) {
        return shim.error(returnError("ERR_EDITCONT_19", err.Error()).Error());
    }
    try {
        t.setEncryptionListAsset(stub, contractAddress, assetEncList, true);
    } catch (err) {
        return shim.error(returnError("ERR_EDITCONT_20", err.Error()).Error());
    }

    try {
        t.setGenericContractAsset(stub, contractAddress, contract, newAESKey, aesIV, true);
    } catch (err) {
        return shim.error(returnError("ERR_EDITCONT_21", err.Error()).Error());
    }

    try {
        t.setTransactionTrail(stub, contractAddress, ASSET_PREFIX_CONTRACT, assetProto.Action_ACTION_UPDATE_CONTRACT,
            "Contact Edited", "", false);
    } catch (err) {
        return shim.error(returnError("ERR_EDITCONT_22", err.Error()).Error());
    }

    return shim.success(Buffer.from("Contact updated successfully"));
}

function editParties(stub, tMap, contractParties, editedData) {
    let userAddressList = [];
    let err;

    let shipperParties = contractParties.Shippers;
    [shipperParties, err] = t.editParty(stub,
        tMap['SHIPPER_ADDRESS'].toString(),
        assetProto.UserType_USER_TYPE_SHIPPER, shipperParties, "", "Shipper", editedData);
    if (err) {
        return [userAddressList, contractParties, returnError("ERR_EDITPARTIES_9", err.Error())];
    }
    for (const party of shipperParties) {
        userAddressList.push(party.Address);
    }

    let brokerParties = contractParties.Brokers;
    [brokerParties, err] = t.editParty(stub, tMap['BROKER_ADDRESS'].toString(),
        assetProto.UserType_USER_TYPE_BROKER, brokerParties, "", "Broker", editedData);
    if (err) {
        return [userAddressList, contractParties, returnError("ERR_EDITPARTIES_10", err.Error())];
    }
    for (const party of brokerParties) {
        userAddressList.push(party.Address);
    }

    let inspectorParties = contractParties.Brokers;

    [inspectorParties, err] = t.editParty(stub,
        tMap['INSPECTOR_SELLER_ADDRESS'].toString(),
        assetProto.UserType_USER_TYPE_INSPECTOR, inspectorParties,
        "seller", "Inspector", editedData);
    if (err) {
        return [userAddressList, contractParties, returnError("ERR_EDITPARTIES_11", err.Error())];
    }

    [inspectorParties, err] = t.editParty(stub,
        tMap['INSPECTOR_BUYER_ADDRESS'].toString(),
        assetProto.UserType_USER_TYPE_INSPECTOR, inspectorParties,
        "buyer", "Inspector", editedData);
    if (err) {
        return [userAddressList, contractParties, returnError("ERR_EDITPARTIES_12", err.Error())];
    }

    [inspectorParties, err] = t.editParty(stub,
        tMap['INSPECTOR_THIRD_PARTY_ADDRESS'].toString(),
        assetProto.UserType_USER_TYPE_INSPECTOR, inspectorParties,
        "third party", "Inspector", editedData);
    if (err) {
        return [userAddressList, contractParties, returnError("ERR_EDITPARTIES_13", err.Error())];
    }
    for (const party of inspectorParties) {
        userAddressList.push(party.Address);
    }

    let insurerParties = contractParties.Insurers;

    [insurerParties, err] = t.editParty(stub,
        tMap['INSURER_COMMODITY_ADDRESS'].toString(),
        assetProto.UserType_USER_TYPE_INSURER, insurerParties,
        "commodity", "Insurer", editedData);
    if (err) {
        return [userAddressList, contractParties, returnError("ERR_EDITPARTIES_14", err.Error())];
    }

    [insurerParties, err] = t.editParty(stub,
        tMap['INSURER_TRADE_ADDRESS'].toString(),
        assetProto.UserType_USER_TYPE_INSURER, insurerParties,
        "trade", "Insurer", editedData);
    if (err) {
        return [userAddressList, contractParties, returnError("ERR_EDITPARTIES_15", err.Error())];
    }
    for (const party of insurerParties) {
        userAddressList.push(party.Address);
    }

    let bankParties = contractParties.Banks;

    [bankParties, err] = t.editParty(stub,
        tMap['BANK_SUPPLIER_ADDRESS'].toString(),
        assetProto.UserType_USER_TYPE_BANK, bankParties,
        "supplier", "Bank", editedData);
    if (err) {
        return [userAddressList, contractParties, returnError("ERR_EDITPARTIES_16", err.Error())];
    }

    [bankParties, err] = t.editParty(stub,
        tMap['BANK_BUYER_ADDRESS'].toString(),
        assetProto.UserType_USER_TYPE_BANK, bankParties,
        "buyer", "Bank", editedData);
    if (err) {
        return [userAddressList, contractParties, returnError("ERR_EDITPARTIES_17", err.Error())];
    }
    for (const party of bankParties) {
        userAddressList.push(party.Address);
    }

    return [userAddressList, contractParties, null];
}

function editParty(stub, partyAddress, userType, parties, partySubType, partyPrettyName, editedData) {
    if (partyAddress !== "") {
        for (const party of parties) {
            if (party.SubUserType === partySubType) {
                let changeName = partyPrettyName;
                if (partySubType !== "") {
                    changeName = changeName + " : " + partySubType;
                 }
                editedData(changeName, party.Address, partyAddress);
                party.Address = partyAddress;
            }
        }
        const [partyCheck, , err] = t.checkUserType(stub, partyAddress, userType);
        if (err) {
            return [parties, returnError("ERR_EDITPARTY_1", "Error while checking " + partyPrettyName + " type")];
        }
        if (!partyCheck) {
            return [parties, returnError("ERR_EDITPARTY_2", partyPrettyName + " address does not have " +
                partyPrettyName + " type")];
        }
    }
    return [parties, null];
}



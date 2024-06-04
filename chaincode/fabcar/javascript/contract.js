const shim = require('fabric-shim');
const pb = require('fabric-protos');

function addContract(stub, args, tMap) {
    const requiredTMap = [AESKEY, IV, RSA_SEED, CONTRACT_NUMBER,
        SELLER_ADDRESS, BUYER_ADDRESS, QUANTITY, LAYCAN_START_TIME,
        LAYCAN_END_TIME, PRICE, DOCUMENTS];
    if (!areAllRequiredTMapPresent(tMap, requiredTMap)) {
        return shim.error(returnError("ERR_ADDCONT_1",
            "Missing Transient Field(s).").error());
    }
    let err;
    
    const contractVersion = "1";
    
    const AESKey = tMap[AESKEY];
    const RSAKeySeed = tMap[RSA_SEED];
    const aesIV = tMap[IV];
    
    const commodityName = tMap[COMMODITY_NAME].toString();
    const specifications = tMap[SPECIFICATIONS].toString();
    const contractTNC = tMap[CONTRACT_TNC].toString();
    const laycanStartTime = tMap[LAYCAN_START_TIME].toString();
    const laycanEndTime = tMap[LAYCAN_END_TIME].toString();
    const dateOfShipment = tMap[DATE_OF_SHIPMENT].toString();
    const rejectionLevel = tMap[REJECTION_LEVEL].toString();
    const rejectionLevelFloat = parseFloat(rejectionLevel);
    if (!isNaN(rejectionLevelFloat)) {
        console.log(rejectionLevelFloat);
    }
    const documents = JSON.parse(tMap[DOCUMENTS].toString());
    if (!documents) {
        console.log("Documents not provided");
        return shim.error(returnError("ERR_ADDCONT_2.1", "Documents not provided").error());
    }
    const documentNameList = [];
    const documentInfoList = [];
    for (const key in documents) {
        documentNameList.push(key);
        documentInfoList.push(documents[key]);
    }
    
    const contract = {};
    
    const contractNumber = tMap[CONTRACT_NUMBER].toString();
    if (contractNumber !== "") {
        contract.ContractNumber = contractNumber;
    } else {
        return shim.error(returnError("ERR_ADDCONT_2", "Blank contract Number").error());
    }
    
    const contractType = parseInt(tMap[CONTRACT_TYPE].toString());
    if (!isNaN(contractType)) {
        contract.ContractType = contractType;
    } else {
        return shim.error(returnError("ERR_ADDCONT_3", "Parsing error in contract type").error());
    }
    contract.DocumentNameList = documentNameList;
    contract.DocumentInfoList = documentInfoList;
    const contractAddress = getHash(contractNumber);
    contract.Address = contractAddress;
    contract.ContractVersion = contractVersion;
    contract.CommodityName = commodityName;
    contract.Specifications = specifications;
    contract.Tnc = contractTNC;
    
    let userAddressList;
    let contractParties;
    [userAddressList, contractParties, err] = addParties(stub, tMap);
    if (err) {
        return shim.error(returnError("ERR_ADDCONT_4", err.message).error());
    }
    contract.Parties = contractParties;
    
    const paymentType = parseInt(tMap[PAYMENT_TYPE].toString());
    if (!isNaN(paymentType)) {
        contract.PaymentType = paymentType;
    } else {
        return shim.error(returnError("ERR_ADDCONT_5", "Parsing error in contract payment type").error());
    }
    const quantity = tMap[QUANTITY].toString();
    contract.Quantity = quantity;
    contract.MeasuringUnit = tMap[MEASURING_UNIT].toString();
    contract.TotalAmount = tMap[TOTAL_AMOUNT].toString();
    contract.CurrencyCode = tMap[CURRENCY_CODE].toString();
    contract.DateOfShipment = dateOfShipment;
    contract.RejectionLevel = rejectionLevelFloat;
    contract.LoadPort = tMap[LOAD_PORT].toString();
    contract.UnloadPort = tMap[UNLOAD_PORT].toString();
    contract.LoadCountryCode = tMap[LOAD_COUNTRY_CODE].toString();
    contract.UnloadCountryCode = tMap[UNLOAD_COUNTRY_CODE].toString();
    contract.InvoiceAddress = "";
    contract.LCAddress = "";
    const laycanStartTimeInt = parseInt(laycanStartTime);
    if (!isNaN(laycanStartTimeInt)) {
        contract.LaycanStartTime = laycanStartTimeInt;
    } else {
        return shim.error(returnError("ERR_ADDCONT_15", "laycanStartTime is not Int type").error());
    }
    const laycanEndTimeInt = parseInt(laycanEndTime);
    if (!isNaN(laycanEndTimeInt)) {
        contract.LaycanEndTime = laycanEndTimeInt;
    } else {
        return shim.error(returnError("ERR_ADDCONT_16", "laycanEndTime is not Int type").error());
    }
    const contactReferences = [];
    if (tMap[CONTRACT_REFERENCE].toString() !== "") {
        const contactReference = {};
        contactReference.ContractAddress = tMap[CONTRACT_REFERENCE].toString();
        contactReference.Relation = "CRR_CRR_PREVIOUS";
        contactReferences.push(contactReference);
    }
    contract.ContractReferences = contactReferences;
    contract.LOCAddress = tMap[LOC_ADDRESS].toString();
    const price = tMap[PRICE].toString();
    contract.Price = price;
    
    console.log(contract);
    err = setContractAsset(stub, contractAddress, contract, AESKey, aesIV, false);
    if (err) {
        return shim.error(returnError("ERR_ADDCONT_17", err.message).error());
    }
    
    let adminObject;
    [adminObject, err] = getAdminUserAsset(stub);
    if (err) {
        return shim.error(returnError("ERR_ADDCONT_18", err.message).error());
    }
    userAddressList.push(adminObject.Address);
    console.log(userAddressList);
    
    let assetEncList;
    [assetEncList, err] = getEncList(stub, contractAddress, RSAKeySeed, AESKey, userAddressList);
    if (err) {
        return shim.error(returnError("ERR_ADDCONT_19", err.message).error());
    }
    console.log(assetEncList);
    err = setEncryptionListAsset(stub, contractAddress, assetEncList, false);
    if (err) {
        return shim.error(returnError("ERR_ADDCONT_20", err.message).error());
    }
    
    err = setTransactionTrail(stub, contractAddress, ASSET_PREFIX_CONTRACT, "ACTION_INITIALIZE_CONTRACT",
        "Contact Added", "", false);
    if (err) {
        return shim.error(returnError("ERR_ADDCONT_31", err.message).error());
    }
    
    return shim.success(Buffer.from("Contact added successfully"));
}

function addGenericContract(stub, args, tMap) {
    const requiredTMap = [AESKEY, IV, RSA_SEED, ASSET_NUMBER, STAKE_HOLDERS, CONTRACT_DATA, DOCUMENTS];
    if (!areAllRequiredTMapPresent(tMap, requiredTMap)) {
        return shim.error(returnError("ERR_ADDCONT_1",
            "Missing Transient Field(s).").error());
    }
    let err;
    
    const contractVersion = "1";
    
    const AESKey = tMap[AESKEY];
    const RSAKeySeed = tMap[RSA_SEED];
    const aesIV = tMap[IV];
    
    const documents = JSON.parse(tMap[DOCUMENTS].toString());
    if (!documents) {
        console.log("Documents not provided");
        return shim.error(returnError("ERR_ADDCONT_2.1", "Documents not provided").error());
    }
    const documentNameList = [];
    const documentInfoList = [];
    for (const key in documents) {
        documentNameList.push(key);
        documentInfoList.push(documents[key]);
    }
    
    const contract = {};
    
    const assetNumber = tMap[ASSET_NUMBER].toString();
    if (assetNumber !== "") {
        contract.AssetNumber = assetNumber;
    } else {
        return shim.error(returnError("ERR_ADDCONT_2", "Blank contract Number").error());
    }
    
    const contractType = parseInt(tMap[CONTRACT_TYPE].toString());
    if (!isNaN(contractType)) {
        contract.ContractType = contractType;
    } else {
        return shim.error(returnError("ERR_ADDCONT_3", "Parsing error in contract type").error());
    }
    contract.DocumentNameList = documentNameList;
    contract.DocumentInfoList = documentInfoList;
    const contractAddress = getHash(assetNumber);
    contract.Address = contractAddress;
    contract.ContractVersion = contractVersion;
    contract.ServiceName = tMap[SERVICE_NAME].toString();
    contract.ContractData = tMap[CONTRACT_DATA].toString();
    
    const jsonString = tMap[STAKE_HOLDERS].toString();
    const stakeHolders = JSON.parse(jsonString);
    const userAddressList = [];
    contract.StakeHoldersList = stakeHolders;
    for (let i = 0; i < stakeHolders.length; i++) {
        userAddressList.push(stakeHolders[i].Address);
        const userType = stakeHolders[i].Role;
        const [userRoleCheck, , err] = checkUserType(stub, stakeHolders[i].Address, userType);
        if (err) {
            return shim.error(returnError("ERR_CHECK_USERTYPE_1", err.message).error());
        }
        if (!userRoleCheck) {
            return shim.error(returnError("ERR_ADDPARTIES_1", "Error while checking stakeholder user type").error());
        }
    }
    
    console.log(contract);
    err = setGenericContractAsset(stub, contractAddress, contract, AESKey, aesIV, false);
    if (err) {
        return shim.error(returnError("ERR_ADDCONT_17", err.message).error());
    }
    
    let adminObject;
    [adminObject, err] = getAdminUserAsset(stub);
    if (err) {
        return shim.error(returnError("ERR_ADDCONT_18", err.message).error());
    }
    userAddressList.push(adminObject.Address);
    console.log(userAddressList);
    
    let assetEncList;
    [assetEncList, err] = getEncList(stub, contractAddress, RSAKeySeed, AESKey, userAddressList);
    if (err) {
        return shim.error(returnError("ERR_ADDCONT_19", err.message).error());
    }
    console.log(assetEncList);
    err = setEncryptionListAsset(stub, contractAddress, assetEncList, false);
    if (err) {
        return shim.error(returnError("ERR_ADDCONT_20", err.message).error());
    }
    
    err = setTransactionTrail(stub, contractAddress, ASSET_PREFIX_CONTRACT, "ACTION_INITIALIZE_CONTRACT",
        "Contact Added", "", false);
    if (err) {
        return shim.error(returnError("ERR_ADDCONT_31", err.message).error());
    }
    
    return shim.success(Buffer.from("Contact added successfully"));
}

function addParties(stub, tMap) {
    const userAddressList = [];
    const contractParties = {};
    let err;
    
    const sellerParties = [];
    const sellerAddress = tMap[SELLER_ADDRESS].toString();
    if (sellerAddress !== "") {
        const sellerParty = {};
        sellerParty.Address = sellerAddress;
        sellerParties.push(sellerParty);
        userAddressList.push(sellerAddress);
        const [supplierCheck, , err] = checkUserType(stub, sellerAddress, "USER_TYPE_SUPPLIER");
        if (err) {
            return [userAddressList, contractParties, returnError("ERR_ADDPARTIES_1", err.message)];
        }
        const [traderCheck, , err] = checkUserType(stub, sellerAddress, "USER_TYPE_TRADER");
        if (err) {
            return [userAddressList, contractParties, returnError("ERR_ADDPARTIES_2", err.message)];
        }
        if (!supplierCheck && !traderCheck) {
            return [userAddressList, contractParties, returnError("ERR_ADDPARTIES_3", "Supplier address does not have supplier or trader type")];
        }
    } else {
        return [userAddressList, contractParties, returnError("ERR_ADDPARTIES_4", "Blank seller Address")];
    }
    contractParties.Sellers = sellerParties;
    
    const buyerParties = [];
    const buyerAddress = tMap[BUYER_ADDRESS].toString();
    if (buyerAddress !== "") {
        const buyerParty = {};
        buyerParty.Address = buyerAddress;
        buyerParties.push(buyerParty);
        userAddressList.push(buyerAddress);
        const [buyerCheck, , err] = checkUserType(stub, buyerAddress, "USER_TYPE_BUYER");
        if (err) {
            return [userAddressList, contractParties, returnError("ERR_ADDPARTIES_5", err.message)];
        }
        const [traderCheck, , err] = checkUserType(stub, buyerAddress, "USER_TYPE_TRADER");
        if (err) {
            return [userAddressList, contractParties, returnError("ERR_ADDPARTIES_6", err.message)];
        }
        if (!buyerCheck && !traderCheck) {
            return [userAddressList, contractParties, returnError("ERR_ADDPARTIES_7", "Buyer address does not have buyer or trader type")];
        }
    } else {
        return [userAddressList, contractParties, returnError("ERR_ADDPARTIES_8", "Blank buyer Address")];
    }
    contractParties.Buyers = buyerParties;
    
    const shipperParties = [];
    [shipperParties, userAddressList, err] = addParty(stub,
        tMap[SHIPPER_ADDRESS].toString(), true,
        "USER_TYPE_SHIPPER", shipperParties,
        userAddressList, "", "Shipper");
    if (err) {
        return [userAddressList, contractParties, returnError("ERR_ADDPARTIES_9", err.message)];
    }
    contractParties.Shippers = shipperParties;
    
    const brokerParties = [];
    [brokerParties, userAddressList, err] = addParty(stub,
        tMap[BROKER_ADDRESS].toString(), true,
        "USER_TYPE_BROKER", brokerParties,
        userAddressList, "", "Broker");
    if (err) {
        return [userAddressList, contractParties, returnError("ERR_ADDPARTIES_10", err.message)];
    }
    contractParties.Brokers = brokerParties;
    
    const inspectorParties = [];
    
    [inspectorParties, userAddressList, err] = addParty(stub,
        tMap[INSPECTOR_SELLER_ADDRESS].toString(), true,
        "USER_TYPE_INSPECTOR", inspectorParties,
        userAddressList, "seller", "Inspector");
    if (err) {
        return [userAddressList, contractParties, returnError("ERR_ADDPARTIES_11", err.message)];
    }
    
    [inspectorParties, userAddressList, err] = addParty(stub,
        tMap[INSPECTOR_BUYER_ADDRESS].toString(), true,
        "USER_TYPE_INSPECTOR", inspectorParties,
        userAddressList, "buyer", "Inspector");
    if (err) {
        return [userAddressList, contractParties, returnError("ERR_ADDPARTIES_12", err.message)];
    }
    
    [inspectorParties, userAddressList, err] = addParty(stub,
        tMap[INSPECTOR_THIRD_PARTY_ADDRESS].toString(), true,
        "USER_TYPE_INSPECTOR", inspectorParties,
        userAddressList, "third party", "Inspector");
    if (err) {
        return [userAddressList, contractParties, returnError("ERR_ADDPARTIES_13", err.message)];
    }
    contractParties.Brokers = inspectorParties;
    
    const insurerParties = [];
    
    [insurerParties, userAddressList, err] = addParty(stub,
        tMap[INSURER_COMMODITY_ADDRESS].toString(), true,
        "USER_TYPE_INSURER", insurerParties,
        userAddressList, "commodity", "Insurer");
    if (err) {
        return [userAddressList, contractParties, returnError("ERR_ADDPARTIES_14", err.message)];
    }
    
    [insurerParties, userAddressList, err] = addParty(stub,
        tMap[INSURER_TRADE_ADDRESS].toString(), true,
        "USER_TYPE_INSURER", insurerParties,
        userAddressList, "trade", "Insurer");
    if (err) {
        return [userAddressList, contractParties, returnError("ERR_ADDPARTIES_15", err.message)];
    }
    contractParties.Insurers = insurerParties;
    
    const bankParties = [];
    
    [bankParties, userAddressList, err] = addParty(stub,
        tMap[BANK_SUPPLIER_ADDRESS].toString(), true,
        "USER_TYPE_BANK", bankParties,
        userAddressList, "supplier", "Bank");
    if (err) {
        return [userAddressList, contractParties, returnError("ERR_ADDPARTIES_16", err.message)];
    }
    
    [bankParties, userAddressList, err] = addParty(stub,
        tMap[BANK_BUYER_ADDRESS].toString(), true,
        "USER_TYPE_BANK", bankParties,
        userAddressList, "buyer", "Bank");
    if (err) {
        return [userAddressList, contractParties, returnError("ERR_ADDPARTIES_17", err.message)];
    }
    contractParties.Banks = bankParties;
    
    return [userAddressList, contractParties, null];
}

function addParty(stub, partyAddress, isOptional, userType, parties, userAddressList, partySubType, partyPrettyName) {
    if (partyAddress !== "") {
        const party = {};
        party.Address = partyAddress;
        party.SubUserType = partySubType;
        const [partyCheck, , err] = checkUserType(stub, partyAddress, userType);
        if (err) {
            return [parties, userAddressList,
                returnError("ERR_ADDPARTY_1", "Error while checking " + partyPrettyName + " type")];
        }
        if (!partyCheck) {
            return [parties, userAddressList,
                returnError("ERR_ADDPARTY_2", partyPrettyName + " address does not have " +
                    partyPrettyName + " type")];
        }
        parties.push(party);
        userAddressList.push(partyAddress);
    } else if (!isOptional) {
        return [parties, userAddressList,
            returnError("ERR_ADDPARTY_3", partyPrettyName + " with sub type : '" + partySubType + "' is not optional")];
    }
    return [parties, userAddressList, null];
}



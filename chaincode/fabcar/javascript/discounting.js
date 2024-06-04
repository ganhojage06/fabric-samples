const binary = require('encoding/binary');
const json = require('encoding/json');
const fmt = require('fmt');
const assetProto = require('fob/assets');
const strconv = require('strconv');
const shim = require('github.com/hyperledger/fabric-chaincode-go/shim');
const pb = require('github.com/hyperledger/fabric-protos-go/peer');

function createDiscouting(stub, args, tMap) {
    const requiredTMap = [AESKEY, IV, RSA_SEED, FINANCE_ID, BUYER_ADDRESS, BANK_ADDRESS,
        REQUESTED_AMOUNT, APPROVED_AMOUNT, DISCOUNTING_TYPE, REFERENCE_ID, REFERENCE_DATE, REFERENCE_AMOUNT, DOCUMENTS];
    if (!areAllRequiredTMapPresent(tMap, requiredTMap)) {
        return shim.Error(returnError("ERR_ADDDISCOUTING_1", "Missing Transient Field(s).").Error());
    }
    let err;
    const userAddressList = [];
    const AESKey = tMap[AESKEY];
    const RSAKeySeed = tMap[RSA_SEED];
    const IV = tMap[IV];
    const requestedAmount = String(tMap[REQUESTED_AMOUNT]);
    const requestedAmountAsFloat = parseFloat(requestedAmount);
    if (isNaN(requestedAmountAsFloat)) {
        return shim.Error(returnError("ERR_ADDDISCOUTING_1", "requested amount must be a float as string").Error());
    }
    const approvedAmount = String(tMap[APPROVED_AMOUNT]);
    const approvedAmountAsFloat = parseFloat(approvedAmount);
    if (isNaN(approvedAmountAsFloat)) {
        return shim.Error(returnError("ERR_ADDDISCOUTING_1", "approvedAmount must be a float as string").Error());
    }
    const discountingStatus = assetProto.DiscountingStatus(assetProto.DiscountingStatus_value["DISCOUTING_STATUS_APPLIED"]);
    const discountingType = binary.BigEndian.Uint32(tMap[DISCOUNTING_TYPE]);
    const discountingTypeString = assetProto.DiscountingType_name[discountingType];
    if (!discountingTypeString) {
        return shim.Error(returnError("ERR_ADDDISCOUTING_2", "Please provide a valid discouting type").Error());
    }
    const discountingTypeValue = assetProto.DiscountingType(assetProto.DiscountingType_value[discountingTypeString]);
    const referenceID = String(tMap[REFERENCE_ID]);
    const referenceDate = String(tMap[REFERENCE_DATE]);
    const referenceAmount = String(tMap[REFERENCE_AMOUNT]);
    const referenceAmountAsFloat = parseFloat(referenceAmount);
    if (isNaN(referenceAmountAsFloat)) {
        return shim.Error(returnError("ERR_ADDDISCOUTING_1", "referenceAmount must be a float as string").Error());
    }
    const financeID = String(tMap[FINANCE_ID]);
    const documents = {};
    err = json.Unmarshal(tMap[DOCUMENTS], documents);
    if (err) {
        fmt.Println(err.Error());
        return shim.Error(returnError("ERR_ADDDISCOUTING_2", "Documents not provided").Error());
    }
    const [documentNameList, documentInfoList] = documentListParse(documents);
    const discounting = new assetProto.Discounting();
    discounting.DocumentNameList = documentNameList;
    discounting.DocumentInfoList = documentInfoList;
    const sellerAddress = getAccountAddress(stub);
    if (err || !sellerAddress) {
        return shim.Error(returnError("ERR_REGUSR_6", "couldn't get user address from certificate").Error());
    }
    if (sellerAddress) {
        discounting.SellerAddress = sellerAddress;
        userAddressList.push(sellerAddress);
        const [supplierCheck, , err] = t.checkUserType(stub, sellerAddress, assetProto.UserType_USER_TYPE_SUPPLIER);
        if (err) {
            return shim.Error(returnError("ERR_ADDCONT_3", "Error while checking supplier type").Error());
        }
        const [clientCheck, , err] = t.checkUserType(stub, sellerAddress, assetProto.UserType_USER_TYPE_TRADER);
        if (err) {
            return shim.Error(returnError("ERR_ADDCONT_21", "Error while checking client type").Error());
        }
        if (!supplierCheck && !clientCheck) {
            return shim.Error(returnError("ERR_ADDCONT_22", "Supplier address does not have supplier or client type").Error());
        }
    } else {
        return shim.Error(returnError("ERR_ADDCONT_5", "Blank seller Address").Error());
    }
    const buyerAddress = String(tMap[BUYER_ADDRESS]);
    if (buyerAddress) {
        discounting.BuyerAddress = buyerAddress;
        userAddressList.push(buyerAddress);
        const [buyerCheck, , err] = t.checkUserType(stub, buyerAddress, assetProto.UserType_USER_TYPE_BUYER);
        if (err) {
            return shim.Error(returnError("ERR_ADDCONT_6", "Error while checking buyer type").Error());
        }
        const [clientCheck, , err] = t.checkUserType(stub, buyerAddress, assetProto.UserType_USER_TYPE_TRADER);
        if (err) {
            return shim.Error(returnError("ERR_ADDCONT_21", "Error while checking client type").Error());
        }
        if (!buyerCheck && !clientCheck) {
            return shim.Error(returnError("ERR_ADDCONT_24", "Buyer address does not have buyer or client type").Error());
        }
    } else {
        return shim.Error(returnError("ERR_ADDCONT_8", "Blank buyer Address").Error());
    }
    const bankAddress = String(tMap[BANK_ADDRESS]);
    if (bankAddress) {
        discounting.BankAddress = bankAddress;
        userAddressList.push(bankAddress);
        const [bankCheck, , err] = t.checkUserType(stub, bankAddress, assetProto.UserType_USER_TYPE_BANK);
        if (err) {
            return shim.Error(returnError("ERR_ADDCONT_3", "Error while checking bank type").Error());
        }
        if (!bankCheck) {
            return shim.Error(returnError("ERR_ADDCONT_22", "Bank address does not have bank type").Error());
        }
    } else {
        return shim.Error(returnError("ERR_ADDCONT_5", "Blank Bank Address").Error());
    }
    const discoutingAddress = getHash(financeID);
    discounting.Address = discoutingAddress;
    discounting.RequestedAmount = requestedAmountAsFloat;
    discounting.ApprovedAmount = approvedAmountAsFloat;
    discounting.FinanceId = financeID;
    discounting.Type = discountingTypeValue;
    discounting.Status = discountingStatus;
    discounting.ReferenceId = referenceID;
    discounting.ReferenceDate = referenceDate;
    discounting.ReferenceAmount = referenceAmountAsFloat;
    err = t.setDiscoutingAsset(stub, discoutingAddress, discounting, AESKey, IV, false);
    if (err) {
        return shim.Error(returnError("ERR_ADDCONT_17", err.Error()).Error());
    }
    const adminObject, err = t.getAdminUserAsset(stub);
    if (err) {
        return shim.Error(returnError("ERR_ADDCONT_18", err.Error()).Error());
    }
    userAddressList.push(adminObject.Address);
    console.log(userAddressList);
    const assetEncList, err = t.getEncList(stub, discoutingAddress, RSAKeySeed, AESKey, userAddressList);
    if (err) {
        return shim.Error(returnError("ERR_ADDCONT_19", err.Error()).Error());
    }
    console.log(assetEncList);
    err = t.setEncryptionListAsset(stub, discoutingAddress, assetEncList, false);
    if (err) {
        return shim.Error(returnError("ERR_ADDCONT_20", err.Error()).Error());
    }
    t.setTransactionTrail(stub, discoutingAddress, ASSET_PREFIX_DISCOUTING, assetProto.Action_ACTION_CREATE_DISCOUNTING,
        "Contact Added", "", false);
    return shim.Success(Buffer.from("Contact added successfully"));
}

function updateDiscouting(stub, args, tMap) {
    const requiredTMap = [AESKEY, IV, FINANCE_ID];
    if (!areAllRequiredTMapPresent(tMap, requiredTMap)) {
        return shim.Error(returnError("ERR_EDITCONT_1", "Missing Transient Field(s).").Error());
    }
    const AESKey = tMap[AESKEY];
    const IV = tMap[IV];
    const discountNumber = String(tMap[FINANCE_ID]);
    const discountAddress = getHash(discountNumber);
    let edited = "";
    const discounting, err = t.getdiscountingAsset(stub, discountAddress, AESKey);
    if (err) {
        return shim.Error(returnError("ERR_EDITCONT_2", err.Error()).Error());
    }
    const editedData = (changeName, oldValue, newValue) => {
        edited += fmt.Sprintf("\n %s \n Old : %v \n New : %v ",
            changeName, oldValue, newValue);
    };
    if (tMap[DISCOUTING_STATUS]) {
        const discountingStatus = binary.BigEndian.Uint32(tMap[DISCOUTING_STATUS]);
        const discountingStatusString = assetProto.DiscountingStatus_name[discountingStatus];
        if (!discountingStatusString) {
            return shim.Error(returnError("ERR_UPDATEDISCOUTING_2", "Please provide a valid status type").Error());
        }
        const discountingStatusValue = assetProto.DiscountingStatus(assetProto.DiscountingStatus_value[discountingStatusString]);
        editedData("Status Updated",
            discounting.Status, discountingStatusValue);
        discounting.Status = discountingStatusValue;
    }
    const disbursmentReference = String(tMap[DISBURSEMENT_REFERENCE]);
    if (disbursmentReference) {
        discounting.DisbursmentReference = disbursmentReference;
    }
    const repaymentReference = String(tMap[REPAYMENT_REFERENCE]);
    if (disbursmentReference) {
        discounting.RepaymentReference = repaymentReference;
    }
    const disbursmentDate = String(tMap[DISBURSEMENT_DATE]);
    if (disbursmentReference) {
        discounting.DisbursmentDate = disbursmentDate;
    }
    err = t.setDiscoutingAsset(stub, discountAddress, discounting, AESKey, IV, true);
    if (err) {
        return shim.Error(returnError("ERR_EDITCONT_3", err.Error()).Error());
    }
    t.setTransactionTrail(stub, discountAddress, ASSET_PREFIX_DISCOUTING, assetProto.Action_ACTION_UPDATE_DISCOUNTING,
        "Contact Edited" + edited, "", false);
    return shim.Success(Buffer.from("Discounting updated successfully"));
}
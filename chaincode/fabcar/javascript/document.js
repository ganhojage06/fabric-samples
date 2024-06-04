const sort = require('sort');
const pb = require('github.com/hyperledger/fabric-protos-go/peer');

function documentListParse(documents) {
    const docListLength = Object.keys(documents).length;
    const docKeys = Object.keys(documents).sort();
    const documentNameList = [];
    const documentInfoList = [];
    for (const docName of docKeys) {
        documentNameList.push(docName);
        const docInfo = documents[docName];
        const docInfoProto = new assetProto.Document();
        docInfoProto.setDocumentHash(docInfo.DocumentHash);
        docInfoProto.setTimestamp(docInfo.Timestamp);
        const authLength = Object.keys(docInfo.Auth).length;
        const authKeys = Object.keys(docInfo.Auth).sort();
        const authAddressList = [];
        const authStatusList = [];
        for (const authAddress of authKeys) {
            authAddressList.push(authAddress);
            const authInfo = docInfo.Auth[authAddress];
            const auth = new assetProto.AuthStatus();
            auth.setIsAuthorised(authInfo.IsAuthorised);
            auth.setTimestamp(authInfo.Timestamp);
            authStatusList.push(auth);
        }
        docInfoProto.setAuthAddressList(authAddressList);
        docInfoProto.setAuthStatusList(authStatusList);
        documentInfoList.push(docInfoProto);
    }
    return [documentNameList, documentInfoList];
}

function getDocumentObject(docNameList, docInfoList) {
    const documents = {};
    for (let i = 0; i < docNameList.length; i++) {
        const document = {};
        const docName = docNameList[i];
        const docInfo = docInfoList[i];
        document.DocumentHash = docInfo.getDocumentHash();
        document.Timestamp = docInfo.getTimestamp();
        const authAddressList = docInfo.getAuthAddressList();
        const authStatusList = docInfo.getAuthStatusList();
        document.Auth = {};
        for (let j = 0; j < authAddressList.length; j++) {
            const authAddress = authAddressList[j];
            const authStatus = {};
            const authInfo = authStatusList[j];
            authStatus.IsAuthorised = authInfo.getIsAuthorised();
            authStatus.Timestamp = authInfo.getTimestamp();
            document.Auth[authAddress] = authStatus;
        }
        documents[docName] = document;
    }
    return documents;
}

function authDocument(stub, args, tMap) {
    const requiredTMap = ['AESKEY', 'IV', 'CONTRACT_NUMBER', 'DOCUMENT_NAME', 'DOCUMENT_HASH'];
    if (!areAllRequiredTMapPresent(tMap, requiredTMap)) {
        return new pb.Response().setError(returnError("ERR_AUTHDOC_1", "Missing Transient Field(s).").Error());
    }
    const AESKey = tMap['AESKEY'];
    const IV = tMap['IV'];
    const contractNumber = tMap['CONTRACT_NUMBER'].toString();
    const contractAddress = getHash(contractNumber);
    const documentName = tMap['DOCUMENT_NAME'].toString();
    const contract = t.getContractAsset(stub, contractAddress, AESKey);
    if (err != null) {
        return new pb.Response().setError(returnError("ERR_AUTHDOC_2", err.Error()).Error());
    }
    const docNameList = contract.getDocumentNameList();
    const docInfoList = contract.getDocumentInfoList();
    const documents = getDocumentObject(docNameList, docInfoList);
    const userAddress = getAccountAddress(stub);
    if (err != null || userAddress === "") {
        return new pb.Response().setError(returnError("ERR_AUTHDOC_3", "couldn't get user address from certificate").Error());
    }
    const document = documents[documentName];
    if (document === undefined) {
        return new pb.Response().setError(returnError("ERR_AUTHDOC_2.2  ", documentName + " not found in tree ").Error());
    }
    if (document.Auth[userAddress] !== undefined) {
        const timestamp = stub.getTxTimestamp();
        if (err != null) {
            return new pb.Response().setError(returnError("ERR_AUTHDOC_4", "Timestamp Error").Error());
        }
        const millis = (timestamp.Seconds) * 1000 + parseInt(timestamp.Nanos / 1000000);
        const authInfo = document.Auth[userAddress];
        authInfo.Timestamp = millis;
        authInfo.IsAuthorised = true;
        document.Auth[userAddress] = authInfo;
    } else {
        return new pb.Response().setError(returnError("ERR_AUTHDOC_5", "User is not valid for authorization").Error());
    }
    documents[documentName] = document;
    const [updatedDocNameList, updatedDocInfoList] = documentListParse(documents);
    contract.setDocumentNameList(updatedDocNameList);
    contract.setDocumentInfoList(updatedDocInfoList);
    const err = t.setContractAsset(stub, contractAddress, contract, AESKey, IV, true);
    if (err != null) {
        return new pb.Response().setError(returnError("ERR_AUTHDOC_6", err.Error()).Error());
    }
    t.setTransactionTrail(stub, contractAddress, ASSET_PREFIX_CONTRACT, assetProto.Action_ACTION_AUTH_DOCUMENT,
        "Document " + documentName + "Authorised by " + userAddress, "", false);
    return new pb.Response().setSuccess(null);
}

function uploadDocument(stub, args, tMap) {
    const requiredTMap = ['AESKEY', 'IV', 'CONTRACT_NUMBER', 'DOCUMENT_NAME', 'DOCUMENT_DETAILS'];
    if (!areAllRequiredTMapPresent(tMap, requiredTMap)) {
        return new pb.Response().setError(returnError("ERR_UPLOADDOC_1", "Missing Transient Field(s).").Error());
    }
    const AESKey = tMap['AESKEY'];
    const IV = tMap['IV'];
    const contractNumber = tMap['CONTRACT_NUMBER'].toString();
    const contractAddress = getHash(contractNumber);
    const contract = t.getContractAsset(stub, contractAddress, AESKey);
    console.log(contract);
    const documentName = tMap['DOCUMENT_NAME'].toString();
    if (err != null) {
        return new pb.Response().setError(returnError("ERR_UPLOADDOC_2", err.Error()).Error());
    }
    const document = {};
    const err = JSON.parse(tMap['DOCUMENT_DETAILS'], document);
    if (err != null) {
        return new pb.Response().setError(returnError("ERR_UPLOADDOC_3", err.Error()).Error());
    }
    console.log(document);
    const documents = getDocumentObject(contract.getDocumentNameList(), contract.getDocumentInfoList());
    documents[documentName] = document;
    const [updatedDocNameList, updatedDocInfoList] = documentListParse(documents);
    contract.setDocumentNameList(updatedDocNameList);
    contract.setDocumentInfoList(updatedDocInfoList);
    const err = t.setContractAsset(stub, contractAddress, contract, AESKey, IV, true);
    if (err != null) {
        return new pb.Response().setError(returnError("ERR_AUTHDOC_6", err.Error()).Error());
    }
    t.setTransactionTrail(stub, contractAddress, ASSET_PREFIX_CONTRACT, assetProto.Action_ACTION_AUTH_DOCUMENT,
        "Document Added " + documentName, "", false);
    return new pb.Response().setSuccess(null);
}

function updateAuthPermission(stub, args, tMap) {
    const requiredTMap = ['AESKEY', 'IV', 'CONTRACT_NUMBER', 'DOCUMENT_NAME', 'USER_ARRAY'];
    if (!areAllRequiredTMapPresent(tMap, requiredTMap)) {
        return new pb.Response().setError(returnError("ERR_AUTHDOC_1", "Missing Transient Field(s).").Error());
    }
    const AESKey = tMap['AESKEY'];
    const IV = tMap['IV'];
    const contractNumber = tMap['CONTRACT_NUMBER'].toString();
    const contractAddress = getHash(contractNumber);
    const documentName = tMap['DOCUMENT_NAME'].toString();
    const contract = t.getContractAsset(stub, contractAddress, AESKey);
    if (err != null) {
        return new pb.Response().setError(returnError("ERR_AUTHDOC_2", err.Error()).Error());
    }
    const newDoc = {};
    const err = JSON.parse(tMap['DOCUMENT_DETAILS'], newDoc);
    if (err != null) {
        return new pb.Response().setError(returnError("ERR_UPLOADDOC_3", err.Error()).Error());
    }
    console.log(newDoc);
    const documents = getDocumentObject(contract.getDocumentNameList(), contract.getDocumentInfoList());
    const document = documents[documentName];
    if (document === undefined) {
        return new pb.Response().setError(returnError("ERR_AUTHDOC_2.2  ", documentName + " not found in tree ").Error());
    }
    const authMap = document.Auth;
    for (const element of tMap['USER_ARRAY']) {
        const thisStatus = {};
        authMap[element.toString()] = thisStatus;
    }
    document.Auth = authMap;
    documents[documentName] = document;
    const [updatedDocNameList, updatedDocInfoList] = documentListParse(documents);
    contract.setDocumentNameList(updatedDocNameList);
    contract.setDocumentInfoList(updatedDocInfoList);
    const err = t.setContractAsset(stub, contractAddress, contract, AESKey, IV, true);
    if (err != null) {
        return new pb.Response().setError(returnError("ERR_AUTHDOC_6", err.Error()).Error());
    }
    t.setTransactionTrail(stub, contractAddress, ASSET_PREFIX_CONTRACT, assetProto.Action_ACTION_AUTH_DOCUMENT,
        "Document Auth Permission added for document " + documentName, "", false);
    return new pb.Response().setSuccess(null);
}


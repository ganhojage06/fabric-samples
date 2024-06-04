const crypto = require('crypto');

function getAccountAddress(stub, ...customArgs) {
    const cert = stub.getX509Certificate();
    if (!cert) {
        return [null, new Error(returnError("ERR_GETACCADDR_1", "Error Parsing Certificate").message)];
    }
    let commonName;
    if (customArgs.length === 1) {
        if (customArgs[0] !== "") {
            commonName = customArgs[0];
        } else {
            return ["", returnError("ERR_GETACCADDR_2", "Argument passed but blank")];
        }
    } else {
        commonName = cert.subject.commonName;
    }
    const userAddress = getHash(commonName + cert.issuer.commonName);
    return [userAddress, null];
}

function getHash(input) {
    const inputHash = crypto.createHash('sha256').update(input).digest();
    const hashString = inputHash.toString('hex');
    return hashString;
}

function areAllRequiredTMapPresent(tMap, requiredFields) {
    for (const element of requiredFields) {
        if (tMap[element].length === 0) {
            return false;
        }
    }
    return true;
}



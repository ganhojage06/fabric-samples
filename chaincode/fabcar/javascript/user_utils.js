const assetProto = require("fob/assets");
const shim = require("github.com/hyperledger/fabric-chaincode-go/shim");

function checkUserType(stub, userAddress, Type) {
    let UserAcc;
    let err;
    [UserAcc, err] = getUserAsset(stub, userAddress);
    if (err !== null) {
        return [false, UserAcc, returnError("ERR_CHKUSRTYP_1", "user read error: " + err.Error())];
    }
    if (UserAcc.Domain.length === 0) {
        if (UserAcc.UserType !== Type) {
            return [false, UserAcc, null];
        }
    } else {
        let alreadyExistUserType = false;
        for (let x of UserAcc.Domain) {
            console.log("Type of x: ", typeof x, "Type of Type:", typeof Type, "Value of x: ", x, "Type: ", Type);
            if (x === Type) {
                alreadyExistUserType = true;
                break;
            }
        }
        if (!alreadyExistUserType) {
            return [false, UserAcc, null];
        }
    }
    return [true, UserAcc, null];
}

function validateUserType(userType) {
    let userTypeCheck = false;
    if (userType === assetProto.UserType_value["USER_TYPE_NONE"]) {
        return returnError("ERR_VALUSRTYP_1", "user type is none");
    }
    for (let k in assetProto.UserType_value) {
        if (userType === assetProto.UserType_value[k]) {
            userTypeCheck = true;
        }
    }
    if (!userTypeCheck) {
        return returnError("ERR_VALUSRTYP_2", "Not a valid user type");
    }
    return null;
}

function updateUserType(user, newUserType) {
    let err = validateUserType(newUserType);
    if (err !== null) {
        return returnError("ERR_UPDTUSRTYP_1", err.Error());
    }
    user.UserType = assetProto.UserType(newUserType);
    return null;
}

function updateUserStatus(user, newUserStatus) {
    let userStatusCheck = false;
    if (newUserStatus === assetProto.UserStatus_value["USER_STATUS_NONE"]) {
        return returnError("ERR_UPDTUSRSTS_1", "user status is none");
    }
    for (let k in assetProto.UserStatus_value) {
        if (newUserStatus === assetProto.UserStatus_value[k]) {
            userStatusCheck = true;
        }
    }
    if (!userStatusCheck) {
        return returnError("ERR_UPDTUSRSTS_2", "Not a valid user status");
    }
    user.Status = assetProto.UserStatus(newUserStatus);
    return null;
}

function updateRSAKey(user, newRSAPublicKeyString) {
    if (newRSAPublicKeyString === "") {
        return returnError("ERR_UPDTUSRRSA_1", "user RSA public key is blank");
    }
    let err;
    [_, err] = validateRSAKey(newRSAPublicKeyString);
    if (err !== null) {
        return returnError("ERR_UPDTUSRRSA_2", err.Error());
    }
    user.RSAPublicKey = newRSAPublicKeyString;
    return null;
}



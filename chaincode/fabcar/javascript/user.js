const shim = require('fabric-shim');
const pb = require('fabric-protos');

function registerUser(stub, args) {
    if (args.length < 3) {
        return shim.error(returnError("ERR_REGUSR_1", "Need atleast 3 args [usertype, RSA public key,primaryKey]").error());
    }

    let userType;
    let userAddress, RSAPublicKey;
    let primaryKey;

    const userType64 = parseInt(args[0], 10);
    if (isNaN(userType64)) {
        return shim.error(returnError("ERR_REGUSR_2", "user type is not number").error());
    }
    primaryKey = parseInt(args[2], 10);
    if (isNaN(primaryKey)) {
        return shim.error(returnError("ERR_REGUSR_3", "primary key is not number").error());
    }
    userType = userType64;
    RSAPublicKey = args[1];

    const err = validateUserType(userType);
    if (err) {
        return shim.error(returnError("ERR_REGUSR_4", err).error());
    }

    const existingUser = t.getUserAsset(stub, userAddress);

    const user = {
        Address: userAddress
    };
    if (!existingUser) {
        const domain = [userType];
        user.UserType = userType;
        user.RSAPublicKey = RSAPublicKey;
        user.Status = assetProto.UserStatus.USER_STATUS_ACTIVE;
        user.PrimaryKey = primaryKey;
        user.Domain = domain;
    } else {
        let alreadyExistUserType = false;
        for (let i = 0; i < existingUser.Domain.length; i++) {
            if (existingUser.Domain[i] === userType) {
                alreadyExistUserType = true;
                break;
            }
        }
        if (alreadyExistUserType) {
            return shim.error(returnError("ERR_REGUSR_5.1", "User with given user_type already exist").error());
        }

        const newLenOfDomain = existingUser.Domain.length + 1;
        const domain = existingUser.Domain.slice();
        domain.push(userType);
        user.UserType = existingUser.UserType;
        user.RSAPublicKey = existingUser.RSAPublicKey;
        user.Status = existingUser.Status;
        user.PrimaryKey = existingUser.PrimaryKey;
        user.Domain = domain;
    }

    if (args.length === 6) {
        user.IecNumber = args[3];
        user.VatNumber = args[4];
        user.ReferenceNumber = args[5];
    }

    const err = t.setUserAsset(stub, userAddress, user, true);
    if (err) {
        return shim.error(returnError("ERR_REGUSR_7", err).error());
    }
    const adminObject = t.getAdminUserAsset(stub);
    if (!adminObject) {
        return shim.error(returnError("ERR_REGUSR_7", err).error());
    }

    if (userType === assetProto.UserType.USER_TYPE_ADMIN) {
        if (adminObject.Address !== userAddress) {
            return shim.error(returnError("ERR_REGUSR_8", "User address is not equal to admin address").error());
        }
    } else {
        const err = t.getUserAsset(stub, adminObject.Address);
        if (err) {
            return shim.error(returnError("ERR_REGUSR_9", "Admin user is not registered yet, register admin user first").error());
        }
    }
    return shim.success(null);
}

function updateUser(stub, args) {
    if (args.length !== 5) {
        return shim.error(returnError("ERR_UPDTUSR_1", "Require 4 arguments, [userAddress, updateCode, userType, userStatus, RSAPublicKey]").error());
    }

    let updateCode;
    let newUserType;
    let newUserStatus;
    let newRSAPublicKey;

    const updateCodeString = args[1];
    if (updateCodeString !== "") {
        const updateCode64 = parseInt(updateCodeString, 10);
        if (isNaN(updateCode64)) {
            return shim.error(returnError("ERR_UPDTUSR_2", err).error());
        }
        updateCode = updateCode64;
    }

    const newUserTypeString = args[2];
    if (newUserTypeString !== "") {
        const newUserType64 = parseInt(newUserTypeString, 10);
        if (isNaN(newUserType64)) {
            return shim.error(returnError("ERR_UPDTUSR_3", err).error());
        }
        newUserType = newUserType64;
    }

    const newUserStatusString = args[3];
    if (newUserStatusString !== "") {
        const newUserStatus64 = parseInt(newUserStatusString, 10);
        if (isNaN(newUserStatus64)) {
            return shim.error(returnError("ERR_UPDTUSR_4", err).error());
        }
        newUserStatus = newUserStatus64;
    }

    newRSAPublicKey = args[4];

    const userAddress = args[0];
    const user = t.getUserAsset(stub, userAddress);
    if (!user) {
        return shim.error(returnError("ERR_UPDTUSR_5", err).error());
    }

    switch (updateCode) {
        case USER_UPDATE_USERTYPE:
            const err = updateUserType(user, newUserType);
            if (err) {
                return shim.error(returnError("ERR_UPDTUSR_6", err).error());
            }
            break;
        case USER_UPDATE_USERSTATUS:
            const err = updateUserStatus(user, newUserStatus);
            if (err) {
                return shim.error(returnError("ERR_UPDTUSR_7", err).error());
            }
            break;
        case USER_UPDATE_USERRSAKEY:
            const err = updateRSAKey(user, newRSAPublicKey);
            if (err) {
                return shim.error(returnError("ERR_UPDTUSR_8", err).error());
            }
            break;
        case USER_UPDATE_USERTYPE_USERSTATUS:
            const err = updateUserType(user, newUserType);
            if (err) {
                return shim.error(returnError("ERR_UPDTUSR_9", err).error());
            }
            const err = updateUserStatus(user, newUserStatus);
            if (err) {
                return shim.error(returnError("ERR_UPDTUSR_10", err).error());
            }
            break;
        case USER_UPDATE_USERTYPE_USERRSAKEY:
            const err = updateUserType(user, newUserType);
            if (err) {
                return shim.error(returnError("ERR_UPDTUSR_11", err).error());
            }
            const err = updateRSAKey(user, newRSAPublicKey);
            if (err) {
                return shim.error(returnError("ERR_UPDTUSR_12", err).error());
            }
            break;
        case USER_UPDATE_USERSTATUS_USERRSAKEY:
            const err = updateUserType(user, newUserType);
            if (err) {
                return shim.error(returnError("ERR_UPDTUSR_13", err).error());
            }
            const err = updateRSAKey(user, newRSAPublicKey);
            if (err) {
                return shim.error(returnError("ERR_UPDTUSR_14", err).error());
            }
            break;
        case USER_UPDATE_USERTYPE_USERSTATUS_USERRSAKEY:
            const err = updateUserType(user, newUserType);
            if (err) {
                return shim.error(returnError("ERR_UPDTUSR_15", err).error());
            }
            const err = updateUserStatus(user, newUserStatus);
            if (err) {
                return shim.error(returnError("ERR_UPDTUSR_16", err).error());
            }
            const err = updateRSAKey(user, newRSAPublicKey);
            if (err) {
                return shim.error(returnError("ERR_UPDTUSR_17", err).error());
            }
            break;
    }

    const err = t.setUserAsset(stub, userAddress, user, true);
    if (err) {
        return shim.error(returnError("ERR_UPDTUSR_18", err).error());
    }
    return shim.success(null);
}

function getUserById(stub, args) {
    if (args.length !== 1) {
        return shim.error(returnError("ERR_GETUSERBYID_1", "Incorrect chaincode arguments").error());
    }
    const existingUser = t.getUserAsset(stub, args[0]);
    if (!existingUser) {
        return shim.error(returnError("ERR_GETUSERBYID_2", "Get user asset error [User]").error());
    }
    console.log(existingUser);
    const userAsbytes = fetch(stub, ASSET_PREFIX_USER + args[0], true);
    if (!userAsbytes) {
        return shim.error(returnError("ERR_GETUSERBYID_3", "Fetch error [User]").error());
    }
    return shim.success(userAsbytes);
}



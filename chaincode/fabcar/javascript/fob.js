const shim = require('fabric-shim');
const pb = require('fabric-protos');
const bccsp = require('fabric-bccsp');
const factory = require('fabric-bccsp/factory');

class FOBChaincode {
    constructor() {
        this.bccspInst = bccsp.factory.GetDefault();
    }

    async Init(stub) {
        console.log("########### Init ###########");
        let setAdminUser = false;
        let userAddress = "";
        let err;

        const { fcn, params } = stub.getFunctionAndParameters();

        if (params.length > 0) {
            if (params.length === 2) {
                if (params[0] === "true") {
                    setAdminUser = true;
                    const adminUserName = params[1];

                    const result = await getAccountAddress(stub, adminUserName);
                    userAddress = result.userAddress;
                    err = result.err;

                    if (err || userAddress === "") {
                        return shim.error(Buffer.from(returnError("ERR_INIT_1", err).Error()));
                    }
                }
            } else {
                return shim.error(Buffer.from(returnError("ERR_INIT_2", "pass exactly 2 args or nothing").Error()));
            }
        } else {
            const result = await getAccountAddress(stub);
            userAddress = result.userAddress;
            err = result.err;

            if (err || userAddress === "") {
                return shim.error(Buffer.from(returnError("ERR_INIT_3", "couldn't get user address from certificate").Error()));
            }
        }

        if (setAdminUser) {
            const adminUserObject = new assetProto.AdminUser();
            adminUserObject.Address = userAddress;
            err = await this.setAdminUserAsset(stub, adminUserObject, true);

            if (err) {
                return shim.error(Buffer.from(returnError("ERR_INIT_4", err).Error()));
            }
        } else {
            err = await this.getAdminUserAsset(stub);

            if (err) {
                return shim.error(Buffer.from(returnError("ERR_INIT_5", err).Error()));
            }
        }

        return shim.success();
    }

    async Invoke(stub) {
        console.log("########### FOB Invoke ###########");
        const { fcn, params } = stub.getFunctionAndParameters();
        const tMap = await stub.getTransient();

        switch (fcn) {
            case "getUserById":
                return this.getUserById(stub, params);
            case "registerUser":
                return this.registerUser(stub, params);
            case "updateUser":
                return this.updateUser(stub, params);
            case "addContract":
                return this.addContract(stub, params, tMap);
            case "addGenericContract":
                return this.addGenericContract(stub, params, tMap);
            case "editContract":
                return this.editContract(stub, params, tMap);
            case "editGenericContract":
                return this.editGenericContract(stub, params, tMap);
            case "query":
                return this.query(stub, params);
            case "authDocument":
                return this.authDocument(stub, params, tMap);
            case "uploadDocument":
                return this.uploadDocument(stub, params, tMap);
            case "updateAuthPermission":
                return this.updateAuthPermission(stub, params, tMap);
            case "createDiscouting":
                return this.createDiscouting(stub, params, tMap);
            case "updateDiscouting":
                return this.updateDiscouting(stub, params, tMap);
            default:
                console.error(`Unknown action, Got: ${fcn}`);
                return shim.error(Buffer.from(returnError("ERR_INVK_2", `Unknown action, Got: ${fcn}`).Error()));
        }
    }
}

function main() {
    factory.InitFactories(null);
    const chaincode = new FOBChaincode();
    shim.start(chaincode);
}

main();



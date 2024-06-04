const base64 = require('base64-js');
const shim = require('fabric-shim');

class errorResponse {
  constructor(status, message) {
    this.status = status;
    this.message = message;
  }
}

function fetch(stub, key, existenceCheck) {
  const res = stub.getState(key);
  if (res instanceof Error) {
    return returnError("ERR_FETCH_1", "Couldn't GetState for key- " + key);
  }
  if (res.length === 0 && existenceCheck) {
    return returnError("ERR_FETCH_2", "No bytes exist for key- " + key);
  }
  const data = base64.toByteArray(res);
  if (data instanceof Error) {
    return returnError("ERR_FETCH_3", "Error Converting from BASE64- " + key);
  }
  return data;
}

function store(stub, key, data, overwrite) {
  let err;
  if (!overwrite) {
    const res = stub.getState(key);
    if (res instanceof Error) {
      return returnError("ERR_STORE_1", "Can't GetState data for key- " + key);
    }
    if (res.length !== 0) {
      return returnError("ERR_STORE_2", "Can't Overwrite data for key- " + key);
    }
  }
  const valueBase64String = base64.fromByteArray(data);
  err = stub.putState(key, valueBase64String);
  if (err instanceof Error) {
    return returnError("ERR_STORE_3", "Couldn't PutState data for key- " + key);
  }
  return null;
}

function remove(stub, key, checkExistence) {
  if (checkExistence) {
    const res = stub.getState(key);
    if (res instanceof Error) {
      return returnError("ERR_REMOVE_1", "Couldn't GetState for key- " + key);
    }
    if (res.length === 0) {
      return returnError("ERR_REMOVE_2", "No bytes exist for key- " + key);
    }
  }
  const err = stub.delState(key);
  if (err instanceof Error) {
    return returnError("ERR_REMOVE_3", "Couldn't Delete State for key- " + key);
  }
  return null;
}

function returnError(code, message) {
  const errorObj = new errorResponse(code, message);
  const errorAsBytes = JSON.stringify(errorObj);
  return new Error(errorAsBytes);
}



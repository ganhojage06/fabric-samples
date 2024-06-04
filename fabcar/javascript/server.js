

'use strict';
const express = require('express');
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const FabricCAServices = require('fabric-ca-client');
const app = express();
const validator = require('validator');


app.use(express.json());

const ccpPath = path.resolve(__dirname, '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
const walletPath = path.join(process.cwd(), 'wallet');

const connectToGateway = async (userEmail) => {
  try {
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const gatewayOptions = {
      wallet,
      identity: userEmail,
      discovery: { enabled: true, asLocalhost: true },
    };

    const gateway = new Gateway();
    await gateway.connect(ccp, gatewayOptions);
    const network = await gateway.getNetwork('mychannel');
    const contract = network.getContract('fabcar');
    return { gateway, contract };
  } catch (error) {
    console.error(`Failed to connect to the gateway: ${error}`);
    throw error; // Propagate the error to the calling function
  }
};

const connectToGateway1 = async () => {
  try {
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const gatewayOptions = {
      wallet,
      identity: 'admin',  // Use the admin identity
      discovery: { enabled: true, asLocalhost: true },
    };

    const gateway = new Gateway();
    await gateway.connect(ccp, gatewayOptions);
    const network = await gateway.getNetwork('mychannel');
    const contract = network.getContract('fabcar');
    return { gateway, contract };
  } catch (error) {
    console.error(`Failed to connect to the gateway: ${error}`);
    throw error; 
  }
};

// const connectToGateway2 = async (userId) => {
//   try {
//     const wallet = await Wallets.newFileSystemWallet(walletPath);

//     const gatewayOptions = {
//       wallet,
//       identity: userId,
//       discovery: { enabled: true, asLocalhost: true },
//     };

//     const gateway = new Gateway();
//     await gateway.connect(ccp, gatewayOptions);
//     const network = await gateway.getNetwork('mychannel');
//     const contract = network.getContract('fabcar');
//     return { gateway, contract };
//   } catch (error) {
//     console.error(`Failed to connect to the gateway: ${error}`);
//     throw error;
//   }
// };

const port = 9000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


app.get('/enroll-admin', async (req, res) => {
  try {
    // load the network configuration
    const ccpPath = path.resolve(__dirname, '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    // Create a new CA client for interacting with the CA.
    const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
    const caTLSCACerts = caInfo.tlsCACerts.pem;
    const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

    // Create a new file system based wallet for managing identities.
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);

    // Check to see if we've already enrolled the admin user.
    const identity = await wallet.get('admin');
    if (identity) {
      console.log('An identity for the admin user "admin" already exists in the wallet');
      return res.status(400).json({ message: 'Admin identity already exists' });
    }

    // Enroll the admin user, and import the new identity into the wallet.
    const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: 'Org1MSP',
      type: 'X.509',
    };
    await wallet.put('admin', x509Identity);
    console.log('Successfully enrolled admin user "admin" and imported it into the wallet');

    res.json({ message: 'Admin enrolled successfully' });
  } catch (error) {
    console.error(`Failed to enroll admin user "admin": ${error}`);
    res.status(500).json({ error: 'Failed to enroll admin user' });
  }
});

app.post('/register-user', async (req, res) => {
  try {
    const { userEmail, additionalData } = req.body;
    // Validate email format
    if (!validator.isEmail(userEmail)) {
      throw new Error('Invalid email format.');
    }

    // Assign the value to userEmail
    console.log('User Email:', userEmail);
    console.log('additionalData:', additionalData);

    // Validate additionalData as a JSON string
    try {
      JSON.parse(additionalData);
    } catch (e) {
      console.error('Invalid JSON format in additionalData');
      return res.status(400).json({ message: 'Invalid JSON format in additionalData' });
    }

    const wallet = await Wallets.newFileSystemWallet(walletPath);

    // Check existing identity
    const userIdentity = await wallet.get(userEmail);
    if (userIdentity) {
      console.log(`An identity for the user "${userEmail}" already exists in the wallet`);
      console.log(`User identity "userEmail=${userIdentity}"`);

      return res.status(400).json({ message: 'User identity already exists' });
    }

    // Check admin identity
    const adminIdentity = await wallet.get('admin');
    if (!adminIdentity) {
      console.log('An identity for the admin user "admin" does not exist in the wallet');
      console.log('Run the enrollAdmin.js application before retrying');
      return res.status(500).json({ message: 'Admin identity does not exist' });
    }

    // Build user object for authentication
    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, 'admin');

    // Create a new CA client for interacting with the CA
    const caURL = ccp.certificateAuthorities['ca.org1.example.com'].url;
    const ca = new FabricCAServices(caURL);

    // Register the user, enroll the user, and import the new identity into the wallet
    const secret = await ca.register({
      affiliation: 'org1.department1',
      enrollmentID: userEmail,
      role: 'client'
    }, adminUser);

    const enrollment = await ca.enroll({
      enrollmentID: userEmail,
      enrollmentSecret: secret
    });

    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: 'Org1MSP',
      type: 'X.509',
    };

    await wallet.put(userEmail, x509Identity);
    console.log(`Successfully registered and enrolled user "${userEmail}" and imported it into the wallet`);

    // Connect to the gateway and get the contract
    const { gateway, contract } = await connectToGateway(userEmail);

    // Invoke the registerUser function from your chaincode
    await contract.submitTransaction(
      'registerUser',
      userEmail,
      additionalData
    );

    // Disconnect from the gateway
    await gateway.disconnect();

    // Respond with success message
    res.json({ message: `User ${userEmail} registered successfully` });
  } catch (error) {
    console.error(`Failed to register user: ${error}`);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

app.get('/query-users', async (req, res) => {
  try {
    const { userEmail } = req.body;

    if (!userEmail) {
      return res.status(400).json({ error: 'User Email is required' });
    }

    // Load the network configuration
    const ccpPath = path.resolve(__dirname, '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    // Create a new file system based wallet for managing identities.
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);

    // Check to see if we've already enrolled the user.
    const identity = await wallet.get(userEmail);
    if (!identity) {
      console.log('An identity for the user "appUser" does not exist in the wallet');
      console.log('Run the registerUser.js application before retrying');
      return res.status(400).send('An identity for the user "${userEmail}" does not exist in the wallet');
    }

    // Create a new gateway for connecting to our peer node.
    const gateway = new Gateway();
    await gateway.connect(ccp, { wallet, identity: userEmail, discovery: { enabled: true, asLocalhost: true } });

    // Get the network (channel) our contract is deployed to.
    const network = await gateway.getNetwork('mychannel');

    // Get the contract from the network.
    const contract = network.getContract('fabcar');

    // Evaluate the specified transaction.
    const resultBuffer = await contract.evaluateTransaction('getUserDetails', userEmail);
    const result = JSON.parse(resultBuffer.toString());
    console.log(`Transaction has been evaluated, result is: ${JSON.stringify(result)}`);

    // Disconnect from the gateway.
    await gateway.disconnect();

    res.status(200).json(result);
  } catch (error) {
    console.error(`Failed to evaluate transaction: ${error}`);
    res.status(500).send(`Failed to evaluate transaction: ${error}`);
  }
});

app.put('/update-user-details', async (req, res) => {
  try {
    const { userEmail, updatedDetails } = req.body;

    // Check if required parameters are provided
    if (!userEmail || !updatedDetails) {
      return res.status(400).json({ error: 'User ID and updatedDetails are required' });
    }

    // Connect to the gateway and get the contract
    const { gateway, contract } = await connectToGateway(userEmail); // You need to implement the connectToGateway function

    // Invoke the updateUserDetails function from your chaincode
    const updatedUser = await contract.submitTransaction(
      'updateUserDetails',
      userEmail,
      JSON.stringify(updatedDetails)
    );

   // Disconnect from the gateway
   await gateway.disconnect();
   
    // Respond with the updated user details
    res.json({ updatedUser: JSON.parse(updatedUser.toString()) });
  } catch (error) {
    console.error(`Error in updateUserDetails API: ${error.message}`);
    res.status(500).json({ error: 'Failed to update user details' });
  }
});

app.get('/check-user', async (req, res) => {
  const { userEmail } = req.body;

  try {
    if (!userEmail) {
      console.error('User Email is required in the request body');
      return res.status(400).json({ error: 'User Email is required in the request body' });
    }

    console.log(`Checking existence for user with email: ${userEmail}`);

    // Connect to the gateway and get the contract
    const { contract } = await connectToGateway(userEmail);

    // Invoke the isUserExists function from your chaincode
    const userExistsBuffer = await contract.evaluateTransaction('isUserExists', userEmail);

    // Parse the result from the chaincode (assuming it returns a boolean)
    const isUserExists = JSON.parse(userExistsBuffer.toString());

    // Respond with the result and a more descriptive message
    if (isUserExists) {
      console.log(`User with email ${userEmail} exists`);
      res.status(200).json({ message: 'User exists', userExists: true });
    } else {
      console.log(`User with email ${userEmail} does not exist`);
      res.status(200).json({ message: 'User does not exist', userExists: false });
    }
  } catch (error) {
    console.error(`Error in checkUserExists API: ${error.message}`);
    res.status(500).json({ error: 'User does not exist' });
  }
});

app.delete('/delete-user', async (req, res) => {
  const {userEmail } = req.body;
  try {
    if (!userEmail) {
      console.error('User Email is required in the request params');
      return res.status(400).json({ error: 'User Email is required in the request params' });
    }

    console.log(`Deleting user with email: ${userEmail}`);

    // Connect to the gateway and get the contract
    const { contract } = await connectToGateway(userEmail);

    // Invoke the deleteUser function from your chaincode
    const resultBuffer = await contract.submitTransaction('deleteUser', userEmail);

    // Convert the buffer data to a string
    const resultMessage = resultBuffer.toString('utf8');

    console.log(resultMessage); // Log the human-readable result

    // Respond with a success message
    res.status(200).json({ message: resultMessage });
  } catch (error) {
    console.error(`Error in deleteUser API: ${error.message}`);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.get('/user-history', async (req, res) => {
  const { userEmail } = req.body;

  try {
    if (!userEmail) {
      console.error('User userEmail is required in the request params');
      return res.status(400).json({ error: 'User userEmail is required in the request params' });
    }

    console.log(`Getting transaction history for user with userEmail: ${userEmail}`);

    // Connect to the gateway and get the contract
    const { contract } = await connectToGateway(userEmail);

    // Invoke the getHistoryForUser function from your chaincode
    const historyBuffer = await contract.evaluateTransaction('getHistoryForUser', userEmail);

    const history = JSON.parse(historyBuffer.toString());

    // Sort the history based on timestamp in descending order
    history.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Print the transaction history details to the console
    console.log('Transaction History Details:');
    // Inside your API route handler
    history.forEach((transaction, index) => {
      console.log(`Transaction ${index + 1}:`);
      //console.log('Timestamp:', transaction.createdAt);
      //console.log('Transaction ID:', transaction.txId); // Access the transaction ID
      console.log('Transaction Value:', transaction.value);
      console.log('Is Delete:', transaction.isDelete);
      console.log('------------------------');
    });

    // Respond with the sorted transaction history
    res.status(200).json({ history });
  } catch (error) {
    console.error(`Error in getHistoryForUser API: ${error.message}`);
    res.status(500).json({ error: 'Failed to get user history' });
  }
});

app.get('/get-all-users', async (req, res) => {
  try {
    // Connect to the gateway and get the contract
    const { contract } = await connectToGateway1();

    // Invoke the getAllUsers function from your chaincode
    const allUsersBuffer = await contract.evaluateTransaction('getAllUsers');

    // Parse the result from the chaincode
    const allUsers = JSON.parse(allUsersBuffer.toString());

    // Respond with the result
    res.json({ allUsers });
  } catch (error) {
    console.error(`Error in getAllUsers API: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch all users' });
  }
});

app.get('/count-total-users', async (req, res) => {
  try {
    // Connect to the gateway and get the contract
    const { contract } = await connectToGateway1();

    // Invoke the countTotalUsers function from your chaincode
    const totalUsers = await contract.evaluateTransaction('countTotalUsers');

    // Respond with the result
    res.json({ totalUsers: parseInt(totalUsers) });
  } catch (error) {
    console.error(`Error in countTotalUsers API: ${error.message}`);
    res.status(500).json({ error: 'Failed to count total users' });
  }
});

app.get('/count-users-by-category', async (req, res) => {
  try {
    const { categories } = req.query;

    // Validate required parameters
    if (!categories) {
      return res.status(400).json({ error: 'User type is required in the query parameters' });
    }

    // Connect to the gateway and get the contract
    const { contract } = await connectToGateway1();

    // Invoke the countUsersByType function from your chaincode
    const userCount = await contract.evaluateTransaction('countUsersBycategories', categories);

    // Respond with the result
    res.json({ userCount: parseInt(userCount), categories });
  } catch (error) {
    console.error(`Error in countUsersByType API: ${error.message}`);
    res.status(500).json({ error: 'Failed to count users by type' });
  }
});

app.post('/uploadDocument', async (req, res) => {
  try {
    const { userEmail, additionalDocumentData } = req.body;

    // Connect to the gateway using the user's email as identity
    const { gateway, contract } = await connectToGateway(userEmail);

    // Invoke the uploadDocument function from your chaincode
    const result = await contract.submitTransaction(
      'uploadDocument',
      userEmail, // Use userEmail as userId
      additionalDocumentData
    );

    // Disconnect from the gateway
    await gateway.disconnect();

    // Parse the result as JSON
    const parsedResult = JSON.parse(result.toString());

    // Log the success message with documentId to the console
    console.log(`Successfully uploaded document with ID: ${parsedResult.documentId}`);

    // Respond with the result as JSON along with the success message
    res.json({
      message: 'Document uploaded successfully',
      documentId: parsedResult.documentId,
      result: parsedResult
    });
  } catch (error) {
    console.error(`Error in uploadDocument API: ${error.message}`);
    console.error(error.stack);
    res.status(500).json({ error: `Error in uploadDocument API: ${error.message}` });
  }
});

app.post('/inspectionDraftSurvey', async (req, res) => {
  try {
    const { userEmail, additionalDocumentData } = req.body;

    // Connect to the gateway using the user's email as identity
    const { gateway, contract } = await connectToGateway(userEmail);

    // Invoke the uploadDocument function from your chaincode
    const result = await contract.submitTransaction(
      'inspectionDraftSurvey',
      userEmail, // Use userEmail as userId
      additionalDocumentData
    );

    // Disconnect from the gateway
    await gateway.disconnect();

    // Parse the result as JSON
    const parsedResult = JSON.parse(result.toString());

    // Log the success message with documentId to the console
    console.log(`Successfully Inspections of Draft Survey with ID: ${parsedResult.documentId}`);

    // Respond with the result as JSON along with the success message
    res.json({
      message: 'Inspection Draft Survey Certificate Report Create successfully',
      documentId: parsedResult.documentId,
      result: parsedResult
    });
  } catch (error) {
    console.error(`Error in Draft Survey report API: ${error.message}`);
    console.error(error.stack);
    res.status(500).json({ error: `Error in Draft Survey report API: ${error.message}` });
  }
});

app.post('/inspectionCertificate', async (req, res) => {
  try {
    const { userEmail, additionalDocumentData } = req.body;

    // Connect to the gateway using the user's email as identity
    const { gateway, contract } = await connectToGateway(userEmail);

    // Invoke the uploadDocument function from your chaincode
    const result = await contract.submitTransaction(
      'inspectionDocs',
      userEmail, // Use userEmail as userId
      additionalDocumentData
    );

    // Disconnect from the gateway
    await gateway.disconnect();

    // Parse the result as JSON
    const parsedResult = JSON.parse(result.toString());

    // Log the success message with documentId to the console
    console.log(`Successfully Inspections Certificate create with ID: ${parsedResult.documentId}`);

    // Respond with the result as JSON along with the success message
    res.json({
      message: 'Inspection Certificate create successfully',
      documentId: parsedResult.documentId,
      result: parsedResult
    });
  } catch (error) {
    console.error(`Error in Inspection docs report API: ${error.message}`);
    console.error(error.stack);
    res.status(500).json({ error: `Error in Inspection docs report API: ${error.message}` });
  }
});

app.post('/createContract', async (req, res) => {
  try {
    const { userEmail, contractId, additionalContractData } = req.body;

    // Connect to the gateway using the user's email as identity
    const { gateway, contract } = await connectToGateway(userEmail);

    // Invoke the Create Contract function from your chaincode
    const result = await contract.submitTransaction(
      'createContract',
      userEmail, // Use userEmail as userId
      contractId,
      additionalContractData
    );

    // Log the contract ID to the console
    console.log(`Successfully Contract created with ID: ${contractId}`);

    // Disconnect from the gateway
    await gateway.disconnect();

   // Parse the result as JSON
    const parsedResult = JSON.parse(result.toString());

   // Log the success message with contractsId to the console
   console.log(`Successfully ContractsID Create with ID: ${parsedResult.contractsId}`);

   // Respond with the result as JSON along with the success message
   res.json({
     message: 'ContractsID Create successfully',
     contractsId: parsedResult.contractsId,
     result: parsedResult
   });
 } catch (error) {
   console.error(`Error in Contract Create API: ${error.message}`);
   console.error(error.stack);
   res.status(500).json({ error: `Error in Contract Create API: ${error.message}` });
 }
});

app.get('/getDocumentDetails', async (req, res) => {
  try {
    const { documentId } = req.body;

    // Ensure documentId is defined before proceeding
    if (!documentId) {
      return res.status(400).json({ error: 'Document ID is required.' });
    }

    // Connect to the gateway using the user's identity
    const { gateway, contract } = await connectToGateway1();

    // Invoke the getDocumentDetails function from your chaincode
    const result = await contract.evaluateTransaction('getDocumentDetails', documentId);

    // Disconnect from the gateway
    await gateway.disconnect();

    // Check if result is defined before calling toString()
    if (result === undefined || result === null) {
      return res.status(500).json({ error: 'Failed to retrieve document details.' });
    }

    // Parse and respond with the result as JSON
    res.json(JSON.parse(result.toString()));
  } catch (error) {
    console.error(`Error in getDocumentDetails API: ${error.message}`);
    console.error(error.stack);
    res.status(500).json({ error: `Error in getDocumentDetails API: ${error.message}` });
  }
});

app.get('/getContractDetails', async (req, res) => {
  try {
    const { contractsId } = req.body;

    // Ensure ContractId is defined before proceeding
    if (!contractsId) {
      return res.status(400).json({ error: 'Contract ID is required.' });
    }

    // Connect to the gateway using the user's identity
    const { gateway, contract } = await connectToGateway1();

    // Invoke the getContractDetails function from your chaincode
    const result = await contract.evaluateTransaction('getContractDetails', contractsId);

    // Disconnect from the gateway
    await gateway.disconnect();

    // Check if result is defined before calling toString()
    if (result === undefined || result === null) {
      return res.status(500).json({ error: 'Failed to retrieve Contract details.' });
    }

    // Parse and respond with the result as JSON
    res.json(JSON.parse(result.toString()));
  } catch (error) {
    console.error(`Error in getContractDetails API: ${error.message}`);
    console.error(error.stack);
    res.status(500).json({ error: `Error in getContractDetails API: ${error.message}` });
  }
});

app.put('/updateDocumentDetails', async (req, res) => {
  try {
    const { documentId, updatedDetails } = req.body;

    // Connect to the blockchain network using the user's identity
    const { gateway, contract } = await connectToGateway1(); // Assuming connectToGateway1 is implemented

    // Invoke the updateDocumentDetails function from your chaincode
    const result = await contract.submitTransaction(
      'updateDocumentDetails',
      documentId,
      JSON.stringify(updatedDetails)
    );

    // Disconnect from the gateway
    await gateway.disconnect();

    // Parse the result as JSON
    const parsedResult = JSON.parse(result.toString());

    // Log the success message with documentId to the console
    console.log(`Successfully updated details for document with ID: ${documentId}`);

    // Respond with the result as JSON along with the success message
    res.json({
      message: `Document details updated successfully for ID: ${documentId}`,
      result: parsedResult
    });
  } catch (error) {
    console.error(`Error in updateDocumentDetails API: ${error.message}`);
    console.error(error.stack);
    res.status(500).json({ error: `Error in updateDocumentDetails API: ${error.message}` });
  }
});

app.put('/editContractDetails', async (req, res) => {
  try {
    const { contractsId, updatedDetails } = req.body;

    // Connect to the blockchain network using the user's identity
    const { gateway, contract } = await connectToGateway1(); // Assuming connectToGateway1 is implemented

    // Invoke the updateContractDetails function from your chaincode
    const result = await contract.submitTransaction(
      'updateContractDetails',
      contractsId,
      JSON.stringify(updatedDetails)
    );

    // Disconnect from the gateway
    await gateway.disconnect();

    // Parse the result as JSON
    const parsedResult = JSON.parse(result.toString());

    // Log the success message with contractsId to the console
    console.log(`Successfully updated details for contract with ID: ${contractsId}`);

    // Respond with the result as JSON along with the success message
    res.json({
      message: `Contract details updated successfully for ID: ${contractsId}`,
      result: parsedResult
    });
  } catch (error) {
    console.error(`Error in editContractDetails API: ${error.message}`);
    console.error(error.stack);
    res.status(500).json({ error: `Error in editContractDetails API: ${error.message}` });
  }
});

app.get('/getDocumentHistory', async (req, res) => {
  try {
    const { documentId } = req.body;

    // Connect to the gateway using the user's identity
    const { gateway, contract } = await connectToGateway1();

    // Invoke the getDocumentHistory function from your chaincode
    const result = await contract.evaluateTransaction(
      'getDocumentHistory',
      documentId
    );

    // Disconnect from the gateway
    await gateway.disconnect();

    // Parse and respond with the result as JSON
    res.json(JSON.parse(result.toString()));
  } catch (error) {
    console.error(`Error in getDocumentHistory API: ${error.message}`);
    console.error(error.stack);
    res.status(500).json({ error: `Error in getDocumentHistory API: ${error.message}` });
  }
});

app.get('/getContractHistory', async (req, res) => {
  try {
    const { contractsId } = req.body;

    // Connect to the gateway using the user's identity
    const { gateway, contract } = await connectToGateway1();

    // Invoke the getDocumentHistory function from your chaincode
    const result = await contract.evaluateTransaction(
      'getContractHistory',
      contractsId
    );

    // Disconnect from the gateway
    await gateway.disconnect();

    // Parse and respond with the result as JSON
    res.json(JSON.parse(result.toString()));
  } catch (error) {
    console.error(`Error in getContractHistory API: ${error.message}`);
    console.error(error.stack);
    res.status(500).json({ error: `Error in getContractHistory API: ${error.message}` });
  }
});


app.delete('/deleteDocument', async (req, res) => {
  try {
    const { documentId, userEmail } = req.body;

    // Ensure userEmail and documentId are defined before using them
    if (!userEmail || !documentId) {
      return res.status(400).json({ error: 'UserEmail and document ID are required.' });
    }

    // Connect to the gateway using the user's identity
    const { gateway, contract } = await connectToGateway(userEmail);

    // Invoke the deleteDocument function from your chaincode
    const result = await contract.submitTransaction('deleteDocument', documentId);

    // Disconnect from the gateway
    await gateway.disconnect();

    // Respond with the raw result without attempting to parse as JSON
    res.status(200).send(result);
  } catch (error) {
    console.error(`Error in deleteDocument API: ${error.message}`);
    console.error(error.stack);
    res.status(500).json({ error: `Error in deleteDocument API: ${error.message}` });
  }
});


app.get('/query-users-by-field', async (req, res) => {
  try {
      const { fieldName, value } = req.body;

      // Validate required parameters
      if (!fieldName || !value) {
          return res.status(400).json({ error: 'Field name and value are required in the query parameters' });
      }

      // Connect to the gateway and get the contract
      const { contract } = await connectToGateway1();

      // Invoke the queryUsersByField function from your chaincode
      const usersBuffer = await contract.evaluateTransaction('queryUsersByField', fieldName, value);

      // Parse the result from the chaincode
      const users = JSON.parse(usersBuffer.toString());

      // Respond with the result
      res.json({ users });
  } catch (error) {
      console.error(`Error in queryUsersByField API: ${error.message}`);
      res.status(500).json({ error: `Failed to query users by field. ${error.message}` });
  }
});


app.get('/get-all-categories', async (req, res) => {
  try {
    // Connect to the gateway and get the contract
    const { contract, gateway } = await connectToGateway1(); // Assuming connectToGateway1 returns both contract and gateway

    // Use the smart contract to submit the transaction
    const categoriesBuffer = await contract.evaluateTransaction('getAllCategories');

    // Disconnect from the gateway to free up resources
    await gateway.disconnect();

    // Parse the result from the chaincode
    const categories = JSON.parse(categoriesBuffer.toString());

    // Respond with the result
    res.json({ categories });
  } catch (error) {
    console.error(`Error in getAllCategories API: ${error.message}`);
    res.status(500).json({ error: 'Failed to get all categories' });
  }
});





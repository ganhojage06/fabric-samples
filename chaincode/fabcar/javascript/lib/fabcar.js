/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');



class FabCar extends Contract {

    async initLedger(ctx) {
        try {
            const Users = [
                {
                    userEmail: "john@example.com",
                    additionalData: {
                        ExporterDetails: {
                            registrationNumber: "REG001",
                            exportImportNumber: "EXPIMP001",
                            countryOfOrigin: "CountryXYZ",
                            shippingAddress: "123 Main St",
                            panCardNumber: "PAN123",
                            bankDetails: {
                                bankName: "ABC Bank",
                                accountNumber: "1234567890",
                                branch: "Main Branch"
                            }
                        }
                    },
                },
            ];

            for (const user of Users) {
                // Log before stringification
                console.log('Before Stringify additionalData:', user.additionalData);

                // Stringify additionalData
                const additionalDataString = JSON.stringify(user.additionalData);
                console.log('After Stringify additionalData:', additionalDataString);

                // Call registerUser with stringified additionalData
                await this.registerUser(
                    ctx,
                    user.userEmail,
                    additionalDataString,  // Pass the stringified additionalData
                    user.createdAt,
                    user.createdBy,
                    user.lastModifiedAt
                );
            }

            return 'Ledger initialized with sample data';
        } catch (error) {
            console.error(`Error in initLedger: ${error.message}`);
            throw new Error(`Error in initLedger: ${error.message}`);
        }
    }
    

    async registerUser(ctx, userEmail, additionalData) {
        try {
            // Check if the user exists using userId
            const userExists = await this.isUserExists(ctx, userEmail);
            if (userExists) {
                throw new Error('User already exists.');
            }
    
            // Get the transaction timestamp and ID
            const txTimestamp = ctx.stub.getTxTimestamp();
            const txID = ctx.stub.getTxID();
            const timestampSeconds = txTimestamp.seconds.toNumber();
            const timestampNanos = txTimestamp.nanos;
    
            // Retrieve the total number of users to generate the next user ID
            const totalUsers = await this.countTotalUsers(ctx);
            const userId = totalUsers + 1; // Increment the
    
            // Ensure that additionalData is a JSON object
            let dynamicAdditionalData;
            if (typeof additionalData === 'object') {
                dynamicAdditionalData = additionalData;
            } else {
                try {
                    dynamicAdditionalData = JSON.parse(additionalData);
                } catch (error) {
                    throw new Error('Invalid additionalData. It must be a valid JSON string.');
                }
            }
    
            const user = {
                userEmail,
                userId,
                additionalData,
                createdAt: new Date(timestampSeconds * 1000 + timestampNanos / 1e6),
                createdBy: ctx.clientIdentity.getID(),
                lastModifiedAt: new Date(timestampSeconds * 1000 + timestampNanos / 1e6),
                txID: txID, // Include txID in the user object
            };
    
            console.log('Parsed additionalData:', dynamicAdditionalData);
    
            const userBuffer = Buffer.from(JSON.stringify(user));
            await ctx.stub.putState(userEmail, userBuffer); // Use userId as the key
            return user;
        } catch (error) {
            console.error(`Error in registerUser: ${error.message}`);
            console.error(error.stack); // Log the stack trace
            throw new Error(`Error in registerUser: ${error.message}`);
        }
    }
    

    async isUserExists(ctx, userEmail) {
        const userBuffer = await ctx.stub.getState(userEmail);
        return !!userBuffer && userBuffer.length > 0;
    }

    async isDocExists(ctx, documentId) {
        const userBuffer = await ctx.stub.getState(documentId);
        return !!userBuffer && userBuffer.length > 0;
    }

    async isConExists(ctx, contractsId) {
        const userBuffer = await ctx.stub.getState(contractsId);
        return !!userBuffer && userBuffer.length > 0;
    }

    async updateUserDetails(ctx, userEmail, updatedDetails) {
        try {
            const userExists = await this.isUserExists(ctx, userEmail);

            if (!userExists) {
                throw new Error(`User ${userEmail} does not exist`);
            }

            const existingUser = await this.getUserDetails(ctx, userEmail);

            const timestamp = ctx.stub.getTxTimestamp();
            const txID = ctx.stub.getTxID();

            const updatedUser = {
                ...existingUser,
                ...JSON.parse(updatedDetails),
                lastModifiedAt: new Date(timestamp.seconds * 1000 + timestamp.nanos / 1e6).toISOString(),
                timestamp: timestamp.seconds.toString() + '.' + timestamp.nanos.toString(),
                txID: txID,
                lastModifiedBy: ctx.clientIdentity.getID(),
            };

            const updatedUserBuffer = Buffer.from(JSON.stringify(updatedUser));
            await ctx.stub.putState(userEmail, updatedUserBuffer);

            return updatedUser;
        } catch (error) {
            console.error(`Error in updateUserDetails: ${error.message}`);
            throw new Error(`Error in updateUserDetails: ${error.message}`);
        }
    }

    async getUserDetails(ctx, userEmail) {
        try {
            const userBuffer = await ctx.stub.getState(userEmail);
            if (!userBuffer || userBuffer.length === 0) {
                throw new UserNotFoundError(userEmail);
            }

            return JSON.parse(userBuffer.toString());
        } catch (error) {
            console.error(`Error in getUserDetails: ${error.message}`);
            throw error instanceof UserNotFoundError ? error : new Error(`Error in getUserDetails: ${error.message}`);
        }
    }

    async deleteUser(ctx, userEmail) {
        try {
            const userExists = await this.isUserExists(ctx, userEmail);
            if (!userExists) {
                throw new Error(`User ${userEmail} does not exist`);
            }

            await ctx.stub.deleteState(userEmail);
            return `User ${userEmail} has been deleted`;
        } catch (error) {
            console.error(`Error in deleteUser: ${error.message}`);
            throw new Error(`Error in deleteUser: ${error.message}`);
        }
    }

    async getHistoryForUser(ctx, userEmail) {
        try {
            const iterator = await ctx.stub.getHistoryForKey(userEmail);
            const history = [];

            let result = await iterator.next();
            let txIndex = 1;

            while (!result.done) {
                if (result.value) {
                    const transaction = {
                        timestamp: result.value.timestamp,
                        transactionID: result.value.tx_id,
                        value: JSON.parse(result.value.value.toString('utf8')),
                        isDelete: result.value.is_delete
                    };

                    history.push(transaction);
                }
                result = await iterator.next();
                txIndex++;
            }

            await iterator.close();
            return JSON.stringify(history);
        } catch (error) {
            console.error(`Error in getHistoryForUser: ${error.message}`);
            throw new Error(`Error in getHistoryForUser: ${error.message}`);
        }
    }

    async getAllUsers(ctx) {
        try {
            const iterator = await ctx.stub.getStateByRange('', '');

            const users = [];
            let result = await iterator.next();
            while (!result.done) {
                if (result.value) {
                    users.push(JSON.parse(result.value.value.toString('utf8')));
                }
                result = await iterator.next();
            }

            await iterator.close();
            return JSON.stringify(users);
        } catch (error) {
            console.error(`Error in getAllUsers: ${error.message}`);
            throw new Error(`Error in getAllUsers: ${error.message}`);
        }
    }

    async countTotalUsers(ctx) {
        try {
            const iterator = await ctx.stub.getStateByRange('', '');
            let count = 0;

            let result = await iterator.next();
            while (!result.done) {
                if (result.value) {
                    count++;
                }
                result = await iterator.next();
            }

            await iterator.close();
            return count;
        } catch (error) {
            console.error(`Error in countTotalUsers: ${error.message}`);
            throw new Error(`Error in countTotalUsers: ${error.message}`);
        }
    }

    async countUsersBycategories(ctx, categories) {
        try {
            const iterator = await ctx.stub.getStateByRange('', '');
            let count = 0;

            let result = await iterator.next();
            while (!result.done) {
                if (result.value) {
                    const user = JSON.parse(result.value.value.toString('utf8'));
                    if (user.categories === categories) {
                        count++;
                    }
                }
                result = await iterator.next();
            }

            await iterator.close();
            return count;
        } catch (error) {
            console.error(`Error in countUsersByType: ${error.message}`);
            throw new Error(`Error in countUsersByType: ${error.message}`);
        }
    }

    async queryUsersByField(ctx, fieldName, value) {
        try {
            const query = {
                selector: {
                    [fieldName]: value,
                },
            };

            const iterator = await ctx.stub.getQueryResult(query);

            const users = [];
            let result = await iterator.next();
            while (!result.done) {
                users.push(JSON.parse(result.value.value.toString('utf8')));
                result = await iterator.next();
            }

            await iterator.close();

            return JSON.stringify(users);
        } catch (error) {
            console.error(`Error in queryUsersByField: ${error.message}`);
            throw new Error(`Error in queryUsersByField: ${error.message}`);
        }
    }

    async getAllUsersBycategories(ctx, categories) {
        try {
            const iterator = await ctx.stub.getStateByPartialCompositeKey('user', [categories]);
            const users = [];

            let result = await iterator.next();
            while (!result.done) {
                const user = JSON.parse(result.value.value.toString('utf8'));
                users.push(user);

                result = await iterator.next();
            }

            await iterator.close();
            return JSON.stringify(users);
        } catch (error) {
            console.error(`Error in getAllUsersBycategories: ${error.message}`);
            throw new Error(`Error in getAllUsersBycategories: ${error.message}`);
        }
    }

    async getAllCategories(ctx) {
        try {
            const iterator = await ctx.stub.getStateByPartialCompositeKey('user', []);
            const categoriesMap = new Map(); // Rename the variable to avoid confusion

            let result = await iterator.next();
            while (!result.done) {
                const compositeKey = ctx.stub.splitCompositeKey(result.value.key);
                const objectType = compositeKey.objectType;

                if (objectType && objectType === 'user') {
                    const attributes = compositeKey.attributes;
                    if (attributes && attributes.length > 1) {
                        const category = attributes[1]; // Use a different variable name here

                        // Assuming you want to associate some additional information with each category
                        const additionalInfo = "Additional information"; // Modify as needed

                        categoriesMap.set(category, additionalInfo);
                    }
                }

                result = await iterator.next();
            }

            await iterator.close();
            return JSON.stringify(Array.from(categoriesMap.entries()));
        } catch (error) {
            console.error(`Error in getAllCategories: ${error.message}`);
            throw new Error(`Error in getAllCategories: ${error.message}`);
        }
    }

    

    async queryUsersByField(ctx, fieldName, value) {
        try {
            const query = {
                selector: {}
            };
            query.selector[fieldName] = value;

            const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));

            const users = [];
            let result = await iterator.next();
            while (!result.done) {
                users.push(JSON.parse(result.value.value.toString('utf8')));
                result = await iterator.next();
            }

            await iterator.close();

            return JSON.stringify(users);
        } catch (error) {
            console.error(`Error in queryUsersByField: ${error.message}`);
            throw new Error(`Error in queryUsersByField: ${error.message}`);
        }
    }

    async uploadDocument(ctx, userEmail, additionalDocumentData) {
        try {
            // Check if the user exists by userId
            const userExists = await this.isUserExists(ctx, userEmail);
            if (!userExists) {
                throw new Error(`User with ID ${userEmail} does not exist.`);
            }

            // Get the transaction timestamp and ID
            const txTimestamp = ctx.stub.getTxTimestamp();
            const txID = ctx.stub.getTxID();
            const timestampSeconds = txTimestamp.seconds.toNumber();
            const timestampNanos = txTimestamp.nanos;

            // Retrieve the user details
            const user = await this.getUserDetails(ctx, userEmail);

            // Increment the document counter for the user
            const counterKey = `${userEmail}_DocumentCounter`;
            const counterBuffer = await ctx.stub.getState(counterKey);

            let counter = 1; // Default counter value
            if (counterBuffer && counterBuffer.length > 0) {
                counter = parseInt(counterBuffer.toString('utf8'), 10);
                counter++; // Increment the counter for the new document
            }

            const documentId = `${userEmail}_TR-DocumentID${counter}`;
            console.log(`Successfully created Document: ${documentId}`);

            // Ensure that additionalDocumentData is a JSON object
            let dynamicAdditionalDocumentData;
            if (typeof additionalDocumentData === 'object') {
                dynamicAdditionalDocumentData = additionalDocumentData;
            } else {
                try {
                    dynamicAdditionalDocumentData = JSON.parse(additionalDocumentData);
                } catch (error) {
                    throw new Error('Invalid additionalDocumentData. It must be a valid JSON string.');
                }
            }

            const document = {
                documentId,
                additionalDocumentData: dynamicAdditionalDocumentData,
                createdBy: {
                    userId: user.userId,
                    userName: user.userName,
                    userEmail: user.userEmail,
                },
                createdAt: new Date(timestampSeconds * 1000 + timestampNanos / 1e6),
                lastModifiedAt: new Date(timestampSeconds * 1000 + timestampNanos / 1e6),
                txID: txID, // Include txID in the document object
            };

            // Update the document counter for the user in the ledger
            await ctx.stub.putState(counterKey, Buffer.from(counter.toString()));

            // Store the document details on the ledger
            await ctx.stub.putState(documentId, Buffer.from(JSON.stringify(document)));

            return document;
        } catch (error) {
            console.error(`Error in uploadDocument: ${error.message}`);
            console.error(error.stack); // Log the stack trace
            throw new Error(`Error in uploadDocument: ${error.message}`);
        }
    }

    async inspectionDraftSurvey(ctx, userEmail, additionalDocumentData) {
        try {
            // Check if the user exists by userId
            const userExists = await this.isUserExists(ctx, userEmail);
            if (!userExists) {
                throw new Error(`User with ID ${userEmail} does not exist.`);
            }

            // Get the transaction timestamp and ID
            const txTimestamp = ctx.stub.getTxTimestamp();
            const txID = ctx.stub.getTxID();
            const timestampSeconds = txTimestamp.seconds.toNumber();
            const timestampNanos = txTimestamp.nanos;

            // Retrieve the user details
            const user = await this.getUserDetails(ctx, userEmail);

            // Increment the document counter for the user
            const counterKey = `${userEmail}_DocumentCounter`;
            const counterBuffer = await ctx.stub.getState(counterKey);

            let counter = 1; // Default counter value
            if (counterBuffer && counterBuffer.length > 0) {
                counter = parseInt(counterBuffer.toString('utf8'), 10);
                counter++; // Increment the counter for the new document
            }

            const documentId = `TRD.I/DS/${counter}`;
            console.log(`Successfully created Draft Survey Report: ${documentId}`);

            // Ensure that additionalDocumentData is a JSON object
            let dynamicAdditionalDocumentData;
            if (typeof additionalDocumentData === 'object') {
                dynamicAdditionalDocumentData = additionalDocumentData;
            } else {
                try {
                    dynamicAdditionalDocumentData = JSON.parse(additionalDocumentData);
                } catch (error) {
                    throw new Error('Invalid additionalDocumentData. It must be a valid JSON string.');
                }
            }

            const document = {
                documentId,
                additionalDocumentData: dynamicAdditionalDocumentData,
                createdBy: {
                    userId: user.userId,
                    userName: user.userName,
                    userEmail: user.userEmail,
                },
                createdAt: new Date(timestampSeconds * 1000 + timestampNanos / 1e6),
                lastModifiedAt: new Date(timestampSeconds * 1000 + timestampNanos / 1e6),
                txID: txID, // Include txID in the document object
            };

            // Update the document counter for the user in the ledger
            await ctx.stub.putState(counterKey, Buffer.from(counter.toString()));

            // Store the document details on the ledger
            await ctx.stub.putState(documentId, Buffer.from(JSON.stringify(document)));

            return document;
        } catch (error) {
            console.error(`Error in Draft Survey Document: ${error.message}`);
            console.error(error.stack); // Log the stack trace
            throw new Error(`Error in Draft Survey Document: ${error.message}`);
        }
    }
    async inspectionDocs(ctx, userEmail, additionalDocumentData) {
        try {
            // Check if the user exists by userId
            const userExists = await this.isUserExists(ctx, userEmail);
            if (!userExists) {
                throw new Error(`User with ID ${userEmail} does not exist.`);
            }

            // Get the transaction timestamp and ID
            const txTimestamp = ctx.stub.getTxTimestamp();
            const txID = ctx.stub.getTxID();
            const timestampSeconds = txTimestamp.seconds.toNumber();
            const timestampNanos = txTimestamp.nanos;

            // Retrieve the user details
            const user = await this.getUserDetails(ctx, userEmail);

            // Increment the document counter for the user
            const counterKey = `${userEmail}_DocumentCounter`;
            const counterBuffer = await ctx.stub.getState(counterKey);

            let counter = 1; // Default counter value
            if (counterBuffer && counterBuffer.length > 0) {
                counter = parseInt(counterBuffer.toString('utf8'), 10);
                counter++; // Increment the counter for the new document
            }

            const documentId = `IC/TRD/${counter}`;
            console.log(`Successfully created Inspection Certificate Report: ${documentId}`);

            // Ensure that additionalDocumentData is a JSON object
            let dynamicAdditionalDocumentData;
            if (typeof additionalDocumentData === 'object') {
                dynamicAdditionalDocumentData = additionalDocumentData;
            } else {
                try {
                    dynamicAdditionalDocumentData = JSON.parse(additionalDocumentData);
                } catch (error) {
                    throw new Error('Invalid additionalDocumentData. It must be a valid JSON string.');
                }
            }

            const document = {
                documentId,
                additionalDocumentData: dynamicAdditionalDocumentData,
                createdBy: {
                    userId: user.userId,
                    userName: user.userName,
                    userEmail: user.userEmail,
                },
                createdAt: new Date(timestampSeconds * 1000 + timestampNanos / 1e6),
                lastModifiedAt: new Date(timestampSeconds * 1000 + timestampNanos / 1e6),
                txID: txID, // Include txID in the document object
            };

            // Update the document counter for the user in the ledger
            await ctx.stub.putState(counterKey, Buffer.from(counter.toString()));

            // Store the document details on the ledger
            await ctx.stub.putState(documentId, Buffer.from(JSON.stringify(document)));

            return document;
        } catch (error) {
            console.error(`Error in Inspection Certificate: ${error.message}`);
            console.error(error.stack); // Log the stack trace
            throw new Error(`Error in Inspection Certificate: ${error.message}`);
        }
    }

    async createContract(ctx, userEmail, contractId, additionalContractData) {
        try {
            // Check if the user exists by userId
            const userExists = await this.isUserExists(ctx, userEmail);
            if (!userExists) {
                throw new Error(`User with ID ${userEmail} does not exist.`);
            }

            // Get the transaction timestamp and ID
            const txTimestamp = ctx.stub.getTxTimestamp();
            const txID = ctx.stub.getTxID();
            const timestampSeconds = txTimestamp.seconds.toNumber();
            const timestampNanos = txTimestamp.nanos;

            // Retrieve the user details
            const user = await this.getUserDetails(ctx, userEmail);

            // Increment the document counter for the user
            const counterKey = `${userEmail}_ContractCounter`;
            const counterBuffer = await ctx.stub.getState(counterKey);

            let counter = 1; // Default counter value
            if (counterBuffer && counterBuffer.length > 0) {
                counter = parseInt(counterBuffer.toString('utf8'), 10);
                counter++; // Increment the counter for the new document
            }

            const contractsId = `${userEmail}_TR-ContractID${counter}`;
            console.log(`Successfully created contract: ${contractsId}`);

            // Ensure that additionalContractData is a JSON object
            let dynamicAdditionalContractData;
            if (typeof additionalContractData === 'object') {
                dynamicAdditionalContractData = additionalContractData;
            } else {
                try {
                    dynamicAdditionalContractData = JSON.parse(additionalContractData);
                } catch (error) {
                    throw new Error('Invalid additionalContractData. It must be a valid JSON string.');
                }
            }

            const contract = {
                contractsId,
                contractId,
                additionalContractData: dynamicAdditionalContractData,
                createdBy: {
                    userId: user.userId,
                    userName: user.userName,
                    userEmail: user.userEmail,
                },
                createdAt: new Date(timestampSeconds * 1000 + timestampNanos / 1e6),
                lastModifiedAt: new Date(timestampSeconds * 1000 + timestampNanos / 1e6),
                txID: txID, // Include txID in the document object
            };

            // Update the document counter for the user in the ledger
            await ctx.stub.putState(counterKey, Buffer.from(counter.toString()));

            // Store the document details on the ledger
            await ctx.stub.putState(contractsId, Buffer.from(JSON.stringify(contract)));
            
            return {
                contractsId,
                contractId,
                additionalContractData: dynamicAdditionalContractData,
                createdBy: {
                  userId: user.userId,
                  userName: user.userName,
                  userEmail: user.userEmail,
                },
                createdAt: new Date(timestampSeconds * 1000 + timestampNanos / 1e6),
                lastModifiedAt: new Date(timestampSeconds * 1000 + timestampNanos / 1e6),
                txID: txID,
              };
            } catch (error) {
              console.error(`Error in CreateContract: ${error.message}`);
              console.error(error.stack); // Log the stack trace
          
              // Optionally, you can also log the error to the console
              console.error(error);
          
              throw new Error(`Error in CreateContract: ${error.message}`);
            }
    }
    
    async getDocumentDetails(ctx, documentId) {
        try {
            // Retrieve and return the document details
            const documentBuffer = await ctx.stub.getState(documentId);
            if (!documentBuffer || documentBuffer.length === 0) {
                throw new Error(`Document with ID ${documentId} does not exist.`);
            }

            return JSON.parse(documentBuffer.toString('utf8'));
        } catch (error) {
            console.error(`Error in getDocumentDetails: ${error.message}`);
            throw new Error(`Error in getDocumentDetails: ${error.message}`);
        }
    }

    async getContractDetails(ctx, contractsId) {
        try {
            // Retrieve and return the document details
            const documentBuffer = await ctx.stub.getState(contractsId);
            if (!documentBuffer || documentBuffer.length === 0) {
                throw new Error(`Contract with ID ${contractsId} does not exist.`);
            }

            return JSON.parse(documentBuffer.toString('utf8'));
        } catch (error) {
            console.error(`Error in getContractDetails: ${error.message}`);
            throw new Error(`Error in getContractDetails:: ${error.message}`);
        }
    }

    async updateDocumentDetails(ctx, documentId, updatedDetails) {
        try {
            // Check if the document exists
            const docExists = await this.isDocExists(ctx, documentId);

            if (!docExists) {
                throw new Error(`User ${documentId} does not exist`);
            }



            const existingDocument = await this.getDocumentDetails(ctx, documentId);

            // Update the document details
            const timestamp = ctx.stub.getTxTimestamp();
            const txID = ctx.stub.getTxID();

            const updatedDocument = {
                ...existingDocument,
                ...JSON.parse(updatedDetails),
                lastModifiedAt: new Date(timestamp.seconds * 1000 + timestamp.nanos / 1e6).toISOString(),
                timestamp: timestamp.seconds.toString() + '.' + timestamp.nanos.toString(),
                txID: txID,
                lastModifiedBy: ctx.clientIdentity.getID(),
            };

            // Store the updated document on the ledger
            await ctx.stub.putState(documentId, Buffer.from(JSON.stringify(updatedDocument)));
            console.log(`Successfully update documents: ${updatedDocument}`);

            return updatedDocument;
        } catch (error) {
            console.error(`Error in updateDocumentDetails: ${error.message}`);
            console.error(error.stack); // Log the stack trace
            throw new Error(`Error in updateDocumentDetails: ${error.message}`);
        }
    }

    async updateContractDetails(ctx, contractsId, updatedDetails) {
        try {
            // Check if the document exists
            const conExists = await this.isConExists(ctx, contractsId);

            if (!conExists) {
                throw new Error(`User ${contractsId} does not exist`);
            }



            const existingContract = await this.getContractDetails(ctx, contractsId);

            // Update the document details
            const timestamp = ctx.stub.getTxTimestamp();
            const txID = ctx.stub.getTxID();

            const updatedContract = {
                ...existingContract,
                ...JSON.parse(updatedDetails),
                lastModifiedAt: new Date(timestamp.seconds * 1000 + timestamp.nanos / 1e6).toISOString(),
                timestamp: timestamp.seconds.toString() + '.' + timestamp.nanos.toString(),
                txID: txID,
                lastModifiedBy: ctx.clientIdentity.getID(),
            };

            // Store the updated document on the ledger
            await ctx.stub.putState(contractsId, Buffer.from(JSON.stringify(updatedContract)));
            console.log(`Successfully Update contract: ${updatedContract}`);

            return updatedContract;

        } catch (error) {
            console.error(`Error in updateContractDetails: ${error.message}`);
            console.error(error.stack); // Log the stack trace
            throw new Error(`Error in updateContractDetails: ${error.message}`);
        }
    }

    async deleteDocument(ctx, documentId) {
        try {
            const docExists = await this.isDocExists(ctx, documentId);
            if (!docExists) {
                throw new Error(`User ${documentId} does not exist`);
            }
            // Delete the document from the ledger
            await ctx.stub.deleteState(documentId);
            return `User ${documentId} has been deleted`;
        } catch (error) {
            console.error(`Error in deleteDocument: ${error.message}`);
            throw new Error(`Error in deleteDocument: ${error.message}`);
        }
    }

    async deleteContract(ctx, contractsId) {
        try {
            const conExists = await this.isConExists(ctx,contractsId);
            if (!conExists) {
                throw new Error(`User ${contractsId} does not exist`);
            }
            // Delete the document from the ledger
            await ctx.stub.deleteState(contractsId);
            return `User ${contractsId} has been deleted`;
        } catch (error) {
            console.error(`Error in deleteDocument: ${error.message}`);
            throw new Error(`Error in deleteDocument: ${error.message}`);
        }
    }

    async getDocumentHistory(ctx, documentId) {
        try {
            // Get the history iterator for the document
            const iterator = await ctx.stub.getHistoryForKey(documentId);
            const history = [];

            let result = await iterator.next();
            let txIndex = 1;

            // Iterate through the history and collect transaction details
            while (!result.done) {
                if (result.value) {
                    const transaction = {
                        timestamp: result.value.timestamp,
                        transactionID: result.value.tx_id,
                        value: JSON.parse(result.value.value.toString('utf8')),
                        isDelete: result.value.is_delete
                    };

                    history.push(transaction);
                }
                result = await iterator.next();
                txIndex++;
            }

            await iterator.close();
            return JSON.stringify(history);
        } catch (error) {
            console.error(`Error in getDocumentHistory: ${error.message}`);
            throw new Error(`Error in getDocumentHistory: ${error.message}`);
        }
    }

    async getContractHistory(ctx, contractsId) {
        try {
            // Get the history iterator for the contract
            const iterator = await ctx.stub.getHistoryForKey(contractsId);
            const history = [];

            let result = await iterator.next();
            let txIndex = 1;

            // Iterate through the history and collect transaction details
            while (!result.done) {
                if (result.value) {
                    const transaction = {
                        timestamp: result.value.timestamp,
                        transactionID: result.value.tx_id,
                        value: JSON.parse(result.value.value.toString('utf8')),
                        isDelete: result.value.is_delete
                    };

                    history.push(transaction);
                }
                result = await iterator.next();
                txIndex++;
            }

            await iterator.close();
            return JSON.stringify(history);
        } catch (error) {
            console.error(`Error in getDocumentHistory: ${error.message}`);
            throw new Error(`Error in getDocumentHistory: ${error.message}`);
        }
    }

    async getDocumentsByUserEmail(ctx, userEmail) {
        try {
            // Create a composite key to query documents by user ID
            const iterator = await ctx.stub.getStateByPartialCompositeKey(userEmail['document']);

            const documents = [];
            let result = await iterator.next();
            while (!result.done) {
                if (result.value) {
                    const document = JSON.parse(result.value.value.toString('utf8'));
                    documents.push(document);
                }
                result = await iterator.next();
            }

            await iterator.close();
            return JSON.stringify(documents);
        } catch (error) {
            console.error(`Error in getDocumentsByUserId: ${error.message}`);
            throw new Error(`Error in getDocumentsByUserId: ${error.message}`);
        }
    }

}

module.exports = FabCar;

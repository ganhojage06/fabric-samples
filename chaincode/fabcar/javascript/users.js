// 'use strict';

// const { Contract } = require('fabric-contract-api');
// const crypto = require('crypto');

// class TradingPlatformContract extends Contract {
//     // Existing functions...

//     async initLedger(ctx) {
//         try {
//             const sampleUsers = [
//                 {
//                     userId: "123",
//                     userName: "John Doe",
//                     userEmail: "john@example.com",
//                     userMobile: "1234567890",
//                     userPassword: "hashedPassword",
//                     userType: "Exporter",
//                     additionalData: {
//                         ExporterDetails: {
//                             registrationNumber: "REG001",
//                             exportImportNumber: "EXPIMP001",
//                             countryOfOrigin: "CountryXYZ",
//                             shippingAddress: "123 Main St",
//                             panCardNumber: "PAN123",
//                             bankDetails: {
//                                 bankName: "ABC Bank",
//                                 accountNumber: "1234567890",
//                                 branch: "Main Branch"
//                             }
//                         }
//                     },
//                     createdAt: "2023-01-01T12:00:00Z",
//                     createdBy: "admin",
//                     lastModifiedAt: "2023-01-02T14:30:00Z"
//                 },
//                 // Add more sample users with different user types...
//                 {
//                     userId: "123",
//                     userName: "John Doe",
//                     userEmail: "john@example.com",
//                     userMobile: "1234567890",
//                     userPassword: "hashedPassword",
//                     userType: "Importer",
//                     additionalData: {
//                         ImporterDetails: {
//                             registrationNumber: "REG001",
//                             exportImportNumber: "EXPIMP001",
//                             countryOfOrigin: "CountryXYZ",
//                             shippingAddress: "123 Main St",
//                             panCardNumber: "PAN123",
//                             bankDetails: {
//                                 bankName: "ABC Bank",
//                                 accountNumber: "1234567890",
//                                 branch: "Main Branch"
//                             }
//                         }
//                     },
//                     createdAt: "2023-01-01T12:00:00Z",
//                     createdBy: "admin",
//                     lastModifiedAt: "2023-01-02T14:30:00Z"
//                 },
//             ];

//             for (const user of sampleUsers) {
//                 await this.registerUser(
//                     ctx,
//                     user.userId,
//                     user.userName,
//                     user.userEmail,
//                     user.userMobile,
//                     user.userPassword,
//                     user.userType,
//                     user.additionalData
//                 );
//             }

//             return 'Ledger initialized with sample data';
//         } catch (error) {
//             console.error(`Error in initLedger: ${error.message}`);
//             throw new Error(`Error in initLedger: ${error.message}`);
//         }
//     }

//     async registerUser(ctx, userId, userName, userEmail, userMobile, userPassword, userType, additionalData) {
//         try {
//             const userExists = await this.isUserExists(ctx, userId);
//             if (userExists) {
//                 throw new Error('User already exists');
//             }

//             // Hash and salt the password before storing
//             const salt = crypto.randomBytes(16).toString('hex');
//             const hashedPassword = crypto.pbkdf2Sync(userPassword, salt, 1000, 64, 'sha512').toString('hex');

//             // Customize additionalData based on userType dynamically
//             const dynamicAdditionalData = {};
//             Object.keys(additionalData).forEach(key => {
//                 dynamicAdditionalData[key] = additionalData[key];
//             });

//             const user = {
//                 userId,
//                 userName,
//                 userEmail,
//                 userMobile,
//                 userPassword: hashedPassword,
//                 passwordSalt: salt,
//                 userType,
//                 additionalData: {
//                     [`${userType}Details`]: dynamicAdditionalData
//                 },
//                 createdAt: new Date(),
//                 createdBy: ctx.clientIdentity.getID(),
//                 lastModifiedAt: new Date(),
//             };

//             const userBuffer = Buffer.from(JSON.stringify(user));
//             await ctx.stub.putState(userId, userBuffer);
//             return user;
//         } catch (error) {
//             console.error(`Error in registerUser: ${error.message}`);
//             throw new Error(`Error in registerUser: ${error.message}`);
//         }
//     }

//     async isUserExists(ctx, userId) {
//         const userBuffer = await ctx.stub.getState(userId);
//         return !!userBuffer && userBuffer.length > 0;
//     }

//     async getUserDetails(ctx, userId) {
//         try {
//             const userBuffer = await ctx.stub.getState(userId);
//             if (!userBuffer || userBuffer.length === 0) {
//                 throw new Error(`User ${userId} does not exist`);
//             }

//             return JSON.parse(userBuffer.toString());
//         } catch (error) {
//             console.error(`Error in getUserDetails: ${error.message}`);
//             throw new Error(`Error in getUserDetails: ${error.message}`);
//         }
//     }

//     async updateUserDetails(ctx, userId, updatedDetails) {
//         try {
//             const userExists = await this.isUserExists(ctx, userId);
//             if (!userExists) {
//                 throw new Error(`User ${userId} does not exist`);
//             }

//             const existingUser = await this.getUserDetails(ctx, userId);
//             const updatedUser = { ...existingUser, ...JSON.parse(updatedDetails), lastModifiedAt: new Date() };

//             // Re-hash the password if updated
//             if (updatedUser.userPassword) {
//                 const salt = crypto.randomBytes(16).toString('hex');
//                 const hashedPassword = crypto.pbkdf2Sync(updatedUser.userPassword, salt, 1000, 64, 'sha512').toString('hex');
//                 updatedUser.userPassword = hashedPassword;
//                 updatedUser.passwordSalt = salt;
//             }

//             const userBuffer = Buffer.from(JSON.stringify(updatedUser));
//             await ctx.stub.putState(userId, userBuffer);
//             return updatedUser;
//         } catch (error) {
//             console.error(`Error in updateUserDetails: ${error.message}`);
//             throw new Error(`Error in updateUserDetails: ${error.message}`);
//         }
//     }

//     async deleteUser(ctx, userId) {
//         try {
//             const userExists = await this.isUserExists(ctx, userId);
//             if (!userExists) {
//                 throw new Error(`User ${userId} does not exist`);
//             }

//             await ctx.stub.deleteState(userId);
//             return `User ${userId} has been deleted`;
//         } catch (error) {
//             console.error(`Error in deleteUser: ${error.message}`);
//             throw new Error(`Error in deleteUser: ${error.message}`);
//         }
//     }

//     async authenticateUser(ctx, userId, userPassword) {
//         try {
//             const user = await this.getUserDetails(ctx, userId);

//             const hashedPassword = crypto.pbkdf2Sync(userPassword, user.passwordSalt, 1000, 64, 'sha512').toString('hex');
//             if (hashedPassword === user.userPassword) {
//                 return `User ${userId} authenticated successfully`;
//             } else {
//                 throw new Error('Invalid credentials');
//             }
//         } catch (error) {
//             console.error(`Error in authenticateUser: ${error.message}`);
//             throw new Error(`Error in authenticateUser: ${error.message}`);
//         }
//     }

//     async getHistoryForUser(ctx, userId) {
//         try {
//             const iterator = await ctx.stub.getHistoryForKey(userId);
//             const history = [];

//             let result = await iterator.next();
//             while (!result.done) {
//                 if (result.value) {
//                     history.push(JSON.parse(result.value.value.toString('utf8')));
//                 }
//                 result = await iterator.next();
//             }

//             await iterator.close();
//             return JSON.stringify(history);
//         } catch (error) {
//             console.error(`Error in getHistoryForUser: ${error.message}`);
//             throw new Error(`Error in getHistoryForUser: ${error.message}`);
//         }
//     }

//     async getAllUsers(ctx) {
//         try {
//             const iterator = await ctx.stub.getStateByRange('', '');

//             const users = [];
//             let result = await iterator.next();
//             while (!result.done) {
//                 if (result.value) {
//                     users.push(JSON.parse(result.value.value.toString('utf8')));
//                 }
//                 result = await iterator.next();
//             }

//             await iterator.close();
//             return JSON.stringify(users);
//         } catch (error) {
//             console.error(`Error in getAllUsers: ${error.message}`);
//             throw new Error(`Error in getAllUsers: ${error.message}`);
//         }
//     }

//     async queryUsersByField(ctx, fieldName, value) {
//         try {
//             const query = {
//                 selector: {}
//             };
//             query.selector[fieldName] = value;

//             const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));

//             const users = [];
//             let result = await iterator.next();
//             while (!result.done) {
//                 users.push(JSON.parse(result.value.value.toString('utf8')));
//                 result = await iterator.next();
//             }

//             await iterator.close();

//             return JSON.stringify(users);
//         } catch (error) {
//             console.error(`Error in queryUsersByField: ${error.message}`);
//             throw new Error(`Error in queryUsersByField: ${error.message}`);
//         }
//     }
// }

// module.exports = TradingPlatformContract;

// /*
//  * Copyright IBM Corp. All Rights Reserved.
//  *
//  * SPDX-License-Identifier: Apache-2.0
//  */

// 'use strict';

// const { Contract } = require('fabric-contract-api');

// class InspectionCertificate extends Contract {
//     async initLedger(ctx) {
//         console.info('============= START : Initialize Ledger ===========');
//         const assets = [
//             {
//                 PurchaseOrderNumber: 'TRD12023',
//                 InspectionDate: '2023-05-20',
//                 PlaceOfInspection: 'BOM',
//                 ContactDetailsOfImporter: 'KAVITA',
//                 CountryOfOrigin: 'INDIA',
//                 ProductDescription: 'This is the best product',
//                 ContactDetailsOfSupplier: 'Piyush Khandelwal, India,474001',
//                 PortOfDischarge: 'LA,USA'
//             },
//            {
//                 PurchaseOrderNumber: 'TRD22023',
//                 InspectionDate: '2023-05-20',
//                 PlaceOfInspection: 'GWL',
//                 ContactDetailsOfImporter: 'KANNU',
//                 CountryOfOrigin: 'INDIA',
//                 ProductDescription: 'This is best our Product',
//                 ContactDetailsOfSupplier: 'Piyush Khandelwal , India,474001',
//                 PortOfDischarge: 'LA,USA'
//             },
//             {
//                 PurchaseOrderNumber: 'TRD32023',
//                 InspectionDate: '2023-05-20',
//                 PlaceOfInspection: 'DEL',
//                 ContactDetailsOfImporter: 'Shubham',
//                 CountryOfOrigin: 'DELHI',
//                 ProductDescription: 'This is best our Product',
//                 ContactDetailsOfSupplier: 'Piyush Khandelwal , India,474001',
//                 PortOfDischarge: 'Toronto,CA'
//             },
//             {
//                 PurchaseOrderNumber: 'TRD42023',
//                 InspectionDate: '2023-05-20',
//                 PlaceOfInspection: 'BOMBAY',
//                 ContactDetailsOfImporter: 'Mahima',
//                 CountryOfOrigin: 'India',
//                 ProductDescription: 'This is best our Product',
//                 ContactDetailsOfSupplier: 'Piyush Khandelwal , India,474001',
//                 PortOfDischarge: 'NewYork,USA'
//             },
//             {
//                 PurchaseOrderNumber: 'TRD52023',
//                 InspectionDate: '2023-05-20',
//                 PlaceOfInspection: 'Vishakapatnam',
//                 ContactDetailsOfImporter: 'Sonu',
//                 CountryOfOrigin: 'India',
//                 ProductDescription: 'This is best our Product',
//                 ContactDetailsOfSupplier: 'Piyush Khandelwal , India,474001',
//                 PortOfDischarge: 'LA,USA'
//             },
//             {
//                 PurchaseOrderNumber: 'TRD62023',
//                 InspectionDate: '2023-05-20',
//                 PlaceOfInspection: 'Chennai',
//                 ContactDetailsOfImporter: 'Ganesh',
//                 CountryOfOrigin: 'India',
//                 ProductDescription: 'This is best our Product',
//                 ContactDetailsOfSupplier: 'Piyush Khandelwal , India,474001',
//                 PortOfDischarge: 'CF,USA'
//             }
//         ];

//         for (let i = 0; i < assets.length; i++) {
//             assets[i].docType = 'Certificate of Inspection';
//             await ctx.stub.putState('Certificate_Of_Inspection' + i, Buffer.from(JSON.stringify(assets[i])));
//             console.info('Added <--> ', assets[i]);
//         }
//         console.info('============= END : Initialize Ledger ===========');
//     }

//     async createCertificate(ctx, certificateNumber, purchaseOrderNumber, inspectionDate, placeOfInspection, contactDetailsOfImporter, countryOfOrigin, productDescription, contactDetailsOfSupplier, portOfDischarge) {
//         console.info('============= START : Create certificate ===========');

//         const asset = {
//             PurchaseOrderNumber: purchaseOrderNumber,
//             InspectionDate: inspectionDate,
//             PlaceOfInspection: placeOfInspection,
//             ContactDetailsOfImporter: contactDetailsOfImporter,
//             CountryOfOrigin: countryOfOrigin,
//             ProductDescription: productDescription,
//             ContactDetailsOfSupplier: contactDetailsOfSupplier,
//             PortOfDischarge: portOfDischarge,
//             docType: 'Certificate of Inspection',
//         };

//         await ctx.stub.putState(certificateNumber, Buffer.from(JSON.stringify(asset)));
//         console.info('============= END : Create certificate ===========');
//     }

//     async deleteCertificate(ctx, certificateNumber) {
//         console.info('============= START : Delete certificate ===========');

//         const exists = await this.certificateExists(ctx, certificateNumber);
//         if (!exists) {
//             throw new Error(`${certificateNumber} does not exist`);
//         }

//         await ctx.stub.deleteState(certificateNumber);
//         console.info('============= END : Delete certificate ===========');
//     }

//     async updateCertificate(ctx, certificateNumber, updatedFields) {
//         console.info('============= START : Update certificate ===========');

//         const exists = await this.certificateExists(ctx, certificateNumber);
//         if (!exists) {
//             throw new Error(`${certificateNumber} does not exist`);
//         }

//         const existingCertificate = JSON.parse(await ctx.stub.getState(certificateNumber).toString());
//         const updatedCertificate = { ...existingCertificate, ...updatedFields };

//         await ctx.stub.putState(certificateNumber, Buffer.from(JSON.stringify(updatedCertificate)));
//         console.info('============= END : Update certificate ===========');
//     }

//     async replaceCertificate(ctx, certificateNumber, newCertificate) {
//         console.info('============= START : Replace certificate ===========');

//         const exists = await this.certificateExists(ctx, certificateNumber);
//         if (!exists) {
//             throw new Error(`${certificateNumber} does not exist`);
//         }

//         await ctx.stub.putState(certificateNumber, Buffer.from(JSON.stringify(newCertificate)));
//         console.info('============= END : Replace certificate ===========');
//     }

//     async certificateExists(ctx, certificateNumber) {
//         const certificateAsBytes = await ctx.stub.getState(certificateNumber);
//         return certificateAsBytes && certificateAsBytes.length > 0;
//     }

//     async queryAllAssets(ctx) {
//         const startKey = '';
//         const endKey = '';
//         const allResults = [];
//         for await (const { key, value } of ctx.stub.getStateByRange(startKey, endKey)) {
//             const strValue = Buffer.from(value).toString('utf8');
//             let record;
//             try {
//                 record = JSON.parse(strValue);
//             } catch (err) {
//                 console.log(err);
//                 record = strValue;
//             }
//             allResults.push({ Key: key, Record: record });
//         }
//         console.info(allResults);
//         return JSON.stringify(allResults);
//     }
//     async queryAsset(ctx, certificateNumber) {
//         try {
//           const assetJSON = await ctx.stub.getState(certificateNumber);
      
//           if (!assetJSON || assetJSON.length === 0) {
//             throw new Error(`Asset with certificateNumber ${certificateNumber} does not exist`);
//           }
      
//           const asset = JSON.parse(assetJSON.toString('utf8'));
//           return JSON.stringify(asset);
//         } catch (error) {
//           console.error(`Failed to query asset: ${error}`);
//           throw new Error('Failed to query asset');
//         }
//       }
      

//     async changeCertificateOwner(ctx, certificateNumber, newContactDetailsOfImporter) {
//         console.info('============= START : changeCertificateOwner ===========');

//         const certificateAsBytes = await ctx.stub.getState(certificateNumber); // get the certificate from chaincode state
//         if (!certificateAsBytes || certificateAsBytes.length === 0) {
//             throw new Error(`${certificateNumber} does not exist`);
//         }
//         const asset = JSON.parse(certificateAsBytes.toString());
//         asset.ContactDetailsOfImporter = newContactDetailsOfImporter;

//         await ctx.stub.putState(certificateNumber, Buffer.from(JSON.stringify(asset)));
//         console.info('============= END : changeCertificateOwner ===========');
//     }
// }

//module.exports = InspectionCertificate;
// /*
//  * Copyright IBM Corp. All Rights Reserved.
//  *
//  * SPDX-License-Identifier: Apache-2.0
//  */

// 'use strict';

// const { Contract } = require('fabric-contract-api');

// class Users extends Contract {

//     async initLedger(ctx) {
//         try {
//            const Users = [
//                 {
//                     userId: "123",
//                     userName: "John Doe",
//                     userEmail: "john@example.com",
//                     userMobile: "1234567890",
//                     userPassword: "hashedPassword",
//                     userType: "Exporter",
//                     additionalData: {
//                         ExporterDetails: {
//                             registrationNumber: "REG001",
//                             exportImportNumber: "EXPIMP001",
//                             countryOfOrigin: "CountryXYZ",
//                             shippingAddress: "123 Main St",
//                             panCardNumber: "PAN123",
//                             bankDetails: {
//                                 bankName: "ABC Bank",
//                                 accountNumber: "1234567890",
//                                 branch: "Main Branch"
//                             }
//                         }
//                     },
//                     createdAt: "2023-01-01T12:00:00Z",
//                     createdBy: "admin",
//                     lastModifiedAt: "2023-01-02T14:30:00Z"
//                 },
//                 // Add more sample users with different user types...
//                 {
//                     userId: "1234",
//                     userName: "John Doe",
//                     userEmail: "john@example.com",
//                     userMobile: "1234567890",
//                     userPassword: "hashedPassword",
//                     userType: "Importer",
//                     additionalData: {
//                         ImporterDetails: {
//                             registrationNumber: "REG001",
//                             exportImportNumber: "EXPIMP001",
//                             countryOfOrigin: "CountryXYZ",
//                             shippingAddress: "123 Main St",
//                             panCardNumber: "PAN123",
//                             bankDetails: {
//                                 bankName: "ABC Bank",
//                                 accountNumber: "1234567890",
//                                 branch: "Main Branch"
//                             } // user.userMobile,
                    // user.userPassword,
                    // user.userType,
                    // user.additionalData,
                    // user.createdAt,
                    // user.createdBy,
                    // user.lastModifiedAt
//                         }
//                     },
//                     createdAt: "2023-01-01T12:00:00Z",
//                     createdBy: "admin",
//                     lastModifiedAt: "2023-01-02T14:30:00Z"
//                 },
//             ];

//             for (const user of Users) {
//                 await this.registerUser(
//                     ctx,
//                     user.userId,
//                     user.userName,
//                    user.userEmail,
                    // user.userMobile,
                    // user.userPassword,
                    // user.userType,
                    // user.additionalData,
                    // user.createdAt,
                    // user.createdBy,
                    // user.lastModifiedAt
//                 );
//             }

//             return 'Ledger initialized with sample data';
//         } catch (error) {
//             console.error(`Error in initLedger: ${error.message}`);
//             throw new Error(`Error in initLedger: ${error.message}`);
//         }
//     }

//     async registerUser(ctx, userId, userName, userEmail, userMobile, userPassword, userType, additionalData) {
//         try {
//             const userExists = await this.isUserExists(ctx, userId);
//             if (userExists) {
//                 throw new UserAlreadyExistsError();
//             }

//             const dynamicAdditionalData = {};
//             Object.keys(additionalData).forEach(key => {
//                 dynamicAdditionalData[key] = additionalData[key];
//             });

//             const user = {
//                 userId,
//                 userName,
//                 userEmail,
//                 userMobile,
//                 userPassword,
//                 userType,
//                 additionalData: {
//                     [`${userType}Details`]: dynamicAdditionalData
//                 },
//                 createdAt: new Date(),
//                 createdBy: ctx.clientIdentity.getID(),
//                 lastModifiedAt: new Date(),
//             };
//             const userBuffer = Buffer.from(JSON.stringify(user));
//             await ctx.stub.putState(userId, userBuffer);
//             return user;
//         } catch (error) {
//             console.error(`Error in registerUser: ${error.message}`);
//             throw error instanceof UserAlreadyExistsError ? error : new Error(`Error in registerUser: ${error.message}`);
//         }
//     }

//     async isUserExists(ctx, userId) {
//         const userBuffer = await ctx.stub.getState(userId);
//         return !!userBuffer && userBuffer.length > 0;
//     }



//     async getUserDetails(ctx, userId) {
//         try {
//             const userBuffer = await ctx.stub.getState(userId);
//             if (!userBuffer || userBuffer.length === 0) {
//                 throw new UserNotFoundError(userId);
//             }

//             return JSON.parse(userBuffer.toString());
//         } catch (error) {
//             console.error(`Error in getUserDetails: ${error.message}`);
//             throw error instanceof UserNotFoundError ? error : new Error(`Error in getUserDetails: ${error.message}`);
//         }
//     }

//    async updateUserDetails(ctx, userId, updatedDetails) {
//         try {
//             const userExists = await this.isUserExists(ctx, userId);
//             if (!userExists) {
//                 throw new Error(`User ${userId} does not exist`);
//             }

//             const existingUser = await this.getUserDetails(ctx, userId);
//             const updatedUser = { ...existingUser, ...JSON.parse(updatedDetails), lastModifiedAt: new Date() };

//             const userBuffer = Buffer.from(JSON.stringify(updatedUser));
//             await ctx.stub.putState(userId, userBuffer);
//             return updatedUser;
//         } catch (error) {
//             console.error(`Error in updateUserDetails: ${error.message}`);
//             throw new Error(`Error in updateUserDetails: ${error.message}`);
//         }
//     }
    

//     async deleteUser(ctx, userId) {
//         try {
//             const userExists = await this.isUserExists(ctx, userId);
//             if (!userExists) {
//                 throw new Error(`User ${userId} does not exist`);
//             }

//             await ctx.stub.deleteState(userId);
//             return `User ${userId} has been deleted`;
//         } catch (error) {
//             console.error(`Error in deleteUser: ${error.message}`);
//             throw new Error(`Error in deleteUser: ${error.message}`);
//         }
//     }

  

//     async getHistoryForUser(ctx, userId) {
//         try {
//             const iterator = await ctx.stub.getHistoryForKey(userId);
//             const history = [];

//             let result = await iterator.next();
//             while (!result.done) {
//                 if (result.value) {
//                     history.push(JSON.parse(result.value.value.toString('utf8')));
//                 }
//                 result = await iterator.next();
//             }

//             await iterator.close();
//             return JSON.stringify(history);
//         } catch (error) {
//             console.error(`Error in getHistoryForUser: ${error.message}`);
//             throw new Error(`Error in getHistoryForUser: ${error.message}`);
//         }
//     }

//     async getAllUsers(ctx) {
//         try {
//             const iterator = await ctx.stub.getStateByRange('', '');

//             const users = [];
//             let result = await iterator.next();
//             while (!result.done) {
//                 if (result.value) {
//                     users.push(JSON.parse(result.value.value.toString('utf8')));
//                 }
//                 result = await iterator.next();
//             }

//             await iterator.close();
//             return JSON.stringify(users);
//         } catch (error) {
//             console.error(`Error in getAllUsers: ${error.message}`);
//             throw new Error(`Error in getAllUsers: ${error.message}`);
//         }
//     }

//     async queryUsersByField(ctx, fieldName, value) {
//         try {
//             const query = {
//                 selector: {}
//             };
//             query.selector[fieldName] = value;

//             const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));

//             const users = [];
//             let result = await iterator.next();
//             while (!result.done) {
//                 users.push(JSON.parse(result.value.value.toString('utf8')));
//                 result = await iterator.next();
//             }

//             await iterator.close();

//             return JSON.stringify(users);
//         } catch (error) {
//             console.error(`Error in queryUsersByField: ${error.message}`);
//             throw new Error(`Error in queryUsersByField: ${error.message}`);
//         }
//     }

// }

// module.exports = Users;

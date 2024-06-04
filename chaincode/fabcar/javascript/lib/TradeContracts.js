/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');

class TradingPlatformContract extends Contract {

    async initLedger(ctx) {
        try {
           const sampleUsers = [
                {
                    userId: "123",
                    userName: "John Doe",
                    userEmail: "john@example.com",
                    userMobile: "1234567890",
                    userPassword: "hashedPassword",
                    userType: "Exporter",
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
                    createdAt: "2023-01-01T12:00:00Z",
                    createdBy: "admin",
                    lastModifiedAt: "2023-01-02T14:30:00Z"
                },
                // Add more sample users with different user types...
                {
                    userId: "1234",
                    userName: "John Doe",
                    userEmail: "john@example.com",
                    userMobile: "1234567890",
                    userPassword: "hashedPassword",
                    userType: "Importer",
                    additionalData: {
                        ImporterDetails: {
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
                    createdAt: "2023-01-01T12:00:00Z",
                    createdBy: "admin",
                    lastModifiedAt: "2023-01-02T14:30:00Z"
                },
            ];

            for (const user of sampleUsers) {
                await this.registerUser(
                    ctx,
                    user.userId,
                    user.userName,
                    user.userEmail,
                    user.userMobile,
                    user.userPassword,
                    user.userType,
                    user.additionalData
                );
            }

            return 'Ledger initialized with sample data';
        } catch (error) {
            console.error(`Error in initLedger: ${error.message}`);
            throw new Error(`Error in initLedger: ${error.message}`);
        }
    }

    async registerUser(ctx, userId, userName, userEmail, userMobile, userPassword, userType, additionalData) {
        try {
            const userExists = await this.isUserExists(ctx, userId);
            if (userExists) {
                throw new UserAlreadyExistsError();
            }

            const dynamicAdditionalData = {};
            Object.keys(additionalData).forEach(key => {
                dynamicAdditionalData[key] = additionalData[key];
            });

            const user = {
                userId,
                userName,
                userEmail,
                userMobile,
                userPassword,
                userType,
                additionalData: {
                    [`${userType}Details`]: dynamicAdditionalData
                },
                createdAt: new Date(),
                createdBy: ctx.clientIdentity.getID(),
                lastModifiedAt: new Date(),
            };
            const userBuffer = Buffer.from(JSON.stringify(user));
            await ctx.stub.putState(userId, userBuffer);
            return user;
        } catch (error) {
            console.error(`Error in registerUser: ${error.message}`);
            throw error instanceof UserAlreadyExistsError ? error : new Error(`Error in registerUser: ${error.message}`);
        }
    }

    async isUserExists(ctx, userId) {
        const userBuffer = await ctx.stub.getState(userId);
        return !!userBuffer && userBuffer.length > 0;
    }



    async getUserDetails(ctx, userId) {
        try {
            const userBuffer = await ctx.stub.getState(userId);
            if (!userBuffer || userBuffer.length === 0) {
                throw new UserNotFoundError(userId);
            }

            return JSON.parse(userBuffer.toString());
        } catch (error) {
            console.error(`Error in getUserDetails: ${error.message}`);
            throw error instanceof UserNotFoundError ? error : new Error(`Error in getUserDetails: ${error.message}`);
        }
    }

   async updateUserDetails(ctx, userId, updatedDetails) {
        try {
            const userExists = await this.isUserExists(ctx, userId);
            if (!userExists) {
                throw new Error(`User ${userId} does not exist`);
            }

            const existingUser = await this.getUserDetails(ctx, userId);
            const updatedUser = { ...existingUser, ...JSON.parse(updatedDetails), lastModifiedAt: new Date() };

            const userBuffer = Buffer.from(JSON.stringify(updatedUser));
            await ctx.stub.putState(userId, userBuffer);
            return updatedUser;
        } catch (error) {
            console.error(`Error in updateUserDetails: ${error.message}`);
            throw new Error(`Error in updateUserDetails: ${error.message}`);
        }
    }
    

    async deleteUser(ctx, userId) {
        try {
            const userExists = await this.isUserExists(ctx, userId);
            if (!userExists) {
                throw new Error(`User ${userId} does not exist`);
            }

            await ctx.stub.deleteState(userId);
            return `User ${userId} has been deleted`;
        } catch (error) {
            console.error(`Error in deleteUser: ${error.message}`);
            throw new Error(`Error in deleteUser: ${error.message}`);
        }
    }

  

    async getHistoryForUser(ctx, userId) {
        try {
            const iterator = await ctx.stub.getHistoryForKey(userId);
            const history = [];

            let result = await iterator.next();
            while (!result.done) {
                if (result.value) {
                    history.push(JSON.parse(result.value.value.toString('utf8')));
                }
                result = await iterator.next();
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

}

module.exports = TradingPlatformContract;

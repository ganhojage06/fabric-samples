'use strict';

const { Contract } = require('fabric-contract-api');
const crypto = require('crypto');

class TradingPlatformContract extends Contract {
    async registerUser(ctx, userId, userName, userEmail, userMobile, userPassword, userType) {
        const userExists = await this.isUserExists(ctx, userId);
        if (userExists) {
            throw new Error('User already exists');
        }

        // Hash and salt the password before storing
        const salt = crypto.randomBytes(16).toString('hex');
        const hashedPassword = crypto.pbkdf2Sync(userPassword, salt, 1000, 64, 'sha512').toString('hex');

        const user = {
            userId,
            userName,
            userEmail,
            userMobile,
            userPassword: hashedPassword,
            passwordSalt: salt,
            userType,
            createdAt: new Date(),
            createdBy: ctx.clientIdentity.getID(),
        };

        const userBuffer = Buffer.from(JSON.stringify(user));
        await ctx.stub.putState(userId, userBuffer);
        return user;
    }

    async isUserExists(ctx, userId) {
        const userBuffer = await ctx.stub.getState(userId);
        return !!userBuffer && userBuffer.length > 0;
    }

    async getUserDetails(ctx, userId) {
        const userBuffer = await ctx.stub.getState(userId);
        if (!userBuffer || userBuffer.length === 0) {
            throw new Error(`User ${userId} does not exist`);
        }

        return JSON.parse(userBuffer.toString());
    }

    async updateUserDetails(ctx, userId, updatedDetails) {
        const userExists = await this.isUserExists(ctx, userId);
        if (!userExists) {
            throw new Error(`User ${userId} does not exist`);
        }

        const existingUser = await this.getUserDetails(ctx, userId);
        const updatedUser = { ...existingUser, ...JSON.parse(updatedDetails), lastModifiedAt: new Date() };
        

         // Re-hash the password if updated
         if (updatedUser.userPassword) {
            const salt = crypto.randomBytes(16).toString('hex');
            const hashedPassword = crypto.pbkdf2Sync(updatedUser.userPassword, salt, 1000, 64, 'sha512').toString('hex');
            updatedUser.userPassword = hashedPassword;
            updatedUser.passwordSalt = salt;
        }



        const userBuffer = Buffer.from(JSON.stringify(updatedUser));
        await ctx.stub.putState(userId, userBuffer);
        return updatedUser;
    }

    async deleteUser(ctx, userId) {
        const userExists = await this.isUserExists(ctx, userId);
        if (!userExists) {
            throw new Error(`User ${userId} does not exist`);
        }

        await ctx.stub.deleteState(userId);
        return `User ${userId} has been deleted`;
    }

    async authenticateUser(ctx, userId, userPassword) {
        const user = await this.getUserDetails(ctx, userId);

        const hashedPassword = crypto.pbkdf2Sync(userPassword, user.passwordSalt, 1000, 64, 'sha512').toString('hex');
        if (hashedPassword === user.userPassword) {
            return `User ${userId} authenticated successfully`;
        } else {
            throw new Error('Invalid credentials');
        }
    }
}

module.exports = TradingPlatformContract;

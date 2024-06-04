/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');

class TraderContract extends Contract {

    async initLedger(ctx) {
        // Initialize with some sample data
        const traders = [
            { id: '1', name: 'Exporter1', userType: 'Exporter', phone: '1234567890', address: '123 Main St', exportNo: 'EXP001', billNo: 'BILL001', updates: [] },
            { id: '2', name: 'Importer1', userType: 'Importer', phone: '9876543210', address: '456 Oak St', importNo: 'IMP001', purchaseOrder: 'PO001', updates: [] }
        ];

        for (const trader of traders) {
            await ctx.stub.putState(trader.id, Buffer.from(JSON.stringify(trader)));
        }
    }

    async registerTrader(ctx, id, name, userType, data) {
        try {
            const trader = {
                id,
                name,
                userType,
                ...JSON.parse(data),
                updates: []
            };

            await ctx.stub.putState(id, Buffer.from(JSON.stringify(trader)));
            return JSON.stringify(trader);
        } catch (error) {
            console.error(`Error in registerTrader: ${error.message}`);
            throw new Error(`Error in registerTrader: ${error.message}`);
        }
    }

    async updateTrader(ctx, id, updatedData, updatedBy, updateDescription, metadata) {
        try {
            const traderBytes = await ctx.stub.getState(id);

            if (!traderBytes || traderBytes.length === 0) {
                throw new Error(`Trader with ID ${id} does not exist`);
            }

            const trader = JSON.parse(traderBytes.toString());
            const timestamp = new Date().toISOString();
            const update = {
                timestamp,
                updatedBy,
                updateDescription,
                metadata,
                data: JSON.parse(updatedData)
            };

            trader.updates.push(update);
            Object.assign(trader, update.data);

            await ctx.stub.putState(id, Buffer.from(JSON.stringify(trader)));
            return JSON.stringify(trader);
        } catch (error) {
            console.error(`Error in updateTrader: ${error.message}`);
            throw new Error(`Error in updateTrader: ${error.message}`);
        }
    }

    async readTrader(ctx, id) {
        try {
            const traderBytes = await ctx.stub.getState(id);

            if (!traderBytes || traderBytes.length === 0) {
                throw new Error(`Trader with ID ${id} does not exist`);
            }

            return traderBytes.toString();
        } catch (error) {
            console.error(`Error in readTrader: ${error.message}`);
            throw new Error(`Error in readTrader: ${error.message}`);
        }
    }

    async queryTradersByField(ctx, fieldName, value) {
        try {
            const query = {
                selector: {}
            };
            query.selector[fieldName] = value;

            const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));

            const traders = [];
            let result = await iterator.next();
            while (!result.done) {
                traders.push(JSON.parse(result.value.value.toString('utf8')));
                result = await iterator.next();
            }

            await iterator.close();

            return JSON.stringify(traders);
        } catch (error) {
            console.error(`Error in queryTradersByField: ${error.message}`);
            throw new Error(`Error in queryTradersByField: ${error.message}`);
        }
    }

    async getAllTraders(ctx) {
        try {
            const iterator = await ctx.stub.getStateByRange('', '');

            const traders = [];
            let result = await iterator.next();
            while (!result.done) {
                if (result.value) {
                    traders.push(JSON.parse(result.value.value.toString('utf8')));
                }
                result = await iterator.next();
            }

            await iterator.close();
            return JSON.stringify(traders);
        } catch (error) {
            console.error(`Error in getAllTraders: ${error.message}`);
            throw new Error(`Error in getAllTraders: ${error.message}`);
        }
    }

    async getTraderDetails(ctx, id) {
        try {
            const traderBytes = await ctx.stub.getState(id);

            if (!traderBytes || traderBytes.length === 0) {
                throw new Error(`Trader with ID ${id} does not exist`);
            }

            return traderBytes.toString();
        } catch (error) {
            console.error(`Error in getTraderDetails: ${error.message}`);
            throw new Error(`Error in getTraderDetails: ${error.message}`);
        }
    }

    async getHistoryForTrader(ctx, id) {
        try {
            const iterator = await ctx.stub.getHistoryForKey(id);
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
            console.error(`Error in getHistoryForTrader: ${error.message}`);
            throw new Error(`Error in getHistoryForTrader: ${error.message}`);
        }
    }
}

module.exports = TraderContract;

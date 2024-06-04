// Import required modules
const { Contract, Context } = require('fabric-contract-api');

// Define the class for the Smart Contract
class SmartContract extends Contract {
  // The InitLedger function to initialize the ledger with base assets
  async InitLedger(ctx) {
    const assets = [
        { ID: "asset1", Color: "blue", Size: 5, Owner: "Tomoko", AppraisedValue: 300 },
        { ID: "asset2", Color: "red", Size: 5, Owner: "Brad", AppraisedValue: 400 },
        { ID: "asset3", Color: "green", Size: 10, Owner: "Jin Soo", AppraisedValue: 500 },
        { ID: "asset4", Color: "yellow", Size: 10, Owner: "Max", AppraisedValue: 600 },
        { ID: "asset5", Color: "black", Size: 15, Owner: "Adriana", AppraisedValue: 700 },
        { ID: "asset6", Color: "white", Size: 15, Owner: "Michel", AppraisedValue: 800 },
      ];

    for (const asset of assets) {
      const assetJSON = JSON.stringify(asset);
      await ctx.stub.putState(asset.ID, Buffer.from(assetJSON));
    }
  }

  // CreateAsset function to add a new asset to the ledger
  async CreateAsset(ctx, id, color, size, owner, appraisedValue) {
    const exists = await this.AssetExists(ctx, id);
    if (exists) {
      throw new Error(`The asset ${id} already exists`);
    }

    const asset = {
      ID: id,
      Color: color,
      Size: size,
      Owner: owner,
      AppraisedValue: appraisedValue,
    };
    const assetJSON = JSON.stringify(asset);
    await ctx.stub.putState(id, Buffer.from(assetJSON));
  }

  // ReadAsset function to retrieve an asset from the ledger
  async ReadAsset(ctx, id) {
    const assetJSON = await ctx.stub.getState(id);
    if (!assetJSON || assetJSON.length === 0) {
      throw new Error(`The asset ${id} does not exist`);
    }
    return JSON.parse(assetJSON.toString());
  }

  // UpdateAsset function to update an existing asset in the ledger
  async UpdateAsset(ctx, id, color, size, owner, appraisedValue) {
    const exists = await this.AssetExists(ctx, id);
    if (!exists) {
      throw new Error(`The asset ${id} does not exist`);
    }

    const asset = {
      ID: id,
      Color: color,
      Size: size,
      Owner: owner,
      AppraisedValue: appraisedValue,
    };
    const assetJSON = JSON.stringify(asset);
    await ctx.stub.putState(id, Buffer.from(assetJSON));
  }

  // DeleteAsset function to delete an asset from the ledger
  async DeleteAsset(ctx, id) {
    const exists = await this.AssetExists(ctx, id);
    if (!exists) {
      throw new Error(`The asset ${id} does not exist`);
    }

    await ctx.stub.deleteState(id);
  }

  // AssetExists function to check if an asset with a given ID exists in the ledger
  async AssetExists(ctx, id) {
    const assetJSON = await ctx.stub.getState(id);
    return !!assetJSON && assetJSON.length > 0;
  }

  // TransferAsset function to update the owner of an asset in the ledger
  async TransferAsset(ctx, id, newOwner) {
    const asset = await this.ReadAsset(ctx, id);
    asset.Owner = newOwner;
    const assetJSON = JSON.stringify(asset);
    await ctx.stub.putState(id, Buffer.from(assetJSON));
  }

  // GetAllAssets function to retrieve all assets from the ledger
  async GetAllAssets(ctx) {
    const iterator = await ctx.stub.getStateByRange('', '');
    const assets = [];
    while (true) {
      const asset = await iterator.next();
      if (asset.value && asset.value.value.toString()) {
        assets.push(JSON.parse(asset.value.value.toString('utf8')));
      }
      if (asset.done) {
        await iterator.close();
        return assets;
      }
    }
  }
}

// Start the chaincode
const smartContract = new SmartContract();
smartContract.start(); // This is a hypothetical function representing starting the chaincode

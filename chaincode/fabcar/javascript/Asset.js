const { Contract } = require('fabric-contract-api');

class SmartContract extends Contract {
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

  async ReadAsset(ctx, id) {
    const assetJSON = await ctx.stub.getState(id);
    if (!assetJSON || assetJSON.length === 0) {
      throw new Error(`The asset ${id} does not exist`);
    }
    const asset = JSON.parse(assetJSON.toString());
    return asset;
  }

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

  async DeleteAsset(ctx, id) {
    const exists = await this.AssetExists(ctx, id);
    if (!exists) {
      throw new Error(`The asset ${id} does not exist`);
    }
    await ctx.stub.deleteState(id);
  }

  async AssetExists(ctx, id) {
    const assetJSON = await ctx.stub.getState(id);
    return assetJSON && assetJSON.length > 0;
  }

  async TransferAsset(ctx, id, newOwner) {
    const asset = await this.ReadAsset(ctx, id);
    asset.Owner = newOwner;
    const assetJSON = JSON.stringify(asset);
    await ctx.stub.putState(id, Buffer.from(assetJSON));
  }

  async GetAllAssets(ctx) {
    const resultsIterator = await ctx.stub.getStateByRange("", "");
    const assets = [];
    while (true) {
      const queryResponse = await resultsIterator.next();
      if (queryResponse.value && queryResponse.value.length > 0) {
        const asset = JSON.parse(queryResponse.value.toString());
        assets.push(asset);
      }
      if (queryResponse.done) {
        await resultsIterator.close();
        return assets;
      }
    }
  }
}

async function main() {
  const assetChaincode = new SmartContract();
  await assetChaincode.start();
}

main();



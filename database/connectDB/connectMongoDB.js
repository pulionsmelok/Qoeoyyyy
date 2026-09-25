const log = require("../../logger/log.js");

let _mongoose = null;

async function connectMongoDB() {
  const uri = (global.GoatBot.config.database && global.GoatBot.config.database.uriMongodb) || "";
  if (!uri) throw new Error("MongoDB URI is empty. Set database.uriMongodb in config.json.");

  if (!_mongoose) {
    try {
      _mongoose = require("mongoose");
    } catch (_) {
      throw new Error("mongoose is not installed. Run: npm install mongoose");
    }
  }

  if (_mongoose.connection.readyState === 1) {
    return _mongoose;
  }

  await _mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });

  log.success("DATABASE", "MongoDB connected successfully");
  return _mongoose;
}


/**
 * Return the native MongoDB collection used for Baileys authentication.
 * The collection name is intentionally internal so config.json stays unchanged.
 */
async function getBaileysAuthCollection() {
  const mongoose = await connectMongoDB();
  return mongoose.connection.db.collection("baileys_auth");
}

module.exports = { connectMongoDB, getBaileysAuthCollection };


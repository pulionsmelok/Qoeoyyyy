const usersData = require("./userData.js");
const threadsData = require("./threadsData.js");
const globalData = require("./globalData.js");

/**
 * Connect to MongoDB if configured, then warm the in-memory cache for all controllers.
 * Call this once at startup (before the bot begins processing messages).
 */
async function initDB() {
  const dbTypeSetting = (global.GoatBot && global.GoatBot.config && global.GoatBot.config.database && global.GoatBot.config.database.type) || "json";

  if (dbTypeSetting === "mongodb") {
    const { connectMongoDB } = require("../connectDB/connectMongoDB.js");
    await connectMongoDB();
  }

  await usersData.loadCache().catch(e => console.error("[DB] Failed to load usersData cache:", e));
  await threadsData.loadCache().catch(e => console.error("[DB] Failed to load threadsData cache:", e));
}

/**
 * Attach global DB helpers so any file can use:
 *   global.GoatBot.DB.usersData(uid)
 *   global.GoatBot.DB.threadsData(tid)
 *   global.GoatBot.DB.globalData.get(key)
 *   global.db.usersData.get(uid)     
 *   global.db.threadsData.get(tid)   
 *   global.db.allUserData            
 *   global.db.allThreadData          
 */
function attachGlobalDB() {
  if (!global.db) {
    global.db = {};
  }
  global.db.usersData = usersData;
  global.db.threadsData = threadsData;
  global.db.globalData = globalData;

  if (!global.GoatBot) {
    global.GoatBot = {};
  }
  global.GoatBot.DB = {
    usersData,
    userData: usersData,
    threadsData,
    globalData,
    users: usersData,
    threads: threadsData,
  };

  global.usersData = usersData;
  global.threadsData = threadsData;
}

module.exports = {
  initDB,
  attachGlobalDB,
  usersData,
  threadsData,
  globalData,
};

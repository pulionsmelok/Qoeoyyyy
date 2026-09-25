const log = require("../../logger/log.js");

async function loadData() {
    log.divider("DATABASE");
    const config = global.GoatBot.config;
    const databaseType = (config.database && config.database.type) || "json";

    try {
        const { initDB, attachGlobalDB } = require("../../database/controller/index.js");

        // Attach helpers first so modules can use global.GoatBot.DB even before cache is warm
        attachGlobalDB();

        if (databaseType === "mongodb") {
            log.info("DATABASE", "Connecting to MongoDB…");
            try {
                await initDB();
                log.success("DATABASE", "MongoDB connected and cache loaded");
            } catch (error) {
                log.warn("DATABASE", "MongoDB connection failed: " + error.message);
                log.warn("DATABASE", "Falling back to JSON database.");
                global.GoatBot.config.database.type = "json";
                await initDB(); // still load JSON caches
            }
        } else {
            log.info("DATABASE", "Using JSON file storage.");
            await initDB();
            log.success("DATABASE", "JSON database cache loaded");
        }

        // Ensure aliases are present (already set in attachGlobalDB, but be defensive)
        if (global.GoatBot.DB) {
            global.GoatBot.DB.threads = global.GoatBot.DB.threadsData;
            global.GoatBot.DB.users = global.GoatBot.DB.userData || global.GoatBot.DB.usersData;
            global.GoatBot.DB.usersData = global.GoatBot.DB.userData || global.GoatBot.DB.usersData;
        }

        log.success("DATABASE", "Database ready (threadsData / userData available)");
    } catch (error) {
        log.err("DATABASE", "Failed to initialize database: " + (error.message || error));
        if (error.stack) console.error(error.stack);
        // Last-resort minimal stubs so the bot does not crash on every command
        if (!global.GoatBot.DB) {
            const noop = async () => null;
            const stub = {
                get: noop,
                set: noop,
                create: noop,
                remove: noop,
                getAll: async () => [],
                existsSync: () => false,
                loadCache: async () => {},
                refreshInfo: noop,
                incrementMsgCount: noop,
                deleteKey: noop
            };
            // Make the stub callable like threadsData(tid)
            const callableStub = Object.assign(async () => null, stub);
            global.GoatBot.DB = {
                threadsData: callableStub,
                userData: callableStub,
                usersData: callableStub,
                threads: callableStub,
                users: callableStub,
                globalData: { get: noop, set: noop }
            };
            global.db = global.GoatBot.DB;
            global.threadsData = callableStub;
            global.usersData = callableStub;
            log.warn("DATABASE", "Installed fallback stubs — data will not persist");
        }
    }
}

module.exports = loadData;

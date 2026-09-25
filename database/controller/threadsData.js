const fs = require("fs");
const path = require("path");
const threadsDataPath = path.resolve(__dirname, "../../database/json/threadsData.json");

function getDatabaseType() {
    return (global.GoatBot && global.GoatBot.config && global.GoatBot.config.database && global.GoatBot.config.database.type) || "json";
}

function ensureDirectoryAndFile() {
    const dirPath = path.dirname(threadsDataPath);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, {
            recursive: true
        });
    }
    if (!fs.existsSync(threadsDataPath)) {
        fs.writeFileSync(threadsDataPath, "[]", "utf8");
    }
}

function readThreadsData() {
    ensureDirectoryAndFile();
    try {
        return JSON.parse(fs.readFileSync(threadsDataPath, "utf8"));
    }
    catch (error) {
        return [];
    }
}

function writeThreadsData(data) {
    ensureDirectoryAndFile();
    const tempPath = threadsDataPath + ".tmp";
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf8");
    fs.renameSync(tempPath, threadsDataPath);
}

let mongoModel = null;
function getMongoModel() {
    if (!mongoModel) {
        mongoModel = require("../models/mongodb/thread.js");
    }
    return mongoModel;
}

function getDefaultThreadData(threadID) {
    return {
        threadID: threadID,
        threadName: "Unknown Group",
        adminIDs: [],
        approvalMode: false,
        members: [],
        memberMsgCount: {},
        banned: {},
        settings: {
            sendWelcomeMessage: true,
            sendLeaveMessage: true,
            sendRankupMessage: false,
            customCommand: true
        },
        data: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

class TaskQueue {
    constructor() {
        this._queue = [];
        this._running = false;
    }
    push(fn) {
        return new Promise((resolve, reject) => {
            this._queue.push({
                fn, resolve, reject
            });
            this._run();
        });
    }
    async _run() {
        if (this._running) {
            return;
        }
        this._running = true;
        while (this._queue.length > 0) {
            const { fn, resolve, reject } = this._queue.shift();
            try {
                resolve(await fn());
            }
            catch (error) {
                reject(error);
            }
        }
        this._running = false;
    }
}

function getCache() {
    if (!global.db) {
        global.db = {};
    }
    if (!global.db.allThreadData) {
        global.db.allThreadData = [];
    }
    return global.db.allThreadData;
}

function cloneDeep(obj) {
    try {
        return JSON.parse(JSON.stringify(obj));
    }
    catch (error) {
        return obj;
    }
}

function getNestedProperty(obj, pathStr, defaultValue) {
    if (!pathStr) {
        return obj;
    }
    let current = obj;
    for (const key of pathStr.split(".")) {
        if (current == null || typeof current !== "object") {
            return defaultValue;
        }
        current = current[key];
    }
    return current === undefined ? defaultValue : current;
}

function setNestedProperty(obj, pathStr, value) {
    if (!pathStr) {
        return;
    }
    const keys = pathStr.split(".");
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (current[keys[i]] == null || typeof current[keys[i]] !== "object") {
            current[keys[i]] = {};
        }
        current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
}

function deleteNestedProperty(obj, pathStr) {
    if (!pathStr) {
        return;
    }
    const keys = pathStr.split(".");
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (current == null || typeof current !== "object") {
            return;
        }
        current = current[keys[i]];
    }
    if (current && typeof current === "object") {
        delete current[keys[keys.length - 1]];
    }
}

const taskQueue = new TaskQueue();

function findThreadIndex(threadID) {
    return getCache().findIndex(event => event.threadID == threadID);
}

function updateThreadObjectInfo(threadData, info) {
    if (!info) {
        return;
    }
    if (info.name || info.subject) {
        threadData.threadName = info.name || info.subject;
    }
    if (info.adminIDs) {
        threadData.adminIDs = info.adminIDs;
    }
    else {
        if (info.participants) {
            threadData.adminIDs = info.participants.filter(p => p.admin === "admin" || p.admin === "superadmin").map(p => p.id || p.userID || p);
        }
    }
    if (info.announcement !== undefined) {
        threadData.approvalMode = info.announcement;
    }
    if (info.participants) {
        const memberMap = {};
        for (const m of (threadData.members || []))
            memberMap[m.userID] = m;
        
        let contacts = null;
        try {
            contacts = global.GoatBot.api.sock.contacts;
        } catch (e) {}

        for (const p of info.participants) {
            const userID = p.userID || p.id || p;
            let name = p.name || "Unknown";
            if (name === "Unknown" && contacts) {
                let idStr = userID;
                if (typeof idStr === "string") {
                    idStr = idStr.split(":")[0].split("@")[0];
                }
                const contact = contacts[idStr + "@s.whatsapp.net"] || contacts[idStr + "@lid"];
                if (contact && (contact.name || contact.notify || contact.verifiedName)) {
                    name = contact.name || contact.notify || contact.verifiedName;
                }
            }
            if (!memberMap[userID]) {
                memberMap[userID] = {
                    userID: userID,
                    name: name,
                    inGroup: true,
                    count: 0
                };
            }
            else {
                memberMap[userID].inGroup = true;
                if (name !== "Unknown") {
                    memberMap[userID].name = name;
                }
            }
        }
        threadData.members = Object.values(memberMap);
    }
}

async function getOrInitThreadJson(threadID, info) {
    const cache = getCache();
    if (cache.some(event => event.threadID == threadID)) {
        return cloneDeep(cache.find(event => event.threadID == threadID));
    }
    const newThread = getDefaultThreadData(String(threadID));
    updateThreadObjectInfo(newThread, info);
    cache.push(newThread);
    writeThreadsData(cache);
    return cloneDeep(newThread);
}

async function getThreadDataJson(threadID, pathStr, defaultValue) {
    const cache = getCache();
    let index = findThreadIndex(threadID);
    let thread;
    if (index === -1) {
        thread = await getOrInitThreadJson(threadID);
    }
    else {
        thread = cache[index];
    }
    if (pathStr) {
        return cloneDeep(getNestedProperty(thread, pathStr, defaultValue));
    }
    return cloneDeep(thread);
}

async function updateThreadDataJson(threadID, value, action, pathStr) {
    const cache = getCache();
    let index = findThreadIndex(threadID);
    if (index === -1) {
        await getOrInitThreadJson(threadID);
        index = findThreadIndex(threadID);
    }
    if (action === "update") {
        const thread = cache[index];
        if (pathStr) {
            setNestedProperty(thread, pathStr, value);
        }
        else {
            Object.assign(thread, value);
        }
        thread.updatedAt = new Date().toISOString();
        cache[index] = thread;
        writeThreadsData(cache);
        return cloneDeep(cache[index]);
    }
    if (action === "remove") {
        cache.splice(index, 1);
        writeThreadsData(cache);
        return true;
    }
    return null;
}

async function loadMongoThreads() {
    const model = getMongoModel();
    if (!model) return;
    const mongoData = await model.find({}).lean();
    const cache = getCache();
    for (const thread of mongoData) {
        if (!cache.some(event => event.threadID == thread.threadID)) {
            cache.push(thread);
        }
    }
}

async function getOrInitThreadMongo(threadID, info) {
    const model = getMongoModel();
    if (!model) {
        return getOrInitThreadJson(threadID, info);
    }
    const cache = getCache();
    let thread = await model.findOne({ threadID }).lean();
    if (thread) {
        if (!cache.some(event => event.threadID == threadID)) {
            cache.push(thread);
        }
        return cloneDeep(thread);
    }
    const newThread = getDefaultThreadData(String(threadID));
    updateThreadObjectInfo(newThread, info);
    const created = await model.create(newThread);
    const plainObj = created.toObject ? created.toObject() : created;
    cache.push(plainObj);
    return cloneDeep(plainObj);
}

async function getThreadDataMongo(threadID, pathStr, defaultValue) {
    const model = getMongoModel();
    if (!model) {
        return getThreadDataJson(threadID, pathStr, defaultValue);
    }
    let index = findThreadIndex(threadID);
    let thread;
    if (index === -1) {
        thread = await getOrInitThreadMongo(threadID);
    }
    else {
        thread = getCache()[index];
    }
    if (pathStr) {
        return cloneDeep(getNestedProperty(thread, pathStr, defaultValue));
    }
    return cloneDeep(thread);
}

async function updateThreadDataMongo(threadID, value, action, pathStr) {
    const model = getMongoModel();
    if (!model) {
        return updateThreadDataJson(threadID, value, action, pathStr);
    }
    const cache = getCache();
    if (action === "update") {
        let index = findThreadIndex(threadID);
        if (index === -1) {
            await getOrInitThreadMongo(threadID);
            index = findThreadIndex(threadID);
        }
        const thread = cache[index];
        const updateDoc = {};
        if (pathStr) {
            setNestedProperty(thread, pathStr, value);
            const rootKey = pathStr.split(".")[0];
            updateDoc[rootKey] = thread[rootKey];
        }
        else {
            Object.assign(thread, value);
            Object.assign(updateDoc, value);
        }
        updateDoc.updatedAt = new Date();
        const updated = await model.findOneAndUpdate(
            { threadID },
            { $set: updateDoc },
            { new: true, upsert: true, lean: true }
        );
        cache[index] = {
            ...thread,
            ...updated
        };
        return cloneDeep(cache[index]);
    }
    if (action === "remove") {
        await model.deleteOne({ threadID });
        const index = findThreadIndex(threadID);
        if (index !== -1) {
            cache.splice(index, 1);
        }
        return true;
    }
    return null;
}

function isMongo() {
    return getDatabaseType() === "mongodb";
}

async function getOrInitThread(threadID, info) {
    return isMongo() ? getOrInitThreadMongo(threadID, info) : getOrInitThreadJson(threadID, info);
}

async function getThreadData(threadID, pathStr, defaultValue) {
    return isMongo() ? getThreadDataMongo(threadID, pathStr, defaultValue) : getThreadDataJson(threadID, pathStr, defaultValue);
}

async function updateThreadData(threadID, value, action, pathStr) {
    return isMongo() ? updateThreadDataMongo(threadID, value, action, pathStr) : updateThreadDataJson(threadID, value, action, pathStr);
}

function existsSync(threadID) {
    return getCache().some(event => event.threadID == threadID);
}

function createThread(threadID, info) {
    return taskQueue.push(() => getOrInitThread(threadID, info));
}

function refreshInfo(threadID, info) {
    return taskQueue.push(async () => {
        const thread = await getThreadData(threadID);
        updateThreadObjectInfo(thread, info);
        return updateThreadData(threadID, thread, "update");
    });
}

function getThread(threadID, pathStr, defaultValue) {
    return taskQueue.push(() => getThreadData(threadID, pathStr, defaultValue));
}

function getAllThreads(pathStr, defaultValue) {
    return taskQueue.push(async () => {
        if (isMongo()) {
            await loadMongoThreads().catch(() => {});
        }
        const cache = cloneDeep(getCache());
        if (pathStr) {
            return cache.map(item => getNestedProperty(item, pathStr, defaultValue));
        }
        return cache;
    });
}

function setThreadData(threadID, value, pathStr) {
    return taskQueue.push(() => updateThreadData(threadID, value, "update", pathStr || null));
}

function deleteThreadKey(threadID, pathStr) {
    return taskQueue.push(async () => {
        const thread = await getThreadData(threadID);
        deleteNestedProperty(thread, pathStr);
        const rootKey = pathStr.split(".")[0];
        return updateThreadData(threadID, thread[rootKey], "update", rootKey);
    });
}

function removeThread(threadID) {
    return taskQueue.push(() => updateThreadData(threadID, null, "remove"));
}

function incrementMsgCount(threadID, userID) {
    return taskQueue.push(async () => {
        const thread = await getThreadData(threadID);
        let member = (thread.members || []).find(m => m.userID == userID);
        let displayName = "Unknown";
        try {
            if (global.utils && global.utils.resolveUserDisplayName && global.GoatBot && global.GoatBot.api) {
                const resolved = await global.utils.resolveUserDisplayName(global.GoatBot.api, userID, global.GoatBot.DB.userData);
                if (resolved && resolved !== "Unknown" && !resolved.match(/^\d+$/)) {
                    displayName = resolved;
                }
            }
        } catch (e) {}

        if (member) {
            member.count = (member.count || 0) + 1;
            if (displayName !== "Unknown" && (member.name === "Unknown" || !member.name || member.name.match(/^\d+$/))) {
                member.name = displayName;
            }
        }
        else {
            thread.members = thread.members || [];
            thread.members.push({
                userID: userID,
                name: displayName,
                inGroup: true,
                count: 1
            });
        }
        thread.memberMsgCount = thread.memberMsgCount || {};
        thread.memberMsgCount[userID] = (thread.memberMsgCount[userID] || 0) + 1;
        
        return updateThreadData(threadID, {
            members: thread.members,
            memberMsgCount: thread.memberMsgCount
        }, "update");
    });
}

async function loadCache() {
    if (isMongo()) {
        await loadMongoThreads();
    }
    else {
        const fileData = readThreadsData();
        global.db = global.db || {};
        global.db.allThreadData = fileData;
    }
}

async function threadsData(threadID) {
    return getThread(threadID);
}

threadsData.existsSync = existsSync;
threadsData.create = createThread;
threadsData.refreshInfo = refreshInfo;
threadsData.getAll = getAllThreads;
threadsData.get = getThread;
threadsData.set = setThreadData;
threadsData.deleteKey = deleteThreadKey;
threadsData.remove = removeThread;
threadsData.incrementMsgCount = incrementMsgCount;
threadsData.loadCache = loadCache;

module.exports = threadsData;

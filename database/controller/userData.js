const fs = require("fs");
const path = require("path");
const USERS_JSON_PATH = path.resolve(__dirname, "../../database/json/usersData.json");

function getDbType() {
    return (global.GoatBot && global.GoatBot.config && global.GoatBot.config.database && global.GoatBot.config.database.type) || "json";
}

function ensureJsonFile() {
    const dir = path.dirname(USERS_JSON_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {
            recursive: true
        });
    }
    if (!fs.existsSync(USERS_JSON_PATH)) {
        fs.writeFileSync(USERS_JSON_PATH, "[]", "utf8");
    }
}

function readJsonUsers() {
    ensureJsonFile();
    try {
        const raw = fs.readFileSync(USERS_JSON_PATH, "utf8").trim();
        const data = JSON.parse(raw || "[]");
        if (!Array.isArray(data)) {
            fs.writeFileSync(USERS_JSON_PATH, "[]", "utf8");
            return [];
        }
        return data;
    }
    catch (e) {
        return [];
    }
}

function writeJsonUsers(data) {
    ensureJsonFile();
    const tmpPath = USERS_JSON_PATH + ".tmp";
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf8");
    fs.renameSync(tmpPath, USERS_JSON_PATH);
}

let _userModel = null;
function getUserModel() {
    if (!_userModel) {
        _userModel = require("../models/mongodb/user.js");
    }
    return _userModel;
}

function normalizeUID(uid) {
    if (!uid) {
        return "";
    }
    if (Array.isArray(uid)) {
        uid = uid[0];
    }
    return String(uid).split(":")[0].split("@")[0];
}

function createDefaultUser(uid) {
    return {
        userID: uid,
        name: "Unknown",
        exp: 0,
        money: 0,
        isBan: false,
        banReason: "",
        warnCount: 0,
        warnReason: [],
        banned: {},
        settings: {},
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
            catch (err) {
                reject(err);
            }
        }
        this._running = false;
    }
}

function getAllUsersCache() {
    if (!global.db) {
        global.db = {};
    }
    if (!global.db.allUserData) {
        global.db.allUserData = [];
    }
    return global.db.allUserData;
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
    const parts = pathStr.split(".");
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (current[parts[i]] == null || typeof current[parts[i]] !== "object") {
            current[parts[i]] = {};
        }
        current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
}

function deleteNestedProperty(obj, pathStr) {
    if (!pathStr) {
        return;
    }
    const parts = pathStr.split(".");
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (current == null || typeof current !== "object") {
            return;
        }
        current = current[parts[i]];
    }
    if (current && typeof current === "object") {
        delete current[parts[parts.length - 1]];
    }
}

const taskQueue = new TaskQueue();

function findUserIndex(uid) {
    uid = normalizeUID(uid);
    return getAllUsersCache().findIndex(user => normalizeUID(user.userID) === uid);
}

async function getUserJson(uid, createIfMissing) {
    uid = normalizeUID(uid);
    const users = getAllUsersCache();
    const existing = users.find(user => normalizeUID(user.userID) === uid);
    if (existing) {
        return cloneDeep(existing);
    }
    const defaultUser = createDefaultUser(String(uid));
    if (createIfMissing) {
        defaultUser.name = createIfMissing.name || createIfMissing.pushName || createIfMissing.notify || defaultUser.name;
    }
    users.push(defaultUser);
    writeJsonUsers(users);
    return cloneDeep(defaultUser);
}

async function getOrInitUserJson(uid, data, createIfMissing) {
    uid = normalizeUID(uid);
    const users = getAllUsersCache();
    let idx = findUserIndex(uid);
    let user;
    if (idx === -1) {
        user = await getUserJson(uid);
    }
    else {
        user = users[idx];
    }
    if (data) {
        return cloneDeep(getNestedProperty(user, data, createIfMissing));
    }
    return cloneDeep(user);
}

async function updateUserJson(uid, key, value, pathStr) {
    uid = normalizeUID(uid);
    const users = getAllUsersCache();
    let idx = findUserIndex(uid);
    if (idx === -1) {
        await getUserJson(uid);
        idx = findUserIndex(uid);
    }
    if (value === "update") {
        const user = users[idx];
        if (pathStr) {
            setNestedProperty(user, pathStr, key);
        }
        else {
            Object.assign(user, key);
        }
        user.updatedAt = new Date().toISOString();
        users[idx] = user;
        writeJsonUsers(users);
        return cloneDeep(users[idx]);
    }
    if (value === "remove") {
        users.splice(idx, 1);
        writeJsonUsers(users);
        return true;
    }
    return null;
}

async function loadCacheFromMongo() {
    const UserModel = getUserModel();
    if (!UserModel) {
        return;
    }
    const docs = await UserModel.find({}).lean();
    const users = getAllUsersCache();
    for (const doc of docs) {
        const uid = normalizeUID(doc.userID);
        if (!users.some(u => normalizeUID(u.userID) === uid)) {
            users.push(doc);
        }
    }
}

async function getOrInitUserMongo(uid, data) {
    uid = normalizeUID(uid);
    const UserModel = getUserModel();
    if (!UserModel) {
        return getUserJson(uid, data);
    }
    const users = getAllUsersCache();
    let existing = await UserModel.findOne({
        userID: uid
    }).lean();
    if (existing) {
        if (!users.some(u => normalizeUID(u.userID) === uid)) {
            users.push(existing);
        }
        return cloneDeep(existing);
    }
    const defaultUser = createDefaultUser(String(uid));
    if (data) {
        defaultUser.name = data.name || data.pushName || data.notify || defaultUser.name;
    }
    const created = await UserModel.create(defaultUser);
    const plainObj = created.toObject ? created.toObject() : created;
    users.push(plainObj);
    return cloneDeep(plainObj);
}

async function getUserDataMongo(uid, data, createIfMissing) {
    uid = normalizeUID(uid);
    const UserModel = getUserModel();
    if (!UserModel) {
        return getOrInitUserJson(uid, data, createIfMissing);
    }
    let idx = findUserIndex(uid);
    let user;
    if (idx === -1) {
        user = await getOrInitUserMongo(uid);
    }
    else {
        user = getAllUsersCache()[idx];
    }
    if (data) {
        return cloneDeep(getNestedProperty(user, data, createIfMissing));
    }
    return cloneDeep(user);
}

async function updateUserDataMongo(uid, key, value, pathStr) {
    uid = normalizeUID(uid);
    const UserModel = getUserModel();
    if (!UserModel) {
        return updateUserJson(uid, key, value, pathStr);
    }
    const users = getAllUsersCache();
    if (value === "update") {
        let idx = findUserIndex(uid);
        if (idx === -1) {
            await getOrInitUserMongo(uid);
            idx = findUserIndex(uid);
        }
        const user = users[idx];
        const updateDoc = {};
        if (pathStr) {
            setNestedProperty(user, pathStr, key);
            const rootKey = pathStr.split(".")[0];
            updateDoc[rootKey] = user[rootKey];
        }
        else {
            Object.assign(user, key);
            Object.assign(updateDoc, key);
        }
        updateDoc.updatedAt = new Date();
        const updated = await UserModel.findOneAndUpdate(
            { userID: uid },
            { $set: updateDoc },
            { new: true, upsert: true, lean: true }
        );
        users[idx] = {
            ...user,
            ...updated
        };
        return cloneDeep(users[idx]);
    }
    if (value === "remove") {
        await UserModel.deleteOne({
            userID: uid
        });
        const idx = findUserIndex(uid);
        if (idx !== -1) {
            users.splice(idx, 1);
        }
        return true;
    }
    return null;
}

function isMongo() {
    return getDbType() === "mongodb";
}

async function getOrInitUser(uid, data) {
    return isMongo() ? getOrInitUserMongo(uid, data) : getUserJson(uid, data);
}

async function getUserData(uid, data, createIfMissing) {
    return isMongo() ? getUserDataMongo(uid, data, createIfMissing) : getOrInitUserJson(uid, data, createIfMissing);
}

async function updateUserData(uid, key, value, pathStr) {
    return isMongo() ? updateUserDataMongo(uid, key, value, pathStr) : updateUserJson(uid, key, value, pathStr);
}

function existsSync(uid) {
    uid = normalizeUID(uid);
    return getAllUsersCache().some(user => normalizeUID(user.userID) === uid);
}

function getName(uid) {
    uid = normalizeUID(uid);
    const user = getAllUsersCache().find(u => normalizeUID(u.userID) === uid);
    return user ? user.name : null;
}

async function getAvatarUrl(api, jid) {
    try {
        const url = await api.getProfilePicture(jid, "image");
        return url || "https://i.ibb.co.com/rKcj3y80/150fa8800b0a0d5633abc1d1c4db3d87.jpg";
    }
    catch (err) {
        return "https://i.ibb.co.com/rKcj3y80/150fa8800b0a0d5633abc1d1c4db3d87.jpg";
    }
}

function createUserQueue(uid, data) {
    return taskQueue.push(() => getOrInitUser(uid, data));
}

function refreshInfo(uid, info) {
    return taskQueue.push(async () => {
        const user = await getUserData(uid);
        if (info) {
            const name = info.name || info.pushName || info.notify || user.name;
            return updateUserData(uid, { name }, "update");
        }
        return user;
    });
}

function getUserQueue(uid, data, createIfMissing) {
    return taskQueue.push(() => getUserData(uid, data, createIfMissing));
}

function getAllUsers(pathStr, defaultValue) {
    return taskQueue.push(async () => {
        if (isMongo()) {
            await loadCacheFromMongo().catch(() => {});
        }
        const cache = cloneDeep(getAllUsersCache());
        if (pathStr) {
            return cache.map(item => getNestedProperty(item, pathStr, defaultValue));
        }
        return cache;
    });
}

function setUserData(uid, value, pathStr) {
    return taskQueue.push(() => updateUserData(uid, value, "update", pathStr || null));
}

function deleteUserKey(uid, pathStr) {
    return taskQueue.push(async () => {
        const user = await getUserData(uid);
        deleteNestedProperty(user, pathStr);
        const rootKey = pathStr.split(".")[0];
        return updateUserData(uid, user[rootKey], "update", rootKey);
    });
}

function getMoney(uid) {
    return taskQueue.push(() => getUserData(uid, "money", 0));
}

function addMoney(uid, amount) {
    return taskQueue.push(async () => {
        const money = await getUserData(uid, "money", 0);
        return updateUserData(uid, money + amount, "update", "money");
    });
}

function subtractMoney(uid, amount) {
    return taskQueue.push(async () => {
        const money = await getUserData(uid, "money", 0);
        return updateUserData(uid, money - amount, "update", "money");
    });
}

function removeUser(uid) {
    return taskQueue.push(() => updateUserData(uid, null, "remove"));
}

async function loadCache() {
    if (isMongo()) {
        await loadCacheFromMongo();
    }
    else {
        const fileData = readJsonUsers();
        global.db = global.db || {};
        global.db.allUserData = fileData;
    }
}

async function userData(uid) {
    return getUserQueue(uid);
}

userData.existsSync = existsSync;
userData.getName = getName;
userData.getAvatarUrl = getAvatarUrl;
userData.create = createUserQueue;
userData.refreshInfo = refreshInfo;
userData.getAll = getAllUsers;
userData.get = getUserQueue;
userData.set = setUserData;
userData.deleteKey = deleteUserKey;
userData.getMoney = getMoney;
userData.addMoney = addMoney;
userData.subtractMoney = subtractMoney;
userData.remove = removeUser;
userData.loadCache = loadCache;

module.exports = userData;

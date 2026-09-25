const fs = require("fs");
const path = require("path");
const { normUID } = require("../login/baileys.js");

// Admin IDs are stored as plain numeric UIDs in config.json, while incoming
// WhatsApp messages can use either @lid or @s.whatsapp.net JIDs.  Always
// compare their canonical numeric UID and also read the current config file
// as a fallback in case global.GoatBot.config is stale during a hot reload.
function canonicalUID(value) {
    if (value && typeof value === "object") {
        value = value.userID || value.id || value.jid || value.uid || "";
    }
    return String(normUID(value) || "").trim();
}

function getConfiguredAdminUIDs(adminList) {
    const result = new Set();

    for (const admin of Array.isArray(adminList) ? adminList : []) {
        const uid = canonicalUID(admin);
        if (uid) result.add(uid);
    }

    // Do not rely only on the in-memory config object. This prevents an old
    // config object from making a valid admin UID fail the role check.
    try {
        const configPath = path.resolve(process.cwd(), "config.json");
        const diskConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
        for (const admin of Array.isArray(diskConfig.adminBot) ? diskConfig.adminBot : []) {
            const uid = canonicalUID(admin);
            if (uid) result.add(uid);
        }
    } catch (_) {}

    return result;
}

function isAdminUID(uid, adminList) {
    const normalized = canonicalUID(uid);
    if (!normalized) return false;
    return getConfiguredAdminUIDs(adminList).has(normalized);
}

/**
 * Permission levels:
 *   0 = normal user
 *   1 = WhatsApp group admin (group chats only)
 *   2 = bot admin (works in groups and inbox)
 */
function isGroupAdminUID(uid, adminList) {
    const normalized = normUID(uid);
    return (adminList || []).some(admin => {
        const id = typeof admin === "object"
            ? (admin.userID || admin.id || admin.jid)
            : admin;
        return normUID(id) === normalized;
    });
}

async function getUserRole(event) {
    const config = global.GoatBot.config || {};
    const senderID = event && event.senderID;
    const adminList = config.adminBot || [];

    // Bot admins always have the highest role, including inbox/DM.
    if (isAdminUID(senderID, adminList)) return 2;

    // Group-admin permissions only exist inside a group.
    if (!event || !event.isGroup || !event.threadID) return 0;

    try {
        const db = global.GoatBot.DB || {};
        const threadsData = db.threadsData || db.threads;
        if (!threadsData) return 0;

        const threadData = await threadsData.get(event.threadID);
        const groupAdmins = (threadData && threadData.adminIDs) || [];

        if (isGroupAdminUID(senderID, groupAdmins)) return 1;
    } catch (_) {}

    return 0;
}

async function handlerAction(api, event) {
    const config = global.GoatBot.config;
    const featureBox = config.featureBox || {};
    const senderID = event.senderID;
    const threadID = event.threadID;
    const adminList = config.adminBot || [];
    const isAdmin = isAdminUID(senderID, adminList);

    if (event.type === "message_reaction") {
        if (featureBox.unsendBotReact && !event.removed) {
            const unsendEmoji = String(featureBox.unsendBotReactEmoji || "❌").trim();

            // In groups Baileys normally provides reaction.key.participant.
            // In private chats participant can be missing, so fall back to
            // reaction.key.remoteJid (the person who reacted).
            const reactionSender =
                event.senderID ||
                event.author ||
                event.reactorKey?.participant ||
                event.reactorKey?.remoteJid ||
                "";
            const reactionIsFromAdmin = isAdminUID(reactionSender, adminList);

            if (
                String(event.emoji || "").trim() === unsendEmoji &&
                reactionIsFromAdmin &&
                event.reactionKey?.id &&
                // Only delete messages that were sent by this bot.
                // This prevents a 👍 reaction on someone else's message
                // from being treated as an unsend request.
                event.reactionKey?.fromMe === true
            ) {
                try {
                    // reactionKey is the key of the message that received the
                    // reaction. Pass the complete key so Baileys can delete
                    // the original bot message correctly.
                    await api.deleteMessage(threadID, {
                        remoteJid: event.reactionKey.remoteJid || threadID,
                        id: event.reactionKey.id,
                        fromMe: true,
                        participant: event.reactionKey.participant
                    });
                    try {
                        global.log.info("UNSEND", `Deleted bot message by ${unsendEmoji} reaction: ${event.reactionKey.id}`);
                    } catch (_) {}
                } catch (err) {
                    try {
                        global.log.warn("UNSEND", "React delete failed: " + (err?.message || err));
                    } catch (_) {}
                }
                return false;
            }
        }
    }

    if (featureBox.antiInbox && !event.isGroup) {
        return false;
    }

    if (!isAdmin) {
        const whitelistMode = featureBox.whitelistMode === true;
        const whitelistThreadMode = featureBox.whitelistThreadMode === true;
        const isUserWhitelisted = (featureBox.whitelistUIDs || [])
            .map(normUID)
            .includes(normUID(senderID));

        const cleanThreadId = (id) => String(id || "").replace("@g.us", "");
        const isThreadWhitelisted = (featureBox.whitelistThreadIDs || []).some(
            (tid) => cleanThreadId(tid) === cleanThreadId(threadID)
        );

        if (whitelistMode && whitelistThreadMode) {
            if (!isUserWhitelisted && !isThreadWhitelisted) return false;
        } else if (whitelistMode && !isUserWhitelisted) {
            return false;
        } else if (whitelistThreadMode && !isThreadWhitelisted) {
            return false;
        }
    }

    if (featureBox.adminOnly && !isAdmin) {
        return false;
    }

    try {
        if (event.isGroup && global.GoatBot.DB && global.GoatBot.DB.threadsData) {
            const threadData = await global.GoatBot.DB.threadsData.get(threadID);

            if (threadData && threadData.banned) {
                if (threadData.banned.status === true) {
                    if (event.type === "message" && event.body) {
                        const body = event.body.trim();
                        const prefix = typeof global.getThreadPrefix === "function"
                            ? await global.getThreadPrefix(threadID)
                            : global.GoatBot.config.prefix;

                        if (body.startsWith(prefix)) {
                            const message = global.buildMessage(api, event);
                            const reason = threadData.banned.reason
                                ? `\n\n📋 *Reason:* ${threadData.banned.reason}`
                                : "";
                            message.reply(`⛔ *This group is banned from using the bot.*${reason}`).catch(() => {});
                        }
                    }
                    return false;
                }

                if (threadData.banned[senderID]) {
                    const banInfo = threadData.banned[senderID];
                    if (event.type === "message" && event.body) {
                        const body = event.body.trim();
                        const prefix = typeof global.getThreadPrefix === "function"
                            ? await global.getThreadPrefix(threadID)
                            : global.GoatBot.config.prefix;

                        if (body.startsWith(prefix)) {
                            const message = global.buildMessage(api, event);
                            const reason = banInfo.reason
                                ? `\n\n📋 *Reason:* ${banInfo.reason}`
                                : "";
                            message.reply(`⛔ *You are thread-banned from using the bot in this group.*${reason}`).catch(() => {});
                        }
                    }
                    return false;
                }
            }
        }
    } catch (e) {}

    try {
        if (global.GoatBot.DB && global.GoatBot.DB.userData) {
            const userData = await global.GoatBot.DB.userData.get(senderID);
            if (userData && userData.isBan) {
                if (event.type === "message" && event.body) {
                    const body = event.body.trim();
                    const prefix = typeof global.getThreadPrefix === "function"
                        ? await global.getThreadPrefix(threadID)
                        : global.GoatBot.config.prefix;

                    if (body.startsWith(prefix)) {
                        const message = global.buildMessage(api, event);
                        const reason = userData.banReason
                            ? `\n\n📋 *Reason:* ${userData.banReason}`
                            : "";
                        message.reply(`⛔ *You are banned from using the bot.*${reason}`).catch(() => {});
                    }
                }
                return false;
            }
        }
    } catch (e) {}

    return true;
}

module.exports = handlerAction;
module.exports.isAdminUID = isAdminUID;
module.exports.getUserRole = getUserRole;
module.exports.isGroupAdminUID = isGroupAdminUID;

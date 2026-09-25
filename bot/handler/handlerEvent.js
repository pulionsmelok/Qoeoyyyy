const handlerAction = require("./handlerAction.js");
const { getUserRole } = require("./handlerAction.js");
const handletCheckData = require("./handletCheckData.js");
const { normUID } = require("../login/baileys.js");

const firstChatSeen = new Set();

function getDB() {
    const db = global.GoatBot.DB || {};
    return {
        threadsData: db.threadsData || db.threads,
        usersData: db.userData || db.users || db.usersData,
        userData: db.userData || db.users || db.usersData
    };
}

function getLangFactory(command) {
    const language = String(global.GoatBot.config?.language || "en").toLowerCase();
    const langs = command?.langs || {};
    const table = langs[language] || langs[language.split("-")[0]] || langs.en || langs[Object.keys(langs)[0]] || {};

    return (key, ...args) => {
        let value = table?.[key];
        if (value === undefined) value = key;
        if (typeof value !== "string") return value;
        return value
            .replace(/%([1-9]\d*)/g, (m, n) => args[Number(n) - 1] === undefined ? m : String(args[Number(n) - 1]))
            .replace(/\{pn\}/gi, String(global.GoatBot.config?.prefix || "!"));
    };
}

function commandLookup(name) {
    if (!name) return null;
    const key = String(name).toLowerCase();
    const direct = global.GoatBot.cmds.get(key);
    if (direct) return direct;
    for (const [, cmd] of global.GoatBot.cmds) {
        const aliases = Array.isArray(cmd?.config?.aliases) ? cmd.config.aliases : [];
        if (aliases.some(a => String(a).toLowerCase() === key)) return cmd;
    }
    return null;
}

function commandNameOf(cmd) {
    return String(cmd?.config?.name || "").toLowerCase();
}

function makeContext(api, event, cmd, extra = {}) {
    const db = getDB();
    const commandName = commandNameOf(cmd);
    const prefix = extra.prefix || global.GoatBot.config?.prefix || "!";
    return {
        api,
        bot: api,
        event,
        msg: event,
        message: extra.message || global.buildMessage(api, event),
        args: extra.args || [],
        messageID: event.messageID,
        senderID: event.senderID,
        prefix,
        commandName,
        role: extra.role ?? 0,
        threadsData: db.threadsData,
        userData: db.userData,
        usersData: db.usersData,
        threadID: event.threadID,
        chatId: event.threadID,
        userId: event.senderID,
        userID: event.senderID,
        // Goat-Bot-style per-command envConfig. Keep global command settings
        // available, but always expose this command's envConfig under its
        // command name so commands such as daily/rank do not read undefined.
        envCommands: (() => {
            const globalEnv = (global.GoatBot.configCommands && typeof global.GoatBot.configCommands === "object")
                ? global.GoatBot.configCommands
                : {};
            const commandEnv = (cmd?.config?.envConfig && typeof cmd.config.envConfig === "object")
                ? cmd.config.envConfig
                : {};
            return { ...globalEnv, [commandName]: { ...(globalEnv[commandName] || {}), ...commandEnv } };
        })(),
        getLang: getLangFactory(cmd),
        ...extra
    };
}

async function logIncomingMessage(event) {
    try {
        const colors = global.utils.colors;
        const uid = normUID(event.senderID);
        const displayName = await global.getDisplayName(event.senderID);
        const senderLabel = displayName !== uid
            ? colors.hex("#a29bfe")(displayName) + " " + colors.gray("(" + uid + ")")
            : colors.hex("#a29bfe")(uid);
        if (global.GoatBot.config.listen?.listenRawMsg) {
            const threadShort = String(event.threadID || "").split("@")[0];
            const threadLabel = event.isGroup ? colors.hex("#74b9ff")(threadShort) : colors.hex("#fd79a8")("DM");
            const bodyPreview = (event.body || "").trim().slice(0, 100);
            global.log.info("MSG", senderLabel + " [" + threadLabel + "]" + (bodyPreview ? ": " + colors.hex("#e6e9f0")(bodyPreview) : colors.gray(" (media)")));
        } else {
            global.log.info("RCV", senderLabel + " → " + (event.isGroup ? colors.gray("GC") : colors.hex("#fd79a8")("DM")));
        }
    } catch (_) {}
}

async function runEventCommands(api, event, allowed = true) {
    const db = getDB();
    for (const [, eventModule] of global.GoatBot.events) {
        if (!allowed && eventModule.config?.allowUnwhitelisted !== true) continue;
        try {
            const context = makeContext(api, event, eventModule);
            if (typeof eventModule.onStart === "function") await eventModule.onStart(context);
            if (typeof eventModule.onEvent === "function") await eventModule.onEvent(context);
        } catch (err) {
            global.log.err("EVENT", `[${eventModule.config?.name || "unknown"}] ${err.message}`);
        }
    }
}

async function runRegisteredEvents(api, event) {
    const db = getDB();
    for (const [messageID, data] of global.GoatBot.onEvent) {
        const cmd = commandLookup(data.commandName);
        if (!cmd || typeof cmd.onEvent !== "function") continue;
        try {
            const context = makeContext(api, event, cmd, {
                message: global.buildMessage(api, event),
                eventData: data,
                Event: data,
                messageID,
                delete: () => global.GoatBot.onEvent.delete(messageID)
            });
            const result = await cmd.onEvent(context);
            if (typeof result === "function") await result();
        } catch (err) {
            global.log.err("ONEVENT", `[${data.commandName}] ${err.message}`);
        }
    }
}

async function handleReaction(api, event) {
    const key = event.reactionKey?.id;
    if (!key) return;
    const data = global.GoatBot.onReaction.get(key);
    if (!data) return;
    const cmd = commandLookup(data.commandName);
    if (!cmd || typeof cmd.onReaction !== "function") return;

    const allowed = await handlerAction(api, event).catch(() => false);
    if (!allowed) return;

    const role = await getUserRole(event).catch(() => 0);
    const requiredRole = Number(cmd.config?.role || 0);
    if (role < requiredRole) return;

    const reactionData = {
        ...data,
        delete: () => global.GoatBot.onReaction.delete(key)
    };
    try {
        const result = await cmd.onReaction(makeContext(api, event, cmd, {
            Reaction: reactionData,
            reaction: event.emoji,
            role,
            message: global.buildMessage(api, event)
        }));
        if (typeof result === "function") await result();
    } catch (err) {
        global.log.err("REACTION", `[${data.commandName}] ${err.message}`);
    }
}

async function handleReply(api, event, prefix, args, message) {
    const replyMsg = event.messageReply || event.replyToMessage;
    if (!replyMsg) return false;
    const replyID = replyMsg.messageID || replyMsg.messageId || replyMsg.id;
    if (!replyID) return false;
    const data = global.GoatBot.onReply.get(replyID);
    if (!data) return false;

    const cmd = commandLookup(data.commandName);
    if (!cmd || typeof cmd.onReply !== "function") return true;

    const allowed = await handlerAction(api, event).catch(() => false);
    if (!allowed) return true;

    const role = await getUserRole(event).catch(() => 0);
    if (role < Number(cmd.config?.role || 0)) return true;

    const replyData = {
        ...data,
        delete: () => global.GoatBot.onReply.delete(replyID)
    };
    try {
        const result = await cmd.onReply(makeContext(api, event, cmd, {
            args,
            prefix,
            Reply: replyData,
            replyData,
            role,
            message
        }));
        if (typeof result === "function") await result();
    } catch (err) {
        global.log.err("REPLY", `[${data.commandName}] ${err.message}`);
    }
    return true;
}

async function runOnChat(api, event, prefix, args, message, role) {
    const db = getDB();
    for (const [, cmd] of global.GoatBot.cmds) {
        if (typeof cmd.onChat !== "function") continue;
        if (role < Number(cmd.config?.role || 0)) continue;
        try {
            const result = await cmd.onChat(makeContext(api, event, cmd, {
                args,
                prefix,
                role,
                message
            }));
            if (typeof result === "function") {
                const nested = await result();
                if (nested === true) return true;
            }
            if (result === true) return true;
        } catch (err) {
            global.log.err("ONCHAT", `[${commandNameOf(cmd)}] ${err.message}`);
        }
    }
    return false;
}

async function runFirstChat(api, event, prefix, args, message, role) {
    const threadID = String(event.threadID || "");
    if (!threadID || firstChatSeen.has(threadID)) return;
    firstChatSeen.add(threadID);
    for (const [, cmd] of global.GoatBot.cmds) {
        if (typeof cmd.onFirstChat !== "function") continue;
        if (role < Number(cmd.config?.role || 0)) continue;
        try {
            const result = await cmd.onFirstChat(makeContext(api, event, cmd, { args, prefix, role, message }));
            if (typeof result === "function") await result();
        } catch (err) {
            global.log.err("FIRSTCHAT", `[${commandNameOf(cmd)}] ${err.message}`);
        }
    }
}

async function handlerEvent(api, event) {
    if (api && typeof api === "object") {
        api._currentEvent = event;
        if (api.ctx) api.ctx.currentEvent = event;
    }
    if (!event || event.type === "stop_listen" || event.type === "ready") return;

    if (event.type === "event" || event.type === "group_update" || event.type === "group_join_request") {
        const allowed = await handlerAction(api, event).catch(() => false);
        await runEventCommands(api, event, allowed);
        await runRegisteredEvents(api, event);
        return;
    }

    if (event.type === "message_reaction") {
        await handleReaction(api, event);
        return;
    }

    if (event.type !== "message") return;

    if (!event.messageReply && event.replyToMessage) event.messageReply = event.replyToMessage;
    if (!event.replyToMessage && event.messageReply) event.replyToMessage = event.messageReply;

    await handletCheckData(api, event).catch(() => {});
    logIncomingMessage(event);

    const prefix = await global.getThreadPrefix(event.threadID);
    const body = String(event.body || "").trim();
    const rawArgs = body ? body.split(/\s+/).filter(Boolean) : [];
    const message = global.buildMessage(api, event);
    const role = await getUserRole(event).catch(() => 0);

    // Global gate first, matching Goat-Bot's ban/whitelist/admin-only flow.
    const allowed = await handlerAction(api, event).catch(() => false);
    if (!allowed) return;

    await runFirstChat(api, event, prefix, rawArgs, message, role);

    // Reply handlers get first chance to consume a reply. This prevents a
    // generic onChat handler from swallowing a command conversation.
    if (await handleReply(api, event, prefix, rawArgs, message)) return;

    // Goat-Bot style onChat: runs for every normal message (including
    // prefixed commands) and may stop further processing by returning true
    // or by returning a function that resolves to true.
    if (await runOnChat(api, event, prefix, rawArgs, message, role)) return;
    if (!body) return;

    // Support both a single prefix and a prefix array, while preserving
    // usePrefix:false commands. Longest matching prefix wins.
    const configuredPrefixes = Array.isArray(prefix)
        ? prefix.map(String).filter(Boolean)
        : [String(prefix || "!")];
    configuredPrefixes.sort((a, b) => b.length - a.length);

    let commandName = "";
    let commandArgs = [];
    const first = rawArgs[0] || "";
    const matchedPrefix = configuredPrefixes.find(p => first.startsWith(p));

    if (matchedPrefix) {
        commandName = first.slice(matchedPrefix.length).toLowerCase();
        commandArgs = rawArgs.slice(1);
    } else {
        const noPrefixCmd = commandLookup(first.toLowerCase());
        if (noPrefixCmd?.config?.usePrefix === false) {
            commandName = first.toLowerCase();
            commandArgs = rawArgs.slice(1);
        } else {
            return;
        }
    }

    const displayPrefix = matchedPrefix || configuredPrefixes[0];
    if (!commandName) return message.reply(`❌ Type ${displayPrefix}help to see all available commands.`).catch(() => {});

    const cmd = commandLookup(commandName);
    if (!cmd) {
        return message.reply(`❓ Command ${displayPrefix}${commandName} not found.\nType ${displayPrefix}help to see all available commands.`).catch(() => {});
    }

    const requiredRole = Number(cmd.config?.role || 0);
    if (role < requiredRole) {
        return message.reply(requiredRole >= 2
            ? "⛔ This command is for bot admins only."
            : "⛔ This command is for group admins only.").catch(() => {});
    }

    // usePrefix:false accepts both prefixed and unprefixed invocation.

    const canonical = commandNameOf(cmd);
    const cooldownMs = Number(cmd.config?.countDown || 0) * 1000;
    const cooldownKey = `${canonical}:${normUID(event.senderID)}:${event.threadID}`;
    if (cooldownMs > 0) {
        const last = global.GoatBot._cooldowns.get(cooldownKey) || 0;
        const remaining = cooldownMs - (Date.now() - last);
        if (remaining > 0) return message.reply(`⏳ Wait ${(remaining / 1000).toFixed(1)}s before using this again.`).catch(() => {});
    }

    if (typeof cmd.onStart !== "function") return;
    global.GoatBot._cooldowns.set(cooldownKey, Date.now());

    try {
        const result = await cmd.onStart(makeContext(api, event, cmd, {
            args: commandArgs,
            prefix: matchedPrefix || configuredPrefixes[0],
            role,
            message
        }));
        if (typeof result === "function") await result();
        global.log.success("CMD", `${displayPrefix}${canonical} ← done ✓`);
    } catch (err) {
        global.log.err("CMD", `[${canonical}] ${err.message}`);
        try { await message.reply("❌ Error: " + err.message); } catch (_) {}
    }
}

module.exports = handlerEvent;
module.exports.firstChatSeen = firstChatSeen;

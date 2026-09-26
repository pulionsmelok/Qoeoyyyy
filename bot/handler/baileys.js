const { default: makeWASocket, useMultiFileAuthState: useMultiFileAuthState, makeCacheableSignalKeyStore: makeCacheableSignalKeyStore, initAuthCreds: initAuthCreds, BufferJSON: BufferJSON, DisconnectReason: DisconnectReason, fetchLatestBaileysVersion: fetchLatestBaileysVersion, Browsers: Browsers, downloadMediaMessage: downloadMediaMessage, proto: proto, WAMessageStubType: WAMessageStubType } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const path = require("path");
const { Readable: Readable } = require("stream");

const ansiColors = {
    reset: "\u001b[0m",
    bold: "\u001b[1m",
    green: "\u001b[32m",
    cyan: "\u001b[36m",
    yellow: "\u001b[33m",
    red: "\u001b[31m",
    magenta: "\u001b[35m",
    bGreen: "\u001b[92m",
    bCyan: "\u001b[96m",
    bYellow: "\u001b[93m",
    bWhite: "\u001b[97m",
    dim: "\u001b[2m"
};

// Normalize WhatsApp user IDs so role/admin checks work for both JID and plain numbers.
const normUID = jid => getUserID(jid);

const getUserID = jid => {
    if (!jid) return "";
    if (Array.isArray(jid)) jid = jid[0];
    if (typeof jid !== "string") return "";
    return jid.split(":")[0].split("@")[0];
};

const normalizeJID = jid => {
    if (!jid) return "";
    if (Array.isArray(jid)) jid = jid[0];
    if (typeof jid !== "string") return "";
    if (jid.includes("@g.us")) return jid;
    if (jid.includes("@lid")) return jid;
    if (jid.includes("@s.whatsapp.net")) return jid;
    return getUserID(jid) + "@s.whatsapp.net";
};

const isGroupJID = jid => {
    return !!(jid && jid.endsWith("@g.us"));
};

function getMediaType(url) {
    if (typeof url !== "string") return "document";
    const normalizedUrl = url.split("?")[0].toLowerCase();
    if (/\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(normalizedUrl)) return "image";
    if (/\.(mp4|mkv|3gp|avi|mov|webm)$/i.test(normalizedUrl)) return "video";
    if (/\.(mp3|m4a|ogg|wav|opus|aac)$/i.test(normalizedUrl)) return "audio";
    return "document";
}

function detectBufferMime(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 4) return null;
    // Common media signatures so raw Buffer attachments are not sent as PDFs.
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))) return { type: "image", mimetype: "image/png" };
    if (buffer.subarray(0, 3).equals(Buffer.from([0xff,0xd8,0xff]))) return { type: "image", mimetype: "image/jpeg" };
    if (buffer.subarray(0, 6).toString("ascii") === "GIF87a" || buffer.subarray(0, 6).toString("ascii") === "GIF89a") return { type: "image", mimetype: "image/gif" };
    if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return { type: "image", mimetype: "image/webp" };
    if (buffer.subarray(0, 5).toString("ascii") === "%PDF-") return { type: "document", mimetype: "application/pdf" };
    if (buffer.subarray(0, 3).toString("ascii") === "ID3" || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)) return { type: "audio", mimetype: "audio/mpeg" };
    if (buffer.subarray(0, 4).toString("ascii") === "OggS") return { type: "audio", mimetype: "audio/ogg" };
    if (buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp") return { type: "video", mimetype: "video/mp4" };
    if (buffer.subarray(0, 4).toString("ascii") === "PK\x03\x04") return { type: "document", mimetype: "application/zip" };
    return null;
}

const normalizeAttachment = attachment => {
    if (!attachment) return attachment;
    if (typeof attachment === "string") {
        return { url: attachment.trim() };
    }
    if (attachment instanceof Readable) {
        return { stream: attachment };
    }
    return attachment;
};

function extractAttachments(message) {
    const attachments = [];
    if (!message) return attachments;

    const msgContent = message.viewOnceMessage?.message || message.viewOnceMessageV2?.message || message.viewOnceMessageV2Extension?.message || message.ephemeralMessage?.message || message.documentWithCaptionMessage?.message || message;
    
    if (msgContent.imageMessage) {
        attachments.push({
            type: "image", mimetype: msgContent.imageMessage.mimetype || "image/jpeg", caption: msgContent.imageMessage.caption || "", url: msgContent.imageMessage.url, raw: msgContent.imageMessage
        });
    }
    if (msgContent.videoMessage) {
        attachments.push({
            type: "video", mimetype: msgContent.videoMessage.mimetype || "video/mp4", caption: msgContent.videoMessage.caption || "", url: msgContent.videoMessage.url, raw: msgContent.videoMessage
        });
    }
    if (msgContent.audioMessage) {
        attachments.push({
            type: "audio", mimetype: msgContent.audioMessage.mimetype || "audio/ogg", ptt: !!msgContent.audioMessage.ptt, url: msgContent.audioMessage.url, raw: msgContent.audioMessage
        });
    }
    if (msgContent.stickerMessage) {
        attachments.push({
            type: "sticker", mimetype: msgContent.stickerMessage.mimetype || "image/webp", url: msgContent.stickerMessage.url, raw: msgContent.stickerMessage
        });
    }
    if (msgContent.documentMessage) {
        attachments.push({
            type: "document", mimetype: msgContent.documentMessage.mimetype || "application/octet-stream", fileName: msgContent.documentMessage.fileName || msgContent.documentMessage.title || "", url: msgContent.documentMessage.url, raw: msgContent.documentMessage
        });
    }
    return attachments;
}

function parseMessage(message, selfID, options) {
    const key = message.key;
    if (!key) return null;

    const threadID = normalizeJID(key.remoteJid);
    const isGroup = isGroupJID(key.remoteJid);
    const senderJID = key.fromMe ? selfID : (isGroup ? key.participant : key.remoteJid);
    const senderID = normalizeJID(senderJID);

    if (!message.message) return null;

    const messageData = message.message;
    const content = messageData.viewOnceMessage?.message || messageData.viewOnceMessageV2?.message || messageData.viewOnceMessageV2Extension?.message || messageData.ephemeralMessage?.message || messageData.documentWithCaptionMessage?.message || messageData;
    const body = content.conversation || content.extendedTextMessage?.text || content.imageMessage?.caption || content.videoMessage?.caption || "";
    const attachments = extractAttachments(messageData);
    const mentions = [];

    if (messageData.extendedTextMessage?.contextInfo?.mentionedJid) {
        mentions.push(...messageData.extendedTextMessage.contextInfo.mentionedJid);
    }

    let messageReply = null;
    const quotedContent = messageData.viewOnceMessage?.message || messageData.viewOnceMessageV2?.message || messageData.viewOnceMessageV2Extension?.message || messageData.ephemeralMessage?.message || messageData.documentWithCaptionMessage?.message || messageData;
    let contextInfo = quotedContent.extendedTextMessage?.contextInfo || quotedContent.imageMessage?.contextInfo || quotedContent.videoMessage?.contextInfo || quotedContent.audioMessage?.contextInfo || quotedContent.documentMessage?.contextInfo || quotedContent.stickerMessage?.contextInfo;
    const quotedMessage = contextInfo?.quotedMessage;

    if (quotedMessage) {
        const messageID = contextInfo.stanzaId;
        const participant = contextInfo?.participant || contextInfo?.remoteJid || key.remoteJid;
        const quotedContentData = quotedMessage.viewOnceMessage?.message || quotedMessage.viewOnceMessageV2?.message || quotedMessage.viewOnceMessageV2Extension?.message || quotedMessage.ephemeralMessage?.message || quotedMessage.documentWithCaptionMessage?.message || quotedMessage;
        const quotedBody = quotedContentData.conversation || quotedContentData.extendedTextMessage?.text || quotedContentData.imageMessage?.caption || quotedContentData.videoMessage?.caption || "";
        
        messageReply = {
            messageID: messageID,
            senderID: normalizeJID(participant),
            body: quotedBody,
            attachments: extractAttachments(quotedMessage),
            raw: {
                key: {
                    remoteJid: key.remoteJid,
                    id: messageID,
                    fromMe: normalizeJID(participant) === normalizeJID(selfID)
                },
                message: quotedMessage
            }
        };
    }

    const pushName = message.pushName || content.extendedTextMessage?.contextInfo?.participant?.pushName || "";
    const from = { id: senderID, first_name: pushName || senderID.split("@")[0], username: "" };
    const chat = { id: threadID, type: isGroup ? "group" : "private" };
    const replyAlias = messageReply ? {
        message_id: messageReply.messageID,
        from: { id: messageReply.senderID },
        text: messageReply.body || "",
        caption: messageReply.body || "",
        messageReply,
        raw: messageReply.raw
    } : undefined;

    return {
        type: "message",
        messageID: key.id,
        message_id: key.id,
        threadID: threadID,
        senderID: senderID,
        body: body,
        text: body,
        isGroup: isGroup,
        fromMe: !!key.fromMe,
        from,
        chat,
        attachments: attachments,
        mentions: mentions,
        entities: [],
        messageReply: messageReply,
        replyToMessage: messageReply,
        reply_to_message: replyAlias,
        raw: message
    };
}

let clientInstance = null;

function createBaileysClient(config, callback) {
    config = config || {};
    const authFolder = config.authFolder || "./auth";
    const globalOptions = Object.assign({
        selfListen: false, listenEvents: true, autoReconnect: true, autoMarkDelivery: false, online: true
    }, config.globalOptions || {});

    let clientState = {
        selfID: null,
        sock: null,
        globalOptions: globalOptions
    };

    async function initializeSocket() {
        let qrcodeTerminal;
        try {
            qrcodeTerminal = require("qrcode-terminal");
        } catch (_) {}

        // Keep Baileys authentication in MongoDB when the bot is configured
        // for MongoDB. The existing config.json is intentionally unchanged.
        let state;
        let saveCreds;
        let usingMongoAuth = false;

        if ((global.GoatBot.config?.database?.type || "").toLowerCase() === "mongodb") {
            try {
                const { getBaileysAuthCollection } = require("../../database/connectDB/connectMongoDB.js");
                const collection = await getBaileysAuthCollection();
                const authNamespace = String(authFolder).replace(/\\/g, "/");

                const readAuth = async (file) => {
                    const doc = await collection.findOne({ namespace: authNamespace, file });
                    if (!doc || typeof doc.data !== "string") return null;
                    try {
                        return JSON.parse(doc.data, BufferJSON?.reviver);
                    } catch (_) {
                        return null;
                    }
                };

                const writeAuth = async (file, value) => {
                    const data = JSON.stringify(value, BufferJSON?.replacer);
                    await collection.updateOne(
                        { namespace: authNamespace, file },
                        { $set: { namespace: authNamespace, file, data, updatedAt: new Date() } },
                        { upsert: true }
                    );
                };

                const deleteAuth = async (file) => {
                    await collection.deleteOne({ namespace: authNamespace, file });
                };

                const mongoCreds = await readAuth("creds.json");
                const creds = mongoCreds || initAuthCreds();

                const keys = {
                    get: async (type, ids) => {
                        const result = {};
                        await Promise.all(ids.map(async id => {
                            const value = await readAuth(`${type}-${id}.json`);
                            if (value !== null && value !== undefined) result[id] = value;
                        }));
                        return result;
                    },
                    set: async (data) => {
                        for (const category in data) {
                            for (const id in data[category]) {
                                const value = data[category][id];
                                const file = `${category}-${id}.json`;
                                if (value) await writeAuth(file, value);
                                else await deleteAuth(file);
                            }
                        }
                    }
                };

                state = { creds, keys };
                saveCreds = async () => writeAuth("creds.json", state.creds);
                usingMongoAuth = true;

                global.log.info("AUTH", "WhatsApp auth storage: MongoDB");
            } catch (error) {
                global.log.warn("AUTH", "MongoDB auth unavailable, falling back to local auth: " + error.message);
                const local = await useMultiFileAuthState(authFolder);
                state = local.state;
                saveCreds = local.saveCreds;
            }
        } else {
            const local = await useMultiFileAuthState(authFolder);
            state = local.state;
            saveCreds = local.saveCreds;
        }
        const { version: version } = await fetchLatestBaileysVersion().catch(() => ({
            version: [2, 3000, 1023451250]
        }));

        const phoneNumber = config.phoneNumber ? getUserID(String(config.phoneNumber)) : null;
        const usePairingCode = config.usePairingCode === true;
        const printQR = config.printQR !== false && !usePairingCode;

        const sock = makeWASocket({
            version: version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
            },
            printQRInTerminal: printQR,
            browser: Browsers ? Browsers.ubuntu("Chrome") : ["Ubuntu", "Chrome", "20.0.04"],
            syncFullHistory: false,
            markOnlineOnConnect: globalOptions.online !== false,
            logger: pino({ level: "silent" }),
            generateHighQualityLinkPreview: true,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 30000
        });

        clientState.sock = sock;
        sock.ev.on("creds.update", saveCreds);

        let pairingRequested = false;
        let eventHandler = null;

        const cleanPhone = phoneNumber ? String(phoneNumber).replace(/[^0-9]/g, "") : null;

        if (usePairingCode && cleanPhone && !state.creds.registered) {
            setTimeout(async () => {
                if (pairingRequested) return;
                pairingRequested = true;
                try {
                    const pairingCode = await sock.requestPairingCode(cleanPhone);

                    try {
                        if (global.utils && global.utils.spinner) {
                            global.utils.spinner.info("Pairing Code generated");
                        }
                    } catch (_) {}
                    console.log("\n" + ansiColors.bGreen + "══════════════════════════════════════" + ansiColors.reset);
                    console.log(ansiColors.bGreen + "  PAIRING CODE: " + ansiColors.bYellow + pairingCode + ansiColors.reset);
                    console.log(ansiColors.bGreen + "══════════════════════════════════════" + ansiColors.reset);
                    console.log(ansiColors.cyan + "  WhatsApp → Linked Devices → Link with phone number" + ansiColors.reset);
                    console.log(ansiColors.cyan + "  Enter this code on your phone.\n" + ansiColors.reset);
                } catch (err) {
                    console.log(ansiColors.red + "Failed to get pairing code: " + (err.message || err) + ansiColors.reset);
                    pairingRequested = false;
                }
            }, 3000);
        }

        sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr && printQR) {
                if (qrcodeTerminal) {
                    console.log(ansiColors.cyan + "Scan QR Code:\n" + ansiColors.reset);
                    qrcodeTerminal.generate(qr, { small: true });
                } else {
                    console.log(ansiColors.yellow + "QR: " + qr + ansiColors.reset);
                }
            }

            if (qr && usePairingCode && cleanPhone && !pairingRequested) {
                pairingRequested = true;
                try {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    const pairingCode = await sock.requestPairingCode(cleanPhone);
                    console.log("\n" + ansiColors.bGreen + "══════════════════════════════════════" + ansiColors.reset);
                    console.log(ansiColors.bGreen + "  PAIRING CODE: " + ansiColors.bYellow + pairingCode + ansiColors.reset);
                    console.log(ansiColors.bGreen + "══════════════════════════════════════" + ansiColors.reset);
                    console.log(ansiColors.cyan + "  WhatsApp → Linked Devices → Link with phone number" + ansiColors.reset);
                    console.log(ansiColors.cyan + "  Enter this code on your phone.\n" + ansiColors.reset);
                } catch (err) {
                    console.log(ansiColors.red + "Failed to get pairing code: " + (err.message || err) + ansiColors.reset);
                }
            }

            if (connection === "open") {
                clientState.selfID = sock.user?.id || "";
                if (!clientInstance) {
                    clientInstance = createClient(sock, clientState);
                    global.clientInstance = clientInstance;
                    callback(null, clientInstance);
                } else {
                    if (eventHandler) {
                        attachEventListeners(sock, clientState, eventHandler);
                    }
                }
            }

            if (connection === "close") {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const isLoggedOut = statusCode === DisconnectReason.loggedOut;
                const errorMsg = lastDisconnect?.error?.message || lastDisconnect?.error || "Unknown";
                const isConflict = errorMsg.toLowerCase().includes("conflict");

                if (isLoggedOut) {
                    try {
                        fs.rmSync(authFolder, { recursive: true, force: true });
                    } catch (_) {}

                    if (usingMongoAuth) {
                        try {
                            const { getBaileysAuthCollection } = require("../../database/connectDB/connectMongoDB.js");
                            const collection = await getBaileysAuthCollection();
                            const authNamespace = String(authFolder).replace(/\\/g, "/");
                            await collection.deleteMany({ namespace: authNamespace });
                            global.log.info("AUTH", "WhatsApp auth removed from MongoDB after logout.");
                        } catch (error) {
                            global.log.warn("AUTH", "Could not clear MongoDB auth after logout: " + error.message);
                        }
                    }

                    callback(new Error("logged_out"), null);
                    return;
                }

                console.log(ansiColors.yellow + "Connection closed. Reason: " + errorMsg + ansiColors.reset);
                
                if (isConflict) {
                    console.log(ansiColors.yellow + "Conflict detected — waiting 10s before reconnect..." + ansiColors.reset);
                    setTimeout(() => {
                        console.log(ansiColors.cyan + "Restarting process..." + ansiColors.reset);
                        process.exit(2);
                    }, 10000);
                    return;
                }

                console.log(ansiColors.cyan + "Restarting process for a clean reconnection..." + ansiColors.reset);
                process.exit(2);
            }
        });
    }

    function attachEventListeners(socket, ctx, eventCallback) {
        socket.ev.on("messages.upsert", async ({ messages: msgs, type: msgType }) => {
            if (msgType !== "notify" && msgType !== "append") return;

            for (const msg of msgs) {
                if (msg.key?.remoteJid === "status@broadcast") continue;

                if (msg.messageTimestamp) {
                    let timestamp = msg.messageTimestamp;
                    if (typeof timestamp !== "number") {
                        if (typeof timestamp.toNumber === "function") {
                            timestamp = timestamp.toNumber();
                        } else if (typeof timestamp.low === "number") {
                            timestamp = timestamp.low;
                        } else {
                            timestamp = Number(timestamp);
                        }
                    }
                    const msgTime = timestamp * 1000;
                    const startTime = global.GoatBot?.startTime || Date.now();
                    if (msgTime < startTime - 10000) continue;
                }

                const selfJid = ctx.selfID;
                const selfID = getUserID(selfJid);
                const lidID = socket?.user?.lid ? getUserID(socket.user.lid) : "";

                if (msg.messageStubType === WAMessageStubType.GROUP_CREATE) {
                    if (!msg.key.fromMe && msg.key?.remoteJid?.endsWith?.("@g.us")) {
                        eventCallback(null, {
                            type: "event", logMessageType: "log:subscribe", threadID: normalizeJID(msg.key.remoteJid), senderID: msg.key.participant ? normalizeJID(msg.key.participant) : normalizeJID(msg.key.remoteJid), isGroup: true, participants: [], isBotAdded: true
                        });
                    }
                } else if (msg.messageStubType === WAMessageStubType.GROUP_PARTICIPANT_ADD) {
                    let isBotAdded = false;
                    let stubParams = [];

                    if (msg.messageStubParameters?.length) {
                        try {
                            stubParams = msg.messageStubParameters.map(p => JSON.parse(p));
                            isBotAdded = stubParams.some(param => {
                                const id = param.id || "";
                                const phone = param.phoneNumber || "";
                                return (id && (getUserID(id) === selfID || getUserID(id) === lidID)) || (phone && getUserID(phone) === selfID);
                            });
                        } catch (_) {}
                    }

                    if (!isBotAdded && !msg.key.fromMe && msg.key?.remoteJid?.endsWith?.("@g.us") && msg.message) {
                        isBotAdded = true;
                    }

                    if (isBotAdded) {
                        const threadID = normalizeJID(msg.key.remoteJid);
                        const senderID = msg.key.participant ? normalizeJID(msg.key.participant) : threadID;
                        eventCallback(null, {
                            type: "event", logMessageType: "log:subscribe", threadID: threadID, senderID: senderID, isGroup: true, participants: stubParams.map(p => normalizeJID(p.id || "")), isBotAdded: true
                        });
                    }
                }

                if (!msg.message && !msg.messageStubType) continue;

                const parsed = parseMessage(msg, ctx.selfID, socket);
                if (!parsed) continue;
                if (parsed.fromMe && !globalOptions.selfListen) continue;

                if (globalOptions.autoMarkDelivery && msg.key) {
                    try {
                        await socket.readMessages([msg.key]);
                    } catch (_) {}
                }

                eventCallback(null, parsed);
            }
        });

        socket.ev.on("messages.reaction", reactions => {
            if (!globalOptions.listenEvents) return;

            // Baileys v7 emits { key: TARGET_MESSAGE_KEY, reaction }, while
            // reaction.key identifies the reaction message / reactor.
            // The target key is the message that must be deleted.
            for (const { key: targetKey, reaction } of reactions) {
                const reactorKey = reaction?.key || {};
                const threadID = normalizeJID(targetKey?.remoteJid || reactorKey?.remoteJid);
                const senderID = normalizeJID(
                    reactorKey?.fromMe ? ctx.selfID : (reactorKey?.participant || reactorKey?.remoteJid)
                );

                eventCallback(null, {
                    type: "message_reaction",
                    threadID: threadID,
                    senderID: senderID,
                    author: senderID,
                    messageID: targetKey?.id || reactorKey?.id,
                    isGroup: isGroupJID(threadID),
                    fromMe: !!targetKey?.fromMe,
                    emoji: reaction?.text || "",
                    removed: !reaction?.text,
                    reactionKey: targetKey,
                    reactorKey: reactorKey
                });
            }
        });

        socket.ev.on("group-participants.update", async (update) => {
            if (!globalOptions.listenEvents) return;

            const { id: groupID, participants: rawParticipants, action: action, author: rawAuthor } = update;
            const selfJid = ctx.selfID;
            const getID = p => typeof p === "string" ? p : p?.id || p?.jid || "";
            const threadID = normalizeJID(groupID);
            const participants = rawParticipants.map(p => normalizeJID(getID(p)));
            const senderID = rawAuthor ? normalizeJID(getID(rawAuthor)) : threadID;
            const selfIDNum = getUserID(selfJid);
            const lidIDNum = socket?.user?.lid ? getUserID(socket.user.lid) : "";

            const isBotAffected = rawParticipants.some(p => {
                const jid = getID(p);
                const phone = typeof p === "object" ? p.phoneNumber : "";
                const idNum = jid ? getUserID(jid) : "";
                return (idNum !== "" && (idNum === selfIDNum || idNum === lidIDNum)) || (phone && getUserID(phone) === selfIDNum);
            });

            if (action === "add") {
                eventCallback(null, {
                    type: "event", logMessageType: "log:subscribe", threadID: threadID, senderID: senderID, isGroup: true, participants: participants, isBotAdded: isBotAffected
                });
            } else if (action === "remove") {
                eventCallback(null, {
                    type: "event", logMessageType: "log:unsubscribe", threadID: threadID, senderID: senderID, isGroup: true, participants: participants, isBotRemoved: isBotAffected
                });
            } else if (action === "promote" || action === "demote") {
                eventCallback(null, {
                    type: "event", logMessageType: "log:thread-admins", threadID: threadID, senderID: senderID, isGroup: true, action: action, participants: participants, isBotPromoted: action === "promote" && isBotAffected, isBotDemoted: action === "demote" && isBotAffected
                });
            }
        });

        socket.ev.on("groups.update", async (groups) => {
            if (!globalOptions.listenEvents) return;

            for (const group of groups) {
                const { id, subject, author: author } = group;
                if (subject) {
                    const threadID = normalizeJID(id);
                    const senderID = author ? normalizeJID(author) : threadID;
                    eventCallback(null, {
                        type: "group_update", logMessageType: "log:thread-name", threadID: threadID, senderID: senderID, isGroup: true, logMessageData: { value: subject }, raw: group
                    });
                }
            }
        });
    }

    function looksLikeJID(value) {
        if (typeof value !== "string") return false;
        return /@(s\.whatsapp\.net|g\.us|broadcast)$/.test(value) || /^\d{7,}$/.test(value);
    }

    // Add the actual incoming WAMessage as the native Baileys quote target.
    // This makes both message.reply() and direct api.sendMessage()/media sends
    // quote the message that triggered the command, not an older quoted message.
    function sanitizeSendOptions(options = {}, targetJid = null) {
        const out = { ...options };
        delete out.reply_to_message_id;
        delete out.parse_mode;
        delete out.reply_markup;
        delete out.caption;

        const current = clientInstance?._currentEvent;
        const sameChat = targetJid && current?.type === "message"
            && normalizeJID(current.threadID) === normalizeJID(targetJid);
        if (!out.quoted && !out.replyToMessage && sameChat && current?.raw) {
            out.quoted = current.raw;
        }
        delete out.replyToMessage;
        return out;
    }

    function createClient(socket, ctx) {
        return {
            sock: socket,
            ctx: ctx,
            _currentEvent: null,
            getCurrentUserID: () => ctx.selfID,
            sendMessage: async (content, jid, options = {}, legacyMessageID) => {
                // Accept both native WAGoat order: (content, jid, options)
                // and legacy Telegram/FCA-style order: (jid, content, options).
                if (looksLikeJID(content) && !looksLikeJID(jid)) {
                    const tmp = content; content = jid; jid = tmp;
                }
                // Legacy FCA/Telegram-style calls often pass a message id or callback
                // as the third argument and the message id as the fourth argument.
                let callback = null;
                if (typeof options === "function") {
                    callback = options;
                    options = {};
                } else if (typeof options === "string") {
                    options = { reply_to_message_id: options };
                } else if (!options || typeof options !== "object") {
                    options = {};
                }
                if (typeof legacyMessageID === "function") callback = legacyMessageID;
                else if (legacyMessageID && typeof legacyMessageID === "string") options.reply_to_message_id = legacyMessageID;
                else if (legacyMessageID && typeof legacyMessageID === "object") options = { ...options, ...legacyMessageID };
                const targetJid = normalizeJID(jid);
                if (!targetJid) throw new Error("Missing recipient JID");
                const text = typeof content === "string" ? content : (content?.body || content?.text || "");
                const mentions = content && content.mentions ? content.mentions.map(m => normalizeJID(m)) : (options.mentions ? options.mentions.map(m => normalizeJID(m)) : []);
                let messagePayload = { text: text };

                if (content && typeof content === "object") {
                    if (content.forward) {
                        return await socket.sendMessage(targetJid, { forward: content.forward }, options);
                    }
                    if (content.attachment) {
                        const type = content.attachment;
                        let mediaType = "document";
                        let media = normalizeAttachment(type);
                        let mimetype = type && type.mimetype;
                        let fileName = type && type.fileName;

                        if (typeof type === "string") {
                            mediaType = getMediaType(type);
                        } else if (Buffer.isBuffer(type)) {
                            const detected = detectBufferMime(type);
                            mediaType = detected?.type || (content.mimetype && String(content.mimetype).toLowerCase().startsWith("image/") ? "image" : "document");
                            mimetype = type.mimetype || content.mimetype || detected?.mimetype || mimetype;
                            media = type;
                        } else if (type && typeof type === "object") {
                            if (type.path && typeof type.path === "string") mediaType = getMediaType(type.path);
                            if (type.type) mediaType = String(type.type).toLowerCase();
                            else if (type.mimetype) {
                                const mt = String(type.mimetype).toLowerCase();
                                if (mt.startsWith("image/")) mediaType = "image";
                                else if (mt.startsWith("video/")) mediaType = "video";
                                else if (mt.startsWith("audio/")) mediaType = "audio";
                            } else if (type.url) mediaType = getMediaType(type.url);
                            if (type.data && Buffer.isBuffer(type.data)) {
                                media = type.data;
                                const detected = detectBufferMime(type.data);
                                if (!type.type && !type.mimetype && detected) mediaType = detected.type;
                                mimetype = type.mimetype || detected?.mimetype || mimetype;
                            } else if (type.stream) {
                                media = normalizeAttachment(type.stream);
                                if (!type.type && !type.mimetype && type.stream.path && typeof type.stream.path === "string") mediaType = getMediaType(type.stream.path);
                            } else if (type.url) {
                                media = normalizeAttachment(type.url);
                            }
                        } else if (type instanceof Readable) {
                            media = normalizeAttachment(type);
                            if (type.path && typeof type.path === "string") mediaType = getMediaType(type.path);
                        }
                        if (mediaType === "ptt") {
                            messagePayload = { audio: media, ptt: true, mimetype: mimetype || "audio/ogg" };
                        } else if (mediaType === "audio") {
                            messagePayload = { audio: media, ptt: false, mimetype: mimetype || "audio/mpeg", caption: text };
                        } else {
                            messagePayload = { [mediaType]: media, caption: text };
                            if (mimetype) messagePayload.mimetype = mimetype;
                            if (fileName) messagePayload.fileName = fileName;
                        }
                    }
                }
                if (mentions.length > 0) messagePayload.mentions = mentions;
                // Baileys requires { quoted: <full WAMessage> }. Prefer an explicit
                // quote, otherwise automatically quote the current incoming message
                // when this send is going back to the same chat.
                let quoted = options.replyToMessage || options.quoted || null;
                if (quoted && quoted.raw) quoted = quoted.raw;
                const sendOptions = { ...options };
                delete sendOptions.replyToMessage;
                delete sendOptions.quoted;
                if (quoted) {
                    sendOptions.quoted = quoted;
                } else {
                    const current = clientInstance?._currentEvent;
                    if (current?.type === "message" && current.raw
                        && normalizeJID(current.threadID) === normalizeJID(targetJid)) {
                        sendOptions.quoted = current.raw;
                    }
                }
                const sent = await socket.sendMessage(targetJid, messagePayload, sendOptions);
                if (typeof callback === "function") {
                    const info = { messageID: sent?.key?.id || sent?.id || null, threadID: targetJid, sent };
                    try { callback(null, info); } catch (_) {}
                }
                return sent;
            },
            sendImage: async (image, jid, caption, options = {}) => {
                if (looksLikeJID(image) && !looksLikeJID(jid)) {
                    const tmp = image; image = jid; jid = tmp;
                }
                const target = normalizeJID(jid);
                options = (options && typeof options === "object") ? options : {};
                const mentions = options.mentions ? options.mentions.map(m => normalizeJID(m)) : [];
                const payload = { image: normalizeAttachment(image), caption: caption };
                if (mentions.length > 0) payload.mentions = mentions;
                return await socket.sendMessage(target, payload, sanitizeSendOptions(options, target));
            },
            sendPhoto: async (jid, photo, options = {}, legacyMessageID) => {
                // Supports (jid, photo, opts, messageID), (photo, jid, opts),
                // and the occasional opts object in the fourth position.
                if (!looksLikeJID(jid) && looksLikeJID(photo)) {
                    const tmp = jid; jid = photo; photo = tmp;
                }
                const opts = typeof options === "object" && options !== null ? { ...options } : {};
                if (typeof options === "string") opts.reply_to_message_id = options;
                if (legacyMessageID && typeof legacyMessageID === "string" && !opts.reply_to_message_id) opts.reply_to_message_id = legacyMessageID;
                if (legacyMessageID && typeof legacyMessageID === "object") Object.assign(opts, legacyMessageID);
                return await clientInstance.sendImage(photo, jid, opts.caption || opts.text || "", opts);
            },
            sendVideo: async (video, jid, caption, options = {}) => {
                if (looksLikeJID(video) && !looksLikeJID(jid)) {
                    const tmp = video; video = jid; jid = tmp;
                }
                const target = normalizeJID(jid);
                options = (options && typeof options === "object") ? options : {};
                const mentions = options.mentions ? options.mentions.map(m => normalizeJID(m)) : [];
                const payload = { video: normalizeAttachment(video), caption: caption };
                if (mentions.length > 0) payload.mentions = mentions;
                return await socket.sendMessage(target, payload, sanitizeSendOptions(options, target));
            },
            sendAudio: async (audio, jid, options = {}) => {
                if (looksLikeJID(audio) && !looksLikeJID(jid)) {
                    const tmp = audio; audio = jid; jid = tmp;
                }
                const target = normalizeJID(jid);
                options = (options && typeof options === "object") ? options : {};
                const mentions = options.mentions ? options.mentions.map(m => normalizeJID(m)) : [];
                const payload = { audio: normalizeAttachment(audio), ptt: !!options.ptt, mimetype: options.mimetype || "audio/ogg" };
                if (options.caption) payload.caption = options.caption;
                if (mentions.length > 0) payload.mentions = mentions;
                return await socket.sendMessage(target, payload, sanitizeSendOptions(options, target));
            },
            reactToMessage: async (jid, key, emoji) => {
                return await socket.sendMessage(normalizeJID(jid), { react: { text: emoji, key: key } });
            },
            deleteMessage: async (jid, messageKey) => {
                const target = normalizeJID(jid);
                const key = {
                    remoteJid: normalizeJID(messageKey.remoteJid || jid),
                    id: messageKey.id || messageKey,
                    fromMe: messageKey.fromMe !== false,
                    participant: messageKey.participant ? normalizeJID(messageKey.participant) : undefined
                };
                return await socket.sendMessage(target, { delete: key });
            },
            getGroupInfo: async (jid) => {
                return await socket.groupMetadata(normalizeJID(jid));
            },
            getThreadInfo: async (jid) => {
                return await socket.groupMetadata(normalizeJID(jid));
            },
            getAvatarUrl: async (jid) => {
                try { return await socket.profilePictureUrl(normalizeJID(jid), "image"); } catch (_) { return null; }
            },
            resolvePhotoUrl: async (value) => {
                if (!value) return null;
                if (typeof value === "string" && /^https?:\/\//i.test(value)) return value;
                return null;
            },
            getUserProfilePhotos: async (jid) => {
                const url = await clientInstance.getAvatarUrl(jid);
                return url ? { total_count: 1, photos: [[{ file_id: url }]] } : { total_count: 0, photos: [] };
            },
            getFileLink: async (fileId) => {
                return typeof fileId === "string" && /^https?:\/\//i.test(fileId) ? fileId : null;
            },
            getMe: async () => ({ id: ctx.selfID, user: { id: ctx.selfID } }),
            getChatMember: async (jid, user) => {
                const target = normalizeJID(user);
                const metadata = await socket.groupMetadata(normalizeJID(jid));
                const participant = (metadata.participants || []).find(p => normalizeJID(p.id || p.jid || p) === target);
                const admin = participant?.admin || participant?.role;
                return {
                    user: { id: target },
                    status: admin ? (admin === "superadmin" ? "creator" : "administrator") : "member",
                    participant
                };
            },
            getChat: async (jid) => {
                const target = normalizeJID(jid);
                if (target.endsWith("@g.us")) {
                    const metadata = await socket.groupMetadata(target);
                    return { id: target, title: metadata.subject || target, type: "group" };
                }
                const info = await clientInstance.getUserInfo(target).catch(() => ({}));
                return { id: target, type: "private", first_name: info?.name || info?.notify || "" };
            },
            getChatAdministrators: async (jid) => {
                const metadata = await socket.groupMetadata(normalizeJID(jid));
                return (metadata.participants || [])
                    .filter(p => p.admin)
                    .map(p => ({ user: { id: normalizeJID(p.id || p.jid || p) }, status: p.admin === "superadmin" ? "creator" : "administrator", participant: p }));
            },
            answerCallbackQuery: async () => true,
            getProfilePicture: async (jid) => {
                return await socket.profilePictureUrl(normalizeJID(jid), "image");
            },
            updateProfilePicture: async (image) => {
                return await socket.updateProfilePicture(normalizeJID(ctx.selfID), image);
            },
            kickUser: async (jid, users) => {
                const list = Array.isArray(users) ? users.map(u => normalizeJID(u)) : [normalizeJID(users)];
                return await socket.groupParticipantsUpdate(normalizeJID(jid), list, "remove");
            },
            promoteAdmin: async (jid, users) => {
                const list = Array.isArray(users) ? users.map(u => normalizeJID(u)) : [normalizeJID(users)];
                return await socket.groupParticipantsUpdate(normalizeJID(jid), list, "promote");
            },
            demoteAdmin: async (jid, users) => {
                const list = Array.isArray(users) ? users.map(u => normalizeJID(u)) : [normalizeJID(users)];
                return await socket.groupParticipantsUpdate(normalizeJID(jid), list, "demote");
            },
            updateMediaMessage: async (media) => {
                if (typeof socket.updateMediaMessage === "function") {
                    return await socket.updateMediaMessage(media);
                }
                return media;
            },
            updateProfileStatus: async (status) => {
                return await socket.updateProfileStatus(status);
            },
            updateProfileName: async (name) => {
                return await socket.updateProfileName(name);
            },
            fetchStatus: async (jid) => {
                return await socket.fetchStatus(normalizeJID(jid));
            },
            sendPresenceUpdate: async (jid, presence) => {
                return await socket.sendPresenceUpdate(presence, normalizeJID(jid));
            },
            sendTypingIndicator: async (jid, duration = 3000) => {
                const target = normalizeJID(jid);
                await socket.sendPresenceUpdate("composing", target);
                await new Promise(r => setTimeout(r, duration));
                return await socket.sendPresenceUpdate("paused", target);
            },
            sendReadReceipt: async (jid, participant, messageIDs) => {
                return await socket.readMessages([{ remoteJid: normalizeJID(jid), id: messageIDs[0], participant: normalizeJID(participant) }]);
            },
            sendLocation: async (jid, lat, lon, options = {}) => {
                return await socket.sendMessage(normalizeJID(jid), { location: { degreesLatitude: lat, degreesLongitude: lon } }, options);
            },
            muteChat: async (jid, duration = 8 * 60 * 60) => {
                return await socket.chatModify({ mute: duration }, normalizeJID(jid));
            },
            unmuteChat: async (jid) => {
                return await socket.chatModify({ mute: null }, normalizeJID(jid));
            },
            archiveChat: async (jid, archive = true) => {
                return await socket.chatModify({ archive: !!archive }, normalizeJID(jid));
            },
            pinChat: async (jid, pin = true) => {
                return await socket.chatModify({ pin: !!pin }, normalizeJID(jid));
            },
            blockContact: async (jid) => {
                return await socket.updateBlockStatus(normalizeJID(jid), "block");
            },
            unblockContact: async (jid) => {
                return await socket.updateBlockStatus(normalizeJID(jid), "unblock");
            },
            getGroupInviteLink: async (jid) => {
                return await socket.groupInviteCode(normalizeJID(jid));
            },
            groupRevokeInvite: async (jid) => {
                return await socket.groupRevokeInvite(normalizeJID(jid));
            },
            groupAcceptInvite: async (code) => {
                return await socket.groupAcceptInvite(code);
            },
            groupSettingUpdate: async (jid, setting) => {
                return await socket.groupSettingUpdate(normalizeJID(jid), setting);
            },
            sendPoll: async (jid, name, values = []) => {
                return await socket.sendMessage(normalizeJID(jid), { poll: { name: name, values: values, selectableCount: 1 } });
            },
            editMessage: async (jid, messageID, text) => {
                return await socket.sendMessage(normalizeJID(jid), { text: text, edit: { remoteJid: normalizeJID(jid), id: messageID, fromMe: true } });
            },
            editMessageText: async (jidOrObj, messageID, text) => {
                if (jidOrObj && typeof jidOrObj === "object") {
                    const obj = jidOrObj;
                    return await socket.sendMessage(normalizeJID(obj.chat_id || obj.chatId || obj.threadID), {
                        text: obj.text || "",
                        edit: { remoteJid: normalizeJID(obj.chat_id || obj.chatId || obj.threadID), id: String(obj.message_id || obj.messageID), fromMe: true }
                    });
                }
                return await clientInstance.editMessage(jidOrObj, messageID, text);
            },
            editMessageCaption: async (jid, messageID, caption) => {
                return await socket.sendMessage(normalizeJID(jid), { text: caption || "", edit: { remoteJid: normalizeJID(jid), id: String(messageID), fromMe: true } });
            },
            unsendMessage: async (messageID, jid) => {
                const target = jid || ctx.currentEvent?.threadID || clientInstance._currentEvent?.threadID;
                if (!target) throw new Error("Missing chat ID for unsendMessage");
                return await clientInstance.deleteMessage(target, { remoteJid: target, id: String(messageID), fromMe: true });
            },
            pinMessage: async (jid, messageID, duration = 24 * 60 * 60) => {
                return await socket.sendMessage(normalizeJID(jid), { pin: { key: { remoteJid: normalizeJID(jid), id: messageID, fromMe: true }, type: 1, duration: duration } });
            },
            unpinMessage: async (jid, messageID) => {
                return await socket.sendMessage(normalizeJID(jid), { pin: { key: { remoteJid: normalizeJID(jid), id: messageID, fromMe: true }, type: 0 } });
            },
            downloadMedia: async (message) => {
                return await downloadMediaMessage(message, "buffer", {}, { logger: pino({ level: "silent" }) });
            },
            listenMqtt: callback => {
                ctx.listenCallback = callback;
                attachEventListeners(socket, ctx, callback);
                return socket;
            },
            sendPTT: async (audio, jid, options = {}) => {
                return await socket.sendMessage(normalizeJID(jid), { audio: normalizeAttachment(audio), ptt: true, mimetype: options.mimetype || "audio/ogg" }, options);
            },
            sendDocument: async (file, jid, filename, options = {}) => {
                return await socket.sendMessage(normalizeJID(jid), { document: normalizeAttachment(file), fileName: filename || "file", mimetype: options.mimetype || "application/pdf" }, options);
            },
            sendSticker: async (sticker, jid, options = {}) => {
                return await socket.sendMessage(normalizeJID(jid), { sticker: normalizeAttachment(sticker) }, options);
            },
            sendGif: async (video, jid, caption, options = {}) => {
                return await socket.sendMessage(normalizeJID(jid), { video: normalizeAttachment(video), gifPlayback: true, caption: caption }, options);
            },
            sendMedia: async (media, jid, type, caption, options = {}) => {
                const target = normalizeJID(jid);
                const attachment = normalizeAttachment(media);
                if (type === "ptt") {
                    return await socket.sendMessage(target, { audio: attachment, ptt: true, mimetype: options.mimetype || "audio/ogg" }, options);
                } else if (type === "gif") {
                    return await socket.sendMessage(target, { video: attachment, gifPlayback: true, caption: caption }, options);
                } else {
                    return await socket.sendMessage(target, { [type]: attachment, caption: caption }, options);
                }
            },
            markAsRead: async (jid, participant, messageIDs) => {
                return await socket.readMessages([{ remoteJid: normalizeJID(jid), id: messageIDs[0], participant: normalizeJID(participant) }]);
            },
            addUserToGroup: async (jid, user) => {
                return await socket.groupParticipantsUpdate(normalizeJID(jid), [normalizeJID(user)], "add");
            },
            removeUserFromGroup: async (jid, user) => {
                return await socket.groupParticipantsUpdate(normalizeJID(jid), [normalizeJID(user)], "remove");
            },
            changeGroupSubject: async (jid, subject) => {
                return await socket.groupUpdateSubject(normalizeJID(jid), subject);
            },
            changeGroupDescription: async (jid, description) => {
                return await socket.groupUpdateDescription(normalizeJID(jid), description);
            },
            getGroupAdmins: async (jid) => {
                const metadata = await socket.groupMetadata(normalizeJID(jid));
                return (metadata.participants || []).filter(p => p.admin === "admin" || p.admin === "superadmin").map(p => p.id);
            },
            createGroup: async (name, users = []) => {
                const list = users.map(u => normalizeJID(u));
                return await socket.groupCreate(name, list);
            },
            leaveGroup: async (jid) => {
                return await socket.groupLeave(normalizeJID(jid));
            },
            getAllGroups: async () => {
                const chats = socket.chats || {};
                const groups = [];
                for (const jid of Object.keys(chats)) {
                    if (isGroupJID(jid)) {
                        groups.push({ id: jid, name: chats[jid].name || "" });
                    }
                }
                return groups;
            },
            unarchiveChat: async (jid) => {
                return await socket.chatModify({ archive: false }, normalizeJID(jid));
            },
            getUserInfo: async (jid) => {
                const target = normalizeJID(jid);
                const contacts = socket.contacts || (socket.store && socket.store.contacts) || {};
                const contact = contacts[target] || {};
                return {
                    id: target,
                    name: contact.name || contact.notify || contact.verifiedName || "",
                    notify: contact.notify || "",
                    verifiedName: contact.verifiedName || ""
                };
            },
            getDMInfo: async (jid) => {
                const target = normalizeJID(jid);
                const contacts = socket.contacts || (socket.store && socket.store.contacts) || {};
                const contact = contacts[target] || {};
                return {
                    id: target,
                    name: contact.name || contact.notify || ""
                };
            },
            getContacts: async () => {
                const contacts = socket.contacts || (socket.store && socket.store.contacts) || {};
                return Object.values(contacts);
            },
            getChats: async () => {
                return Object.values(socket.chats || {});
            },
            sendButtons: async (jid, text, buttons = [], options = {}) => {
                let formattedText = text;
                if (buttons.length > 0) {
                    formattedText += "\n\n🔘 *Buttons:*";
                    buttons.forEach(btn => {
                        const displayText = btn.buttonText?.displayText || btn.displayText || btn.id || "";
                        formattedText += `\n- ${displayText}`;
                    });
                }
                return await socket.sendMessage(normalizeJID(jid), { text: formattedText }, options);
            },
            sendList: async (jid, title, description, sections = [], options = {}) => {
                let formattedText = `📋 *${title}*\n${description}`;
                sections.forEach(sec => {
                    if (sec.title) formattedText += `\n\n🔹 *${sec.title}*`;
                    if (Array.isArray(sec.rows)) {
                        sec.rows.forEach(row => {
                            formattedText += `\n- *${row.title || ""}*: ${row.description || ""}`;
                        });
                    }
                });
                return await socket.sendMessage(normalizeJID(jid), { text: formattedText }, options);
            },
            sendTemplate: async (jid, text, templates = [], options = {}) => {
                let formattedText = text;
                if (templates.length > 0) {
                    formattedText += "\n\n🔗 *Links & Actions:*";
                    templates.forEach(tpl => {
                        const type = tpl.quickReplyButton ? "Reply" : (tpl.urlButton ? "Link" : "Call");
                        const label = tpl.quickReplyButton?.displayText || tpl.urlButton?.displayText || tpl.callButton?.displayText || "";
                        const urlOrPhone = tpl.urlButton?.url || tpl.callButton?.phoneNumber || "";
                        formattedText += `\n- [${type}] *${label}* ${urlOrPhone ? `(${urlOrPhone})` : ""}`;
                    });
                }
                return await socket.sendMessage(normalizeJID(jid), { text: formattedText }, options);
            },
            listen: callback => {
                ctx.listenCallback = callback;
                attachEventListeners(socket, ctx, callback);
                return socket;
            }
        };
    }

    initializeSocket();
}

module.exports = createBaileysClient;
module.exports.getUserID = getUserID;
module.exports.normalizeJID = normalizeJID;
module.exports.isGroupJID = isGroupJID;
module.exports.normUID = normUID;

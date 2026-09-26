"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { Readable } = require("stream");

const log = require("./logger/log.js");
const spinner = require("./logger/spinner.js");
const colors = require("./logger/colors.js").colors;
const theme = require("./logger/colors.js").theme;
const loading = require("./logger/loading.js");
const logColor = require("./logger/logColor.js");
const Prism = require("./logger/prism.js");

module.exports.log = log;
module.exports.spinner = spinner;
module.exports.colors = colors;
module.exports.theme = theme;
module.exports.loading = loading;
module.exports.logColor = logColor;
module.exports.Prism = Prism;

function getStreamFromUrl(url) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https") ? https : http;
    proto.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(getStreamFromUrl(res.headers.location));
      }
      if (res.statusCode !== 200) {
        return reject(new Error("HTTP " + res.statusCode + " for " + url));
      }
      resolve(res);
    }).on("error", reject);
  });
}
module.exports.getStreamFromUrl = getStreamFromUrl;
module.exports.getStreamFromURL = getStreamFromUrl;

function getBase64FromUrl(url) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https") ? https : http;
    proto.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(getBase64FromUrl(res.headers.location));
      }
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("base64")));
      res.on("error", reject);
    }).on("error", reject);
  });
}
module.exports.getBase64FromUrl = getBase64FromUrl;

function getMessageReply(event) {
  return (event && (event.messageReply || event.replyToMessage)) || null;
}
module.exports.getMessageReply = getMessageReply;

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(dest);
    proto.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        return resolve(downloadFile(res.headers.location, dest));
      }
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve(dest)));
    }).on("error", (err) => {
      fs.unlink(dest, () => { });
      reject(err);
    });
  });
}
module.exports.downloadFile = downloadFile;

async function getAttachmentStream({ event, type, url, api } = {}) {

  const replied = getMessageReply(event);
  if (replied && replied.attachments) {
    const filter = type ? [type] : ["image", "photo", "video", "audio", "ptt", "document", "sticker"];
    const att = replied.attachments.find(a => filter.includes(a.type));
    if (att && att.url) {
      const stream = await getStreamFromUrl(att.url);
      return { stream, mimetype: att.mimetype || "application/octet-stream", ext: extFromMime(att.mimetype) };
    }
    if (att && api && api.downloadMedia) {
      try {
        let targetObj = replied.raw || replied;
        if (!targetObj.message && (targetObj.imageMessage || targetObj.videoMessage || targetObj.audioMessage || targetObj.stickerMessage || targetObj.documentMessage)) {
          targetObj = { message: targetObj };
        }
        const buf = await api.downloadMedia(targetObj);
        const stream = Readable.from(buf);
        return { stream, mimetype: att.mimetype || "application/octet-stream", ext: extFromMime(att.mimetype) };
      } catch (err) {
        console.error("Download media error (replied):", err);
      }
    }
  }
  if (event && event.attachments && event.attachments.length > 0) {
    const filter = type ? [type] : ["image", "photo", "video", "audio", "ptt", "document", "sticker"];
    const att = event.attachments.find(a => filter.includes(a.type));
    if (att && att.url) {
      const stream = await getStreamFromUrl(att.url);
      return { stream, mimetype: att.mimetype || "application/octet-stream", ext: extFromMime(att.mimetype) };
    }
    if (att && api && api.downloadMedia) {
      try {
        const buf = await api.downloadMedia(event.raw || event);
        const stream = Readable.from(buf);
        return { stream, mimetype: att.mimetype || "application/octet-stream", ext: extFromMime(att.mimetype) };
      } catch (err) {
        console.error("Download media error (event):", err);
      }
    }
  }
  if (url) {
    const stream = await getStreamFromUrl(url);
    return { stream, mimetype: "application/octet-stream", ext: "bin" };
  }
  return null;
}
module.exports.getAttachmentStream = getAttachmentStream;

function extFromMime(mime) {
  if (!mime) return "bin";
  const map = {
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
    "video/mp4": "mp4", "video/webm": "webm",
    "audio/ogg": "ogg", "audio/mp4": "m4a", "audio/mpeg": "mp3",
    "application/pdf": "pdf",
  };
  return map[mime.split(";")[0].trim()] || "bin";
}
module.exports.extFromMime = extFromMime;

function getTargetUser(event, args = []) {
  const replied = getMessageReply(event);
  if (event.mentions && event.mentions.length > 0) {
    return event.mentions[0];
  }
  if (replied && replied.senderID) {
    return replied.senderID;
  }
  if (args[0]) {
    const candidate = String(args[0]).replace("@", "").trim();
    if (/^\d{7,}$/.test(candidate)) return candidate + "@s.whatsapp.net";
    if (candidate.includes("@s.whatsapp.net") || candidate.includes("@g.us")) return candidate;
  }
  return event.senderID;
}
module.exports.getTargetUser = getTargetUser;

async function getAvatar(api, uid) {
  try {
    return await api.getProfilePicture(uid);
  } catch (_) {
    return null;
  }
}
module.exports.getAvatar = getAvatar;

function buildMessage(api, event) {
  const threadID = event.threadID;
  const rawMsg = event.raw || null;

  return {
    async reply(msgOrObj, cb) {
      const content = normalizeContent(msgOrObj);
      // message.reply() should quote the message that triggered the command,
      // not the message that the user may have quoted. The Baileys adapter
      // converts replyToMessage into the native `quoted` option.
      const replyTarget = rawMsg;
      const opts = replyTarget ? { replyToMessage: replyTarget } : {};
      const sent = await api.sendMessage(content, threadID, opts).catch((e) => { if (cb) cb(e, null); throw e; });

      const info = {
        messageID: sent?.key?.id || sent?.id || (Array.isArray(sent) && sent[0]?.key?.id) || null,
        threadID,
        sent,
      };

      if (typeof cb === "function") cb(null, info);
      return info;
    },

    async send(msgOrObj, tid, cb) {
      if (typeof tid === "function") { cb = tid; tid = null; }
      tid = tid || threadID;
      const content = normalizeContent(msgOrObj);
      const sent = await api.sendMessage(content, tid).catch((e) => { if (cb) cb(e, null); throw e; });
      const info = { messageID: sent?.key?.id || null, threadID: tid, sent };
      if (typeof cb === "function") cb(null, info);
      return info;
    },

    async react(emoji, msgID) {
      try {
        let key;
        if (!msgID || msgID === event.messageID) {
          key = (rawMsg && rawMsg.key) ? rawMsg.key : { remoteJid: threadID, id: event.messageID, fromMe: false };
        } else {
          key = { remoteJid: threadID, id: msgID, fromMe: false };
        }
        return await api.reactToMessage(threadID, key, emoji);
      } catch (_) { }
    },

    async unsend(msgID) {
      try {
        const id = msgID || event.messageID;
        const key = { remoteJid: threadID, id, fromMe: true };
        return await api.deleteMessage(threadID, key, true);
      } catch (_) { }
    },

    async edit(msgID, newText) {
      try {
        return await api.editMessage(threadID, msgID, newText);
      } catch (_) { }
    },

    async typing(tid) {
      try {
        return await api.sendTypingIndicator(tid || threadID, 3000);
      } catch (_) { }
    },
  };
}
module.exports.buildMessage = buildMessage;

function normalizeContent(msgOrObj) {
  if (typeof msgOrObj === "string") return { body: msgOrObj };
  if (msgOrObj && typeof msgOrObj === "object") {
    if (msgOrObj.body || msgOrObj.text || msgOrObj.attachment || msgOrObj.location || msgOrObj.sticker) {
      return msgOrObj;
    }
  }
  return msgOrObj || { body: "" };
}
module.exports.normalizeContent = normalizeContent;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
module.exports.sleep = sleep;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
module.exports.ensureDir = ensureDir;

function jidToPhone(jid) {
  if (!jid) return "";
  return String(jid).split("@")[0].split(":")[0];
}
module.exports.jidToPhone = jidToPhone;

function pickContactName(contact) {
  if (!contact || typeof contact !== "object") return "";
  return contact.name || contact.notify || contact.verifiedName || contact.pushName || "";
}

async function resolveUserDisplayName(api, uid, userData) {
  const raw = String(uid || "");
  if (!raw) return "";

  const bare = jidToPhone(raw);
  const candidates = Array.from(new Set([
    raw,
    bare,
    bare ? bare + "@s.whatsapp.net" : "",
    bare ? bare + "@lid" : "",
  ].filter(Boolean)));

  const getUser = userData || (global.GoatBot && global.GoatBot.DB && global.GoatBot.DB.userData);
  if (typeof getUser === "function") {
    for (const key of candidates) {
      try {
        const u = await getUser(key);
        if (u && u.name && u.name !== "Unknown") return u.name;
      } catch (_) { }
    }
  }

  const sock = (api && api.sock) || (global.GoatBot && global.GoatBot.api && global.GoatBot.api.sock);
  const contacts = (sock && (sock.contacts || (sock.store && sock.store.contacts))) || {};
  for (const key of candidates) {
    const name = pickContactName(contacts[key]);
    if (name) return name;
  }
  for (const [contactJid, contact] of Object.entries(contacts)) {
    if (
      contactJid === raw ||
      contactJid === bare ||
      jidToPhone(contactJid) === bare ||
      contact?.id === raw ||
      contact?.lid === raw ||
      jidToPhone(contact?.id || "") === bare ||
      jidToPhone(contact?.lid || "") === bare
    ) {
      const name = pickContactName(contact);
      if (name) return name;
    }
  }

  return bare || raw;
}
module.exports.resolveUserDisplayName = resolveUserDisplayName;

async function getLiveMemberName(api, uid, userData) {
  let name = await resolveUserDisplayName(api, uid, userData).catch(() => "");
  const bare = jidToPhone(uid);
  if (!name || name === bare || /^\d+$/.test(name)) {
    try {
      const info = await api.getUserInfo(uid);
      const entry = Array.isArray(info) ? info[0] : (info && (info[uid] || Object.values(info)[0]));
      const fetched = entry?.name || entry?.pushName || entry?.notify || "";
      if (fetched) name = fetched;
    } catch (_) { }
  }
  return name || bare || uid;
}
module.exports.getLiveMemberName = getLiveMemberName;


function humanDuration(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}
module.exports.humanDuration = humanDuration;



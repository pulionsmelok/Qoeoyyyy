const fs = require("fs");
const path = require("path");

const { config } = global.GoatBot;

function normalizePhone(raw) {
  if (!raw) return null;
  return String(raw).replace(/@.*$/, "").replace(/:.*$/, "").replace(/\D/g, "");
}

function resolveTarget(event, args) {
  const mentions = event.mentions;
  if (mentions && mentions.length > 0) {
    return normalizePhone(mentions[0]);
  }
  const replied = event.messageReply || event.replyToMessage;
  if (replied && replied.senderID) return normalizePhone(replied.senderID);
  const num = args.find((a) => /^\d{6,}$/.test(a));
  if (num) return normalizePhone(num);
  return null;
}

module.exports = {
  config: {
    name: "whitelist",
    aliases: ["wl"],
    version: "1.5.0",
    author: "SK-SIDDIK-KHAN",
    countDown: 3,
    role: 2,
    shortDescription: "Manage bot whitelist",
    category: "admin",
    guide: {
      en:
        "   {pn} on/off      — turn whitelist mode on or off\n" +
        "   {pn} list        — list all whitelisted users\n" +
        "   {pn} add @user   — add a user to the whitelist\n" +
        "   {pn} remove @user— remove a user from the whitelist",
    },
  },

  onStart: async ({ event, args, message, api }) => {
    if (!config.featureBox) config.featureBox = {};
    const fb = config.featureBox;

    const wlUsers = fb.whitelistUIDs || [];
    const sub = (args[0] || "").toLowerCase();

    if (sub === "on") {
      fb.whitelistMode = true;
      fs.writeFileSync(
        global.client.dirConfig,
        JSON.stringify(config, null, 2),
        "utf8",
      );
      return message.reply(
        "✅ Whitelist mode is now ON. Only whitelisted users and admins can use the bot.",
      );
    }

    if (sub === "off") {
      fb.whitelistMode = false;
      fs.writeFileSync(
        global.client.dirConfig,
        JSON.stringify(config, null, 2),
        "utf8",
      );
      return message.reply(
        "✅ Whitelist mode is now OFF. Anyone can use the bot.",
      );
    }

    if (!sub || sub === "list") {
      if (wlUsers.length === 0)
        return message.reply("❌ No users in the whitelist.");

      let msg = `📜 *WHITELISTED USERS (${wlUsers.length})*\n${"─".repeat(25)}\n`;
      const mentions = [];
      for (let i = 0; i < wlUsers.length; i++) {
        const id = String(wlUsers[i]);
        const isLid = /^[12]\d{14}$/.test(id);
        const jid = id + (isLid ? "@lid" : "@s.whatsapp.net");
        mentions.push(jid);

        let name = "Unknown";
        if (global.utils && global.utils.resolveUserDisplayName) {
          name = await global.utils.resolveUserDisplayName(
            api,
            jid,
            global.GoatBot.DB.userData,
          );
        }
        if (!name || name === "Unknown" || name.match(/^\d+$/)) {
          const userData = await global.GoatBot.DB.userData(id);
          name = userData ? userData.name : "Unknown";
        }

        msg += `${i + 1}. @${id} (${id})\n`;
      }
      msg += `\n${"─".repeat(25)}\n`;
      msg += `📌 *Status:* ${fb.whitelistMode ? "ON ✅" : "OFF ❌"}\n`;
      return message.reply({ body: msg, mentions });
    }

    if (sub === "add") {
      const target = resolveTarget(event, args.slice(1));
      if (!target) {
        return message.reply(
          "❌ Please @mention, reply to, or provide a phone number to add.",
        );
      }
      if (wlUsers.includes(target)) {
        return message.reply(`⚠️ *+${target}* is already in the whitelist.`);
      }
      wlUsers.push(target);
      fb.whitelistUIDs = wlUsers;
      fs.writeFileSync(
        global.client.dirConfig,
        JSON.stringify(config, null, 2),
        "utf8",
      );

      const targetStr = String(target);
      const isLid = /^[12]\d{14}$/.test(targetStr);
      const targetJid = targetStr + (isLid ? "@lid" : "@s.whatsapp.net");

      return message.reply({
        body: `✅ *@${target} (${target})* has been added to the whitelist.`,
        mentions: [targetJid],
      });
    }

    if (sub === "remove" || sub === "del" || sub === "delete") {
      const target = resolveTarget(event, args.slice(1));
      if (!target) {
        return message.reply(
          "❌ Please @mention, reply to, or provide a phone number to remove.",
        );
      }
      const idx = wlUsers.indexOf(target);
      if (idx === -1) {
        return message.reply(`⚠️ *+${target}* is not in the whitelist.`);
      }
      wlUsers.splice(idx, 1);
      fb.whitelistUIDs = wlUsers;
      fs.writeFileSync(
        global.client.dirConfig,
        JSON.stringify(config, null, 2),
        "utf8",
      );

      const targetStr = String(target);
      const isLid = /^[12]\d{14}$/.test(targetStr);
      const targetJid = targetStr + (isLid ? "@lid" : "@s.whatsapp.net");

      return message.reply({
        body: `✅ *@${target} (${target})* has been removed from the whitelist.`,
        mentions: [targetJid],
      });
    }

    return message.reply(
      "❓ Unknown action. Usage:\n" +
        "   `.whitelist on/off` — toggle whitelist mode\n" +
        "   `.whitelist list`   — list whitelisted users\n" +
        "   `.whitelist add`    — add user\n" +
        "   `.whitelist remove` — remove user",
    );
  },
};

const fs = require("fs");
const path = require("path");
const CONFIG_PATH = path.resolve(process.cwd(), "config.json");

module.exports = {
  config: {
    name: "supportgc",
    aliases: ["support", "sgc"],
    version: "1.5.0",
    author: "SK-SIDDIK-KHAN",
    role: 0,
    countDown: 5,
    shortDescription: "Add user to support group or get invite link",
    longDescription:
      "Adds the user to the bot's official support group chat, or provides the invite link if direct add fails. Admins can configure the support group.",
    category: "utility",
    guide: {
      en: "{pn}\n{pn} link\n{pn} set [group_JID]",
    },
  },

  onStart: async ({ api, event, args, message }) => {
    const { threadID, senderID } = event;

    let config = {};
    try {
      config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    } catch (_) {}

    const botAdmins = config.adminBot || [];
    const isBotAdmin = botAdmins.some((a) => {
      const bareAdmin = a.split(":")[0].split("@")[0];
      const bareSender = senderID.split(":")[0].split("@")[0];
      return bareAdmin === bareSender;
    });

    const subCmd = args[0] && args[0].toLowerCase();

    if (subCmd === "set") {
      if (!isBotAdmin) {
        return message.reply("⛔ Only Bot Admins can set the support group.");
      }

      let targetGroupID = args[1];
      if (!targetGroupID) {
        if (event.isGroup) {
          targetGroupID = threadID;
        } else {
          return message.reply(
            "❌ Please provide a group JID, or run this command inside the group you want to set.",
          );
        }
      }

      if (!targetGroupID.includes("@g.us")) {
        targetGroupID += "@g.us";
      }

      config.supportGroupID = targetGroupID;
      try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
        if (global.GoatBot && global.GoatBot.config) {
          global.GoatBot.config.supportGroupID = targetGroupID;
        }
        return message.reply(
          `✅ Support group successfully configured to:\nJID: *${targetGroupID}*`,
        );
      } catch (e) {
        return message.reply(`❌ Failed to update config: ${e.message}`);
      }
    }

    const supportGroupID =
      config.supportGroupID ||
      (global.GoatBot &&
        global.GoatBot.config &&
        global.GoatBot.config.supportGroupID);
    if (!supportGroupID) {
      return message.reply(
        "❌ Support group is not configured yet.\n" +
          "Bot admins can set it by running: *!supportgc set [group_JID]* or simply *!supportgc set* inside the support group.",
      );
    }

    const sock = api.sock || (api.ctx && api.ctx.sock);
    if (!sock) {
      return message.reply("❌ Connection error: Baileys socket not ready.");
    }

    if (subCmd === "link") {
      try {
        const code = await sock.groupInviteCode(supportGroupID);
        if (code) {
          return message.reply(
            `🔗 *Support Group Invite Link:*\nhttps://chat.whatsapp.com/${code}`,
          );
        }
      } catch (err) {
        return message.reply(
          `❌ Failed to generate invite link: ${err.message}\nMake sure the bot is an admin in the support group.`,
        );
      }
    }

    const userJID = senderID.includes("@")
      ? senderID
      : senderID.split(":")[0] + "@s.whatsapp.net";
    const phone = userJID.split("@")[0].split(":")[0];

    try {
      message.reply("⏳ Attempting to add you to the support group...");

      await sock.groupParticipantsUpdate(supportGroupID, [userJID], "add");
      return message.reply("✅ Successfully added you to the Support Group!");
    } catch (e) {
      try {
        const code = await sock.groupInviteCode(supportGroupID);
        if (code) {
          return message.reply(
            `⚠️ Could not add you directly (this may be due to your privacy settings or invite limits).\n\n` +
              `🔗 *Please use the invite link to join:*\nhttps://chat.whatsapp.com/${code}`,
          );
        }
      } catch (linkErr) {
        return message.reply(
          `❌ Failed to add you and could not generate invite link.\n` +
            `Please make sure the bot is configured as an admin in the support group.`,
        );
      }
    }
  },
};

const axios = require("axios");

module.exports = {
  config: {
    name: "user",
    version: "1.5.0",
    author: "SK-SIDDIK-KHAN",
    countDown: 5,
    role: 0,
    shortDescription: "View user profile/data from database",
    longDescription:
      "Shows a user's stored data: name, money, EXP, ban status, warnings, etc.",
    category: "info",
    guide: { en: "{pn} [@mention | reply | uid]" },
  },

  onStart: async ({ api, event, args, message }) => {
    if (!global.GoatBot.DB)
      return message.reply("❌ Database not initialized.");

    const targetUID = getTargetUser(event, args);
    const phone = jidToPhone(targetUID);

    await message.react("⏳");

    let user;
    try {
      user = await global.GoatBot.DB.userData(targetUID);
    } catch (e) {
      await message.react("❌");
      return message.reply("❌ Failed to fetch user data: " + e.message);
    }

    const resolvedName = await global.utils.resolveUserDisplayName(
      api,
      targetUID,
      global.GoatBot.DB.userData,
    );
    const name =
      resolvedName && resolvedName !== "Unknown"
        ? resolvedName
        : user.name !== "Unknown"
          ? user.name
          : "Unknown";

    if (name !== "Unknown" && user.name !== name) {
      try {
        await global.GoatBot.DB.users.set(targetUID, name, "name");
      } catch (e) {}
    }

    const money = user.money || 0;
    const exp = user.exp || 0;
    const isBan = user.isBan ? "Yes ⛔" : "No ✅";
    const warns = user.warnCount || 0;

    const rawNumber = targetUID.split("@")[0].split(":")[0];
    const mentionPhone = "@" + rawNumber;

    let role = "Member";
    if (event.isGroup) {
      try {
        const thread = await global.GoatBot.DB.threadsData(event.threadID);
        if (thread && thread.adminIDs && thread.adminIDs.includes(targetUID)) {
          role = "Group Admin 🛡️";
        }
      } catch (e) {}
    }

    const msgCount = user.msgCount || user.exp || 0;
    const level = Math.floor(Math.sqrt(msgCount / 5));

    let text = `👤 *User Profile*\n`;
    text += `Name: ${name}\n`;
    text += `Phone: ${mentionPhone}\n`;
    text += `JID: ${targetUID}\n\n`;
    text += `💰 Money: ${money}\n`;
    text += `⭐ EXP: ${exp}\n`;
    text += `🚫 Banned: ${isBan}\n`;
    text += `⚠️ Warnings: ${warns}\n\n`;

    text += `📊 *STATISTICS*\n`;
    text += `Messages Sent: ${msgCount.toLocaleString()}\n`;
    text += `Current Level: ${level}\n`;
    text += `Role: ${role}`;

    if (user.isBan && user.banReason) {
      text += `\n📋 Ban Reason: ${user.banReason} `;
    }
    if (warns > 0 && user.warnReason && user.warnReason.length > 0) {
      text += `\n📝 Warn Reasons: ${user.warnReason.join(", ")} `;
    }

    let targetUrl = null;
    try {
      targetUrl = await global.db.usersData.getAvatarUrl(api, targetUID);
    } catch (e) {}

    await message.react("✅");
    if (targetUrl) {
      return api.sendImage(targetUrl, event.threadID, text, {
        mentions: [targetUID],
      });
    } else {
      return api.sendMessage(
        { body: text, mentions: [targetUID] },
        event.threadID,
      );
    }
  },
};

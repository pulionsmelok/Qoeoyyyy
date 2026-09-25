module.exports = {
  config: {
    name: "ban",
    version: "1.5.0",
    author: "SK-SIDDIK-KHAN",
    countDown: 5,
    role: 2,
    shortDescription: "Ban or unban a user",
    longDescription:
      "Bans or unbans a user from using bot commands. Admins only.",
    category: "admin",
    guide: {
      en: "{pn} [@mention | reply | uid] [reason]\n{pn} unban [@mention | reply | uid]\n{pn} list",
    },
  },

  onStart: async ({ api, event, args, message }) => {
    const usersData = global.db && global.db.usersData;
    if (!usersData) return message.reply("❌ Database not initialized.");

    const subCmd = args[0] && args[0].toLowerCase();

    if (subCmd === "list") {
      const allUsers = await usersData.getAll();
      const bannedUsers = allUsers.filter((u) => u.isBan);

      if (bannedUsers.length === 0) {
        return message.reply("✅ No banned users found.");
      }

      let msg = `🚫 *BANNED USERS (${bannedUsers.length})*\n${"─".repeat(25)}\n\n`;
      const mentions = [];

      for (let i = 0; i < bannedUsers.length; i++) {
        const user = bannedUsers[i];
        const phone = global.utils.jidToPhone(user.userID);
        mentions.push(user.userID);
        msg += `${i + 1}. @${phone} (${phone})${user.banReason ? `\n📋 Reason: ${user.banReason}` : ""}\n\n`;
      }
      msg += `${"─".repeat(25)}`;

      return message.reply({ body: msg, mentions });
    }

    const isUnban = subCmd === "unban";
    const relevantArgs = isUnban ? args.slice(1) : args;

    const targetUID = getTargetUser(event, relevantArgs);
    const senderNum = global.utils.jidToPhone(targetUID);

    let targetName = "";
    if (global.utils && global.utils.resolveUserDisplayName) {
      targetName =
        (await global.utils.resolveUserDisplayName(
          api,
          targetUID,
          usersData,
        )) || "";
    } else {
      const u = await usersData.get(targetUID);
      targetName = u ? u.name : "";
    }
    const nameParts = targetName.toLowerCase().split(/\s+/);

    const reasonWords = relevantArgs.filter((a) => {
      if (/^\d{7,}$/.test(a)) return false;
      if (a.startsWith("@")) return false;
      if (nameParts.includes(a.toLowerCase())) return false;
      return true;
    });
    const reason = reasonWords.join(" ");

    if (targetUID === event.senderID)
      return message.reply(
        `❌ You cannot ${isUnban ? "unban" : "ban"} yourself.`,
      );

    if (isUnban) {
      await usersData.set(targetUID, { isBan: false, banReason: "" });
      return message.reply({
        body: `✅ @${senderNum} has been unbanned.`,
        mentions: [targetUID],
      });
    }

    const adminList = global.GoatBot.config.adminBot || [];
    if (adminList.includes(targetUID))
      return message.reply("❌ You cannot ban a bot admin.");

    await usersData.set(targetUID, { isBan: true, banReason: reason });

    const reasonText = reason ? `\n📋 Reason: ${reason}` : "";
    return message.reply({
      body: `✅ @${senderNum} has been banned.${reasonText}`,
      mentions: [targetUID],
    });
  },
};

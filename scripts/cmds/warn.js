module.exports = {
  config: {
    name: "warn",
    version: "1.5.0",
    author: "SK-SIDDIK-KHAN",
    countDown: 5,
    role: 1,
    shortDescription: "Warn or unwarn a user",
    longDescription:
      "Issues a warning to a user. Admins only. Accumulated warns can trigger auto-ban.",
    category: "admin",
    guide: {
      en: "{pn} [@mention | reply | uid] [reason]\n{pn} unwarn [@mention | reply | uid]\n{pn} list",
    },
  },

  onStart: async ({ api, event, args, message }) => {
    const usersData = global.db && global.db.usersData;
    if (!usersData) return message.reply("❌ Database not initialized.");

    const subCmd = args[0] && args[0].toLowerCase();

    if (subCmd === "list") {
      const allUsers = await usersData.getAll();
      const warnedUsers = allUsers.filter(
        (u) => u.warnCount && u.warnCount > 0,
      );

      if (warnedUsers.length === 0) {
        return message.reply("✅ No warned users found.");
      }

      let msg = `⚠️ *WARNED USERS (${warnedUsers.length})*\n${"─".repeat(25)}\n\n`;
      const mentions = [];

      for (let i = 0; i < warnedUsers.length; i++) {
        const user = warnedUsers[i];
        const jidNum = user.userID.replace(/[^0-9]/g, "");
        mentions.push(user.userID);
        msg += `${i + 1}. @${jidNum}\n🔢 Total Warnings: ${user.warnCount}${user.warnReason && user.warnReason.length > 0 ? `\n📋 Last Reason: ${user.warnReason[user.warnReason.length - 1]}` : ""}\n\n`;
      }
      msg += `${"─".repeat(25)}`;

      return message.reply({ body: msg, mentions });
    }

    const isUnwarn = subCmd === "unwarn";
    const relevantArgs = isUnwarn ? args.slice(1) : args;

    let targetUID = getTargetUser(event, relevantArgs);

    if (targetUID === event.senderID)
      return message.reply(
        `❌ You cannot ${isUnwarn ? "unwarn" : "warn"} yourself.`,
      );

    if (targetUID && !targetUID.includes("@")) {
      targetUID += "@s.whatsapp.net";
    }

    try {
      const groupInfo = await api.getGroupInfo(event.threadID);
      const participant = groupInfo.participants.find(
        (p) =>
          p.id === targetUID ||
          p.phoneNumber === targetUID ||
          p.id.split("@")[0] === targetUID.split("@")[0],
      );
      if (participant && participant.phoneNumber) {
        targetUID = participant.phoneNumber;
      } else if (participant && participant.id) {
        targetUID = participant.id;
      }
    } catch (_) {}

    const jidNum = targetUID.replace(/[^0-9]/g, "");

    if (isUnwarn) {
      await usersData.set(targetUID, { warnCount: 0, warnReason: [] });
      return message.reply({
        body: `✅ @${jidNum} has been unwarned.`,
        mentions: [targetUID],
      });
    }

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
    const reason = reasonWords.join(" ") || "No reason provided";

    const user = await usersData.get(targetUID);
    const newCount = (user.warnCount || 0) + 1;
    const reasons = [...(user.warnReason || []), reason];

    await usersData.set(targetUID, {
      warnCount: newCount,
      warnReason: reasons,
    });

    if (newCount >= 3) {
      let kickedMsg = "";
      try {
        const groupInfo = await api.getGroupInfo(event.threadID);
        const groupAdmins = groupInfo.participants
          .filter((p) => p.admin === "admin" || p.admin === "superadmin")
          .flatMap((p) => [p.id, p.phoneNumber].filter(Boolean));
        const sock = global.GoatBot.api.sock;
        const botBareJid =
          (global.GoatBot.config.phoneNumber ||
            (api.getCurrentUserID
              ? api.getCurrentUserID().split(":")[0].split("@")[0]
              : sock.user.id.split(":")[0].split("@")[0])) + "@s.whatsapp.net";
        const botLid = sock.user ? sock.user.lid : "";
        const botIsGroupAdmin =
          groupAdmins.includes(botBareJid) ||
          (botLid && groupAdmins.includes(botLid));

        if (botIsGroupAdmin) {
          await api.kickUser(event.threadID, targetUID);
        } else {
          kickedMsg =
            "\n⚠️ Bot is not an admin, so the user was not kicked. Please make the bot an admin to automatically kick warned members.";
        }
      } catch (e) {
        kickedMsg = "\n⚠️ Failed to kick user (bot might not be admin).";
      }

      // Add to threadban so they get kicked if they try to join again
      try {
        const threadsData = global.db && global.db.threadsData;
        if (threadsData) {
          const threadData = await threadsData.get(event.threadID);
          const bannedData = threadData.banned || {};
          bannedData[targetUID] = {
            reason: "Reached 3 warnings",
            timestamp: Date.now(),
            author: event.senderID,
          };
          await threadsData.set(event.threadID, { banned: bannedData });
        }
      } catch (_) {}

      return message.reply({
        body: `⚠️ @${jidNum} has reached 3 warnings and has been kicked from the group.${kickedMsg}`,
        mentions: [targetUID],
      });
    }

    return message.reply({
      body: `⚠️ @${jidNum} has been warned.\n📋 Reason: ${reason}\n🔢 Total Warnings: ${newCount}\n\nIf this member reaches 3 warnings, they will be kicked and banned.`,
      mentions: [targetUID],
    });
  },
};

module.exports = {
  config: {
    name: "threadban",
    aliases: ["tban", "groupban"],
    version: "1.5.0",
    author: "SK-SIDDIK-KHAN",
    countDown: 5,
    role: 2,
    shortDescription: "Ban or unban a user from the group",
    longDescription:
      "Bans or unbans a user from using the bot in the current group. If the bot is a group admin, it will also kick the user immediately and auto-kick them if they join again.",
    category: "group",
    guide: {
      en: "{pn} [@mention | reply | uid] [reason]\n{pn} unban [@mention | reply | uid]\n{pn} check\n{pn} list",
    },
  },

  onStart: async ({ api, event, args, message }) => {
    const { threadID, senderID } = event;
    if (!event.isGroup)
      return message.reply("❌ This command can only be used in groups.");

    const threadsData = global.db && global.db.threadsData;
    const usersData = global.db && global.db.usersData;
    if (!threadsData || !usersData)
      return message.reply("❌ Database not initialized.");

    // Check permissions (Group Admin or Bot Admin)
    let isGroupAdmin = false;
    let isBotAdmin = false;
    try {
      const groupInfo = await api.getGroupInfo(threadID);
      const groupAdmins = groupInfo.participants
        .filter((p) => p.admin === "admin" || p.admin === "superadmin")
        .flatMap((p) => [p.id, p.phoneNumber].filter(Boolean));
      const senderBareJid =
        senderID.split(":")[0].split("@")[0] + "@s.whatsapp.net";
      isGroupAdmin =
        groupAdmins.includes(senderBareJid) || groupAdmins.includes(senderID);

      const botAdmins = global.GoatBot.config.adminBot || [];
      isBotAdmin = botAdmins.some(
        (a) =>
          a.split(":")[0].split("@")[0] + "@s.whatsapp.net" === senderBareJid,
      );
    } catch (_) {}

    if (!isGroupAdmin && !isBotAdmin) {
      return message.reply("⛔ This command is for group admins only.");
    }

    const subCmd = args[0] && args[0].toLowerCase();

    if (subCmd === "check") {
      const thread = await threadsData.get(threadID);
      const bannedObj = (thread && thread.banned) || {};
      const bannedUIDs = Object.keys(bannedObj);

      if (bannedUIDs.length === 0) {
        return message.reply("✅ No thread-banned users in this group.");
      }

      if (!isBotAdmin)
        return message.reply(
          "⚠️ Bot needs admin permission to kick banned members.",
        );

      try {
        const groupInfo = await api.getGroupInfo(threadID);
        const participants = groupInfo.participants.flatMap((p) =>
          [p.id, p.phoneNumber].filter(Boolean),
        );
        let count = 0;
        for (const uid of bannedUIDs) {
          if (
            participants.includes(uid) ||
            participants.includes(
              uid.replace(/[^0-9]/g, "") + "@s.whatsapp.net",
            )
          ) {
            await api.kickUser(threadID, uid);
            count++;
          }
        }
        return message.reply(
          count > 0
            ? `✅ Checked and kicked ${count} banned member(s).`
            : `✅ Checked banned members, none of them are currently in the group.`,
        );
      } catch (e) {
        return message.reply("⚠️ Failed to check/kick members.");
      }
    }

    if (subCmd === "list") {
      const thread = await threadsData.get(threadID);
      const bannedObj = (thread && thread.banned) || {};
      const bannedUIDs = Object.keys(bannedObj);

      if (bannedUIDs.length === 0) {
        return message.reply("✅ No thread-banned users in this group.");
      }

      let msg = `🚫 *THREAD BANNED USERS (${bannedUIDs.length})*\n${"─".repeat(25)}\n\n`;
      const mentions = [];

      for (let i = 0; i < bannedUIDs.length; i++) {
        const uid = bannedUIDs[i];
        const banInfo = bannedObj[uid];
        const phone = uid.replace(/[^0-9]/g, "");
        mentions.push(uid);
        msg += `${i + 1}. @${phone} (${phone})${banInfo.reason ? "\n📋 Reason: " + banInfo.reason : ""}\n\n`;
      }
      msg += `${"─".repeat(25)}`;

      return message.reply({ body: msg, mentions });
    }

    const isUnban = subCmd === "unban";
    const relevantArgs = isUnban ? args.slice(1) : args;

    // We expect global.getTargetUser to be available (injected by GoatBot V2 utils)
    let targetUID =
      typeof getTargetUser === "function"
        ? getTargetUser(event, relevantArgs)
        : (event.mentions && Object.keys(event.mentions)[0]) ||
          (event.messageReply && event.messageReply.senderID) ||
          relevantArgs[0];

    if (!targetUID)
      return message.reply(
        "❌ Please mention, reply to, or provide the UID of the user.",
      );

    // Resolve all JIDs associated with target user (LID and phone JID)
    let targetUIDsToBan = [targetUID];
    try {
      const groupInfo = await api.getGroupInfo(threadID);
      const targetNormalized = targetUID.replace("@", "").split(":")[0];
      const participant = groupInfo.participants.find((p) => {
        const pid = p.id || p.userID || "";
        const pNum = p.phoneNumber || "";
        return (
          pid.includes(targetNormalized) || pNum.includes(targetNormalized)
        );
      });
      if (participant) {
        if (participant.id) targetUIDsToBan.push(participant.id);
        if (participant.phoneNumber)
          targetUIDsToBan.push(participant.phoneNumber);
      }
    } catch (_) {}

    targetUIDsToBan = targetUIDsToBan
      .map((id) => {
        if (typeof id !== "string") return "";
        id = id.trim();
        if (!id) return "";
        if (!id.includes("@")) {
          return id.split(":")[0] + "@s.whatsapp.net";
        }
        return id;
      })
      .filter(Boolean);
    targetUIDsToBan = [...new Set(targetUIDsToBan)];

    if (targetUIDsToBan.length === 0) {
      return message.reply(
        "❌ Please mention, reply to, or provide a valid WhatsApp JID.",
      );
    }

    // Set targetUID as the first JID resolved
    targetUID = targetUIDsToBan[0];
    const senderNum = targetUID.split("@")[0].split(":")[0];

    // Smart reason extraction to avoid mention tags and names
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

    if (targetUIDsToBan.includes(event.senderID))
      return message.reply(
        `❌ You cannot ${isUnban ? "unban" : "thread-ban"} yourself.`,
      );

    const threadData = await threadsData.get(threadID);
    const bannedData = threadData.banned || {};

    // UNBAN
    if (isUnban) {
      const normalize = (id) => id.split(":")[0].split("@")[0];
      const toRemove = targetUIDsToBan.map(normalize);

      let removedAny = false;
      for (const key of Object.keys(bannedData)) {
        if (toRemove.includes(normalize(key))) {
          delete bannedData[key];
          removedAny = true;
        }
      }

      if (!removedAny)
        return message.reply(`⚠️ @${senderNum} is not thread-banned.`, {
          mentions: targetUIDsToBan,
        });
      await threadsData.set(threadID, { banned: bannedData });
      return message.reply({
        body: `✅ @${senderNum} has been unbanned from this thread.`,
        mentions: targetUIDsToBan,
      });
    }

    // Prevent banning bot admins
    const botAdminsList = global.GoatBot.config.adminBot || [];
    const isTargetBotAdmin = targetUIDsToBan.some((tUid) =>
      botAdminsList.some(
        (a) => (a.includes("@") ? a : a + "@s.whatsapp.net") === tUid,
      ),
    );
    if (isTargetBotAdmin)
      return message.reply("❌ You cannot thread-ban a bot admin.");

    // BAN
    for (const uid of targetUIDsToBan) {
      bannedData[uid] = {
        reason: reason || "",
        timestamp: Date.now(),
        author: senderID,
      };
    }
    await threadsData.set(threadID, { banned: bannedData });

    // Kick immediately if bot is admin
    let kickedMsg = "";
    let kickedCount = 0;
    for (const uid of targetUIDsToBan) {
      try {
        await api.kickUser(threadID, uid);
        kickedCount++;
      } catch (e) {
        // Failed or user not in group
      }
    }
    if (kickedCount === 0) {
      kickedMsg =
        "\n⚠️ Failed to kick user. Please make sure the bot is a group admin.";
    }

    const reasonText = reason ? "\n📋 Reason: " + reason : "";
    return message.reply({
      body: `✅ @${senderNum} has been thread-banned.${reasonText}${kickedMsg}`,
      mentions: targetUIDsToBan,
    });
  },

  onChat: async function ({ api, event, threadsData }) {
    if (!event.isGroup || !event.senderID) return;
    const { threadID, senderID } = event;

    try {
      const thread = await threadsData.get(threadID);
      const bannedData = (thread && thread.banned) || {};
      if (Object.keys(bannedData).length === 0) return;

      const normalize = (id) => {
        if (typeof id !== "string") return "";
        return id.split(":")[0].split("@")[0];
      };

      const senderKey = normalize(senderID);
      const bannedUID = Object.keys(bannedData).find(
        (bUid) => normalize(bUid) === senderKey,
      );

      if (bannedUID) {
        const reason = bannedData[bannedUID].reason || "No reason";
        try {
          await api.kickUser(threadID, bannedUID);
          const phone = senderKey;
          await api.sendMessage(
            {
              body: `⚠️ @${phone} is thread-banned from this group and has been automatically kicked.\n📋 Reason: ${reason}`,
              mentions: [bannedUID],
            },
            threadID,
          );
        } catch (_) {}
      }
    } catch (_) {}
  },

  onEvent: async function ({ api, event, threadsData }) {
    if (event.logMessageType === "log:subscribe" && event.isGroup) {
      const { threadID, participants } = event;
      if (!threadID) return;

      const added = Array.isArray(participants) ? participants : [];
      if (added.length === 0) return;

      let thread = null;
      try {
        thread = await threadsData.get(threadID);
      } catch (_) {}
      const bannedData = (thread && thread.banned) || {};
      if (Object.keys(bannedData).length === 0) return;

      const normalize = (id) => {
        if (typeof id !== "string") return "";
        return id.split(":")[0].split("@")[0];
      };

      for (const rawUid of added) {
        const uid =
          typeof rawUid === "string" ? rawUid : rawUid?.id || rawUid?.jid || "";
        if (!uid) continue;

        const senderKey = normalize(uid);
        const bannedUID = Object.keys(bannedData).find(
          (bUid) => normalize(bUid) === senderKey,
        );

        if (bannedUID) {
          const reason = bannedData[bannedUID].reason || "No reason";
          try {
            await api.kickUser(threadID, bannedUID);
            const phone = senderKey;
            await api.sendMessage(
              {
                body: `⚠️ @${phone} tried to join but is banned from this group!\n📋 Reason: ${reason}\n\nBot has automatically kicked this member.`,
                mentions: [bannedUID],
              },
              threadID,
            );
          } catch (_) {
            const phone = senderKey;
            await api.sendMessage(
              {
                body: `⚠️ Member @${phone} has been banned from this group, but the bot could not kick them. Please make sure the bot is a group admin.`,
                mentions: [bannedUID],
              },
              threadID,
            );
          }
        }
      }
    }
  },
};

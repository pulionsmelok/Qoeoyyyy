const getUID = (p) => (typeof p === "string" ? p : p?.id || p?.jid || "");

module.exports = {
  config: {
    name: "welcome",
    version: "1.5.0",
    author: "SK-SIDDIK-KHAN",
    category: "events",
  },

  onStart: async ({ api, event, threadsData }) => {
    if (event.logMessageType !== "log:subscribe") return;

    const { threadID, participants, isBotAdded } = event;
    if (!threadID) return;

    if (isBotAdded) {
      const cfg = global.GoatBot.config;
      const prefix = cfg.prefix || "!";
      const botName = cfg.botName || "WCA Bot";
      let groupName = "this group";
      try {
        const info = await api.getGroupInfo(threadID);
        groupName = info.subject || info.name || groupName;
      } catch (_) {}
      return api.sendMessage(
        `👋 Hello everyone! I'm *${botName}*, your new assistant bot.\nThank you for adding me to *${groupName}* 🎉\n\nType *${prefix}help* to see all available commands.`,
        threadID,
      );
    }

    const uids = Array.isArray(participants)
      ? participants.map(getUID).filter(Boolean)
      : [];
    if (uids.length === 0) return;

    let thread = null;
    try {
      thread = await threadsData.get(threadID);
    } catch (_) {}
    const groupName =
      (thread && (thread.threadName || thread.name)) || "this group";
    const sendWelcome =
      thread && thread.settings ? thread.settings.sendWelcomeMessage : true;
    if (!sendWelcome) return;

    const bannedData = (thread && thread.banned) || {};
    const normalize = (id) => {
      if (typeof id !== "string") return "";
      return id.split(":")[0].split("@")[0];
    };
    const bannedKeys = Object.keys(bannedData).map(normalize);

    for (const uid of uids) {
      const senderKey = normalize(uid);
      if (bannedKeys.includes(senderKey)) continue;

      const phone = uid.split("@")[0].split(":")[0];
      try {
        await api.sendMessage(
          `👋 Welcome @${phone} to *${groupName}*!\n\nHope you enjoy your stay 🎉`,
          threadID,
          { mentions: [uid] },
        );
      } catch (_) {}
    }
  },
};

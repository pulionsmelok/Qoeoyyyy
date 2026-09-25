const getUID = (p) => (typeof p === "string" ? p : p?.id || p?.jid || "");

module.exports = {
  config: {
    name: "leave",
    version: "1.5.0",
    author: "SK-SIDDIK-KHAN",
    category: "events",
  },

  onStart: async ({ api, event, threadsData, userData }) => {
    if (event.logMessageType !== "log:unsubscribe") return;
    if (!event.isGroup && event.type !== "event") return;

    const { threadID, participants, isBotRemoved } = event;
    if (!threadID) return;

    if (isBotRemoved) return;

    const uids = Array.isArray(participants)
      ? participants.map(getUID).filter(Boolean)
      : [];
    if (uids.length === 0) {
      return;
    }

    let thread = null;
    try {
      thread = await threadsData.get(threadID);
    } catch (_) {}
    const groupName =
      (thread && (thread.threadName || thread.name)) || "the group";
    const sendLeave =
      thread && thread.settings ? thread.settings.sendLeaveMessage : true;
    if (!sendLeave) return;

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
          {
            body: `😢 @${phone} has left ${groupName}. Goodbye! 👋`,
            mentions: [uid],
          },
          threadID,
        );
      } catch (e) {}
    }
  },
};

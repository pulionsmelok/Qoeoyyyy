const MAX_WARNS = 3;

module.exports = {
  config: {
    name: "checkwarn",
    version: "1.5.0",
    author: "SK-SIDDIK-KHAN",
    category: "events",
  },

  /**
   * Runs on every message event — auto-ban users who exceed MAX_WARNS.
   */
  onStart: async ({ api, event, threadsData, userData }) => {
    if (event.type !== "message") return;
    const usersData = global.db && global.db.usersData;
    if (!event.senderID || !usersData) return;

    try {
      const user = await usersData.get(event.senderID);
      if (!user) return;

      if (user.isBan) return;

      if ((user.warnCount || 0) >= MAX_WARNS) {
        await usersData.set(event.senderID, {
          isBan: true,
          banReason: `Auto-banned: exceeded ${MAX_WARNS} warnings`,
        });

        const phone = event.senderID.split(":")[0].split("@")[0];
        try {
          await api.sendMessage(
            `⛔ *${phone}* has been automatically banned after reaching ${MAX_WARNS} warnings.`,
            event.threadID,
          );
        } catch (_) {}
      }
    } catch (_) {}
  },
};

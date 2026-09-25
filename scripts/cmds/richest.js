module.exports = {
  config: {
    name: "richest",
    aliases: ["rich"],
    version: "1.5.0",
    author: "SK-SIDDIK-KHAN",
    countDown: 5,
    role: 0,
    shortDescription: "View richest users",
    longDescription: "View the richest users by their money balance globally.",
    category: "economy",
    guide: { en: "{pn} | {pn} top" },
  },

  onStart: async ({ api, event, message }) => {
    const usersData = global.db && global.db.usersData;
    if (!usersData) return message.reply("❌ Database not initialized.");

    try {
      const allUsers = await usersData.getAll();

      const validUsers = allUsers.filter((u) => u.money && u.money > 0);
      validUsers.sort((a, b) => b.money - a.money);

      if (validUsers.length === 0) {
        return message.reply("📉 No one has any money yet!");
      }

      const topCount = Math.min(10, validUsers.length);
      const topUsers = validUsers.slice(0, topCount);

      let msg = `🏆 *TOP ${topCount} RICHEST USERS* 🏆\n\n`;
      for (let i = 0; i < topUsers.length; i++) {
        const u = topUsers[i];
        let name = u.name;
        if (!name || name === "Unknown") {
          name =
            "+" +
            String(u.userID || "")
              .split("@")[0]
              .split(":")[0];
        }

        let emoji = "🏅";
        if (i === 0) emoji = "🥇";
        else if (i === 1) emoji = "🥈";
        else if (i === 2) emoji = "🥉";

        msg += `${i + 1}. ${emoji} *${name}*\n   💵 Money: ${u.money.toLocaleString()}\n\n`;
      }

      await message.reply(msg);
    } catch (err) {
      console.error(err);
      await message.reply("❌ Error fetching richest users: " + err.message);
    }
  },
};

module.exports = {
  config: {
    name: "ball",
    version: "1.5.0",
    author: "SK-SIDDIK-KHAN",
    countDown: 5,
    role: 0,
    shortDescription: "Check your or another user's balance",
    longDescription:
      "Shows money and ranking data. You can also transfer money to other users.",
    category: "economy",
    guide: {
      en: "{pn} [@mention | reply] | {pn} pay [@mention | reply] <amount>",
    },
  },

  onStart: async ({ api, event, args, message }) => {
    const usersData = global.db && global.db.usersData;
    if (!usersData) return message.reply("❌ Database not initialized.");

    if (args[0] && args[0].toLowerCase() === "pay") {
      const targetUID = getTargetUser(event, args.slice(1));
      if (!targetUID || targetUID === event.senderID) {
        return message.reply(
          "❌ Please tag or reply to someone else to send funds.",
        );
      }

      const amountStr = args.find((a) => !isNaN(a) && a > 0);
      const amount = parseInt(amountStr);
      if (!amount || amount <= 0) return message.reply("❌ Invalid amount.");

      const senderData = await usersData.get(event.senderID);
      const receiverData = await usersData.get(targetUID);

      if ((senderData.money || 0) < amount) {
        return message.reply(
          `❌ You don't have enough money! (Your balance: ${senderData.money || 0})`,
        );
      }

      await usersData.set(event.senderID, {
        money: (senderData.money || 0) - amount,
      });
      await usersData.set(targetUID, {
        money: (receiverData.money || 0) + amount,
      });

      return message.reply(`✅ Successfully transferred ${amount} coins!`);
    }

    const targetUID = getTargetUser(event, args);
    const phone = jidToPhone(targetUID);
    const isSelf = targetUID === event.senderID;

    const user = await usersData.get(targetUID);
    const name = user.name && user.name !== "Unknown" ? user.name : phone;

    return message.reply(
      `💰 *${isSelf ? "Your" : name + "'s"} Balance*\n\n` +
        `💵 Money: ${user.money || 0}`,
    );
  },
};

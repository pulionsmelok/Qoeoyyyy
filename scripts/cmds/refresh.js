module.exports = {
  config: {
    name: "refresh",
    version: "1.5.0",
    author: "SK-SIDDIK-KHAN",
    role: 0,
    shortDescription: "Refresh group or user info",
    category: "group",
    guide: {
      en:
        "   {pn} [thread | group]: refresh information of your group chat\n" +
        "   {pn} group <threadID>: refresh information of group chat by ID\n\n" +
        "   {pn} user: refresh information of your user\n" +
        "   {pn} user [<userID> | @tag]: refresh information of user by ID",
    },
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadsData, usersData } = global.db || global.GoatBot.DB;

    let type = args[0] ? args[0].toLowerCase() : "";

    if (!type) {
      if (event.isGroup) type = "group";
      else type = "user";
    }

    if (type === "group" || type === "thread") {
      const targetID = args[1] || event.threadID;

      try {
        if (!targetID.endsWith("@g.us")) {
          return message.reply("❌ Invalid group ID.");
        }

        const groupMetadata = await api.getGroupInfo(targetID);
        await threadsData.refreshInfo(targetID, groupMetadata);

        return message.reply(
          targetID === event.threadID
            ? "✅ | Refresh information of your group chat successfully!"
            : `✅ | Refresh information of group chat ${targetID} successfully!`,
        );
      } catch (error) {
        return message.reply(
          targetID === event.threadID
            ? "❌ | Error when refreshing information of your group chat.\n" +
                error.message
            : `❌ | Error when refreshing information of group chat ${targetID}.\n` +
                error.message,
        );
      }
    } else if (type === "user") {
      let targetID = event.senderID;
      if (args[1]) {
        if (event.mentions && Object.keys(event.mentions).length > 0) {
          targetID = Object.keys(event.mentions)[0];
        } else {
          targetID = args[1];
        }
      }

      try {
        let newName = "Unknown";
        if (global.utils && global.utils.resolveUserDisplayName) {
          newName = await global.utils.resolveUserDisplayName(
            api,
            targetID,
            usersData,
          );
        }
        if (newName === "Unknown" || !newName) {
          const num = targetID.split(":")[0].split("@")[0];
          const contacts = api.sock?.contacts || {};
          const contact =
            contacts[num + "@s.whatsapp.net"] || contacts[num + "@lid"];
          if (contact)
            newName =
              contact.name ||
              contact.notify ||
              contact.verifiedName ||
              "Unknown";
        }

        await usersData.refreshInfo(targetID, { name: newName });

        return message.reply(
          global.normUID(targetID) === global.normUID(event.senderID)
            ? "✅ | Refresh information of your user successfully!"
            : `✅ | Refresh information of user ${targetID} successfully!`,
        );
      } catch (error) {
        return message.reply(
          global.normUID(targetID) === global.normUID(event.senderID)
            ? "❌ | Error when refreshing information of your user.\n" +
                error.message
            : `❌ | Error when refreshing information of user ${targetID}.\n` +
                error.message,
        );
      }
    } else {
      return message.reply(
        "❌ Invalid syntax. Please use:\n!refresh group [id]\n!refresh user [id|@tag]",
      );
    }
  },
};

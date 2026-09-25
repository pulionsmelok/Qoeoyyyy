module.exports = {
  config: {
    name: "rules",
    version: "1.5.0",
    author: "SK-SIDDIK-KHAN",
    role: 0,
    shortDescription: "Manage group rules",
    longDescription: "Create/view/add/edit/move/delete group rules",
    category: "group",
    guide: {
      en:
        "   {pn} [add | -a] <rule to add>: add rule for group.\n" +
        "   {pn}: view group rules.\n" +
        "   {pn} [edit | -e] <n> <content after edit>: edit rule number n.\n" +
        "   {pn} [move | -m] <stt1> <stt2>: swap position of rule number <stt1> and <stt2>.\n" +
        "   {pn} [delete | -d] <n>: delete rule number n.\n" +
        "   {pn} [remove | -r]: delete all rules of group.",
    },
  },

  onStart: async function ({ api, event, args, message, prefix }) {
    if (!event.isGroup) {
      return message.reply("❌ This command can only be used in groups.");
    }

    const { threadsData } = global.db || global.GoatBot.DB;
    const threadID = event.threadID;
    const senderID = event.senderID;

    const adminList = global.GoatBot.config.adminBot || [];
    const DEV = global.GoatBot.config.DEV || [];
    const isBotAdmin =
      adminList.includes(global.normUID(senderID)) ||
      DEV.includes(global.normUID(senderID));

    let isGroupAdmin = false;
    try {
      const threadInfo = await threadsData.get(threadID);
      isGroupAdmin =
        threadInfo.adminIDs && threadInfo.adminIDs.includes(senderID);
    } catch (_) {}

    const hasPermission = isBotAdmin || isGroupAdmin;

    const type = args[0] ? args[0].toLowerCase() : "";
    const rulesOfThread = await threadsData.get(threadID, "data.rules", []);
    const totalRules = rulesOfThread.length;

    if (!type) {
      if (totalRules === 0) {
        return message.reply(
          `Your group has no rules, to add rules for group use \`${prefix}rules add\``,
        );
      }
      let msg = "📋 *Your Group Rules*\n\n";
      for (let i = 0; i < totalRules; i++) {
        msg += `${i + 1}. ${rulesOfThread[i]}\n`;
      }
      return message.reply(msg);
    }

    if (["add", "-a"].includes(type)) {
      if (!hasPermission)
        return message.reply("❌ Only group admins can add rules.");
      if (!args[1])
        return message.reply(
          "⚠️ Please enter the content for the rule you want to add.",
        );

      const newRule = args.slice(1).join(" ");
      rulesOfThread.push(newRule);

      try {
        await threadsData.set(threadID, rulesOfThread, "data.rules");
        return message.reply("✅ Added new rule for group successfully.");
      } catch (err) {
        return message.reply("❌ Error: " + err.message);
      }
    }

    if (["edit", "-e"].includes(type)) {
      if (!hasPermission)
        return message.reply("❌ Only group admins can edit rules.");
      const stt = parseInt(args[1]);
      if (isNaN(stt))
        return message.reply(
          "⚠️ Please enter the number of the rule you want to edit.",
        );
      if (!rulesOfThread[stt - 1])
        return message.reply(`⚠️ Rule number ${stt} does not exist.`);
      if (!args[2])
        return message.reply(
          `⚠️ Please enter the new content for rule number ${stt}.`,
        );

      const newContent = args.slice(2).join(" ");
      rulesOfThread[stt - 1] = newContent;

      try {
        await threadsData.set(threadID, rulesOfThread, "data.rules");
        return message.reply(`✅ Edited rule number ${stt} to: ${newContent}`);
      } catch (err) {
        return message.reply("❌ Error: " + err.message);
      }
    }

    if (["move", "-m"].includes(type)) {
      if (!hasPermission)
        return message.reply("❌ Only group admins can move rules.");
      const num1 = parseInt(args[1]);
      const num2 = parseInt(args[2]);

      if (isNaN(num1) || isNaN(num2))
        return message.reply(
          "⚠️ Please enter the numbers of the 2 rules you want to swap.",
        );
      if (!rulesOfThread[num1 - 1] || !rulesOfThread[num2 - 1])
        return message.reply(
          "⚠️ One or both of the specified rules do not exist.",
        );
      if (num1 === num2)
        return message.reply("⚠️ Cannot swap the position of the same rule.");

      const temp = rulesOfThread[num1 - 1];
      rulesOfThread[num1 - 1] = rulesOfThread[num2 - 1];
      rulesOfThread[num2 - 1] = temp;

      try {
        await threadsData.set(threadID, rulesOfThread, "data.rules");
        return message.reply(
          `✅ Swapped position of rule number ${num1} and ${num2} successfully.`,
        );
      } catch (err) {
        return message.reply("❌ Error: " + err.message);
      }
    }

    if (["delete", "del", "-d"].includes(type)) {
      if (!hasPermission)
        return message.reply("❌ Only group admins can delete rules.");
      const stt = parseInt(args[1]);
      if (isNaN(stt))
        return message.reply(
          "⚠️ Please enter the number of the rule you want to delete.",
        );

      const ruleDel = rulesOfThread[stt - 1];
      if (!ruleDel)
        return message.reply(`⚠️ Rule number ${stt} does not exist.`);

      rulesOfThread.splice(stt - 1, 1);

      try {
        await threadsData.set(threadID, rulesOfThread, "data.rules");
        return message.reply(`✅ Deleted rule number ${stt}: ${ruleDel}`);
      } catch (err) {
        return message.reply("❌ Error: " + err.message);
      }
    }

    if (["remove", "reset", "-r", "-rm"].includes(type)) {
      if (!hasPermission)
        return message.reply("❌ Only group admins can remove all rules.");

      const info = await message.reply(
        "⚠️ React to this message with any emoji to confirm removing all group rules.",
      );
      if (info && info.messageID) {
        global.GoatBot.onReaction.set(info.messageID, {
          commandName: "rules",
          messageID: info.messageID,
          authorID: senderID,
          threadID: threadID,
        });
      }
      return;
    }

    if (!isNaN(type)) {
      let msg = "";
      for (const stt of args) {
        const idx = parseInt(stt) - 1;
        if (rulesOfThread[idx]) {
          msg += `${idx + 1}. ${rulesOfThread[idx]}\n`;
        }
      }
      if (!msg)
        return message.reply(
          `⚠️ The specified rule(s) do not exist. Your group only has ${totalRules} rules.`,
        );
      return message.reply(msg);
    }

    return message.reply(
      "❌ Invalid syntax. Use `!help rules` to see the correct usage.",
    );
  },

  onReaction: async function ({ api, event, Reaction, message }) {
    if (event.senderID !== Reaction.authorID) return;

    const { threadsData } = global.db || global.GoatBot.DB;
    try {
      await threadsData.set(Reaction.threadID, [], "data.rules");
      return message.reply("✅ Removed all group rules successfully.");
    } catch (err) {
      return message.reply("❌ Error: " + err.message);
    }
  },
};

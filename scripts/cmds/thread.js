const moment = require("moment-timezone");

function formatTime(timestamp, formatStr = "DD/MM/YYYY HH:mm:ss") {
  if (!timestamp) return moment().tz("Asia/Dhaka").format(formatStr);
  return moment(timestamp).tz("Asia/Dhaka").format(formatStr);
}

module.exports = {
  config: {
    name: "thread",
    aliases: [],
    version: "1.5.0",
    author: "SK-SIDDIK-KHAN",
    countDown: 5,
    role: 2,
    shortDescription: "Manage group chats in bot system",
    longDescription: "Search, ban, unban, and get details of WhatsApp groups.",
    category: "admin",
    guide: {
      en:
        "   {pn} [find | -f | search | -s] <name to find>: search group chat in bot data by name\n" +
        "   {pn} [find | -f | search | -s] [-j | joined] <name to find>: search group chat in bot data that bot still joined by name\n" +
        "   {pn} [ban | -b] [<tid> | leave blank] <reason>: ban group with id <tid> or current group using bot\n" +
        "   Example:\n" +
        "    {pn} ban 120363394480668136@g.us spam bot\n" +
        "    {pn} ban spam too much\n\n" +
        "   {pn} unban [<tid> | leave blank]: unban group with id <tid> or current group\n" +
        "   Example:\n" +
        "    {pn} unban 120363394480668136@g.us\n" +
        "    {pn} unban\n\n" +
        "   {pn} [info | -i] [<tid> | leave blank]: show group details",
    },
  },

  langs: {
    en: {
      noPermission: "You don't have permission to use this feature",
      found: '🔎 Found %1 group(s) matching the keyword "%2" in bot data:\n%3',
      notFound: '❌ No group found matching the keyword: "%1" in bot data',
      hasBanned:
        "Group with ID [%1 | %2] has been banned before:\n» Reason: %3\n» Time: %4",
      banned:
        "Banned group with ID [%1 | %2] from using the bot.\n» Reason: %3\n» Time: %4",
      notBanned: "Group with ID [%1 | %2] is not banned from using the bot",
      unbanned: "Unbanned group with ID [%1 | %2] from using the bot",
      missingReason: "Ban reason cannot be empty",
      info: "» Group ID: %1\n» Group Name: %2\n» Date created: %3\n» Total members: %4\n» Total messages: %5%6",
    },
  },

  onStart: async function ({ api, args, threadsData, message, event }) {
    const langCode = global.GoatBot?.config?.language || "en";
    const getLang = (key, ...args) => {
      let val =
        module.exports.langs[langCode]?.[key] ||
        module.exports.langs["en"]?.[key] ||
        key;
      for (let i = 0; i < args.length; i++) {
        val = val.replace(`%${i + 1}`, args[i]);
      }
      return val;
    };

    const adminList = global.GoatBot?.config?.adminBot || [];
    const isAdmin = adminList.some((adminUID) => {
      const normalizedAdmin =
        adminUID.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
      const normalizedSender =
        event.senderID.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
      return (
        normalizedAdmin === normalizedSender || adminUID === event.senderID
      );
    });

    const type = (args[0] || "").toLowerCase();

    switch (type) {
      case "find":
      case "search":
      case "-f":
      case "-s": {
        if (!isAdmin) {
          return message.reply(getLang("noPermission"));
        }
        let allThread = (await threadsData.getAll()).filter(
          (t) => t.threadID && t.threadID.endsWith("@g.us"),
        );
        let keyword = args.slice(1).join(" ");

        if (["-j", "-join", "joined"].includes((args[1] || "").toLowerCase())) {
          const joinedThreads = [];
          for (const thread of allThread) {
            try {
              if (thread.threadID && thread.threadID.endsWith("@g.us")) {
                await api.getGroupInfo(thread.threadID);
                joinedThreads.push(thread);
              }
            } catch (_) {}
          }
          allThread = joinedThreads;
          keyword = args.slice(2).join(" ");
        }

        const result = allThread.filter(
          (item) =>
            item.threadID &&
            (item.threadName || "")
              .toLowerCase()
              .includes(keyword.toLowerCase()),
        );

        const resultText = result.reduce(
          (i, thread) =>
            (i += `\n╭Group Name: ${thread.threadName || "Unknown"}\n╰Group ID: ${thread.threadID}`),
          "",
        );

        let msg = "";
        if (result.length > 0) {
          msg += getLang("found", result.length, keyword, resultText);
        } else {
          msg += getLang("notFound", keyword);
        }
        return message.reply(msg);
      }

      case "ban":
      case "-b": {
        if (!isAdmin) {
          return message.reply(getLang("noPermission"));
        }
        let tid, reason;

        if (args[1] && (args[1].includes("@") || /^\d{10,}$/.test(args[1]))) {
          tid = args[1];
          if (!tid.includes("@")) {
            tid = tid + "@g.us";
          }
          reason = args.slice(2).join(" ");
        } else {
          tid = event.threadID;
          reason = args.slice(1).join(" ");
        }

        if (!tid || !tid.endsWith("@g.us")) {
          return message.reply(
            "❌ This command only supports groups (JIDs ending with @g.us).",
          );
        }
        if (!reason) {
          return message.reply(getLang("missingReason"));
        }

        reason = reason.replace(/\s+/g, " ");
        const threadData = await threadsData.get(tid);
        const name = threadData.threadName || "Unknown Group";
        const status = threadData.banned?.status;

        if (status) {
          return message.reply(
            getLang(
              "hasBanned",
              tid,
              name,
              threadData.banned.reason,
              threadData.banned.date,
            ),
          );
        }

        const time = formatTime(new Date());

        // Preserve other properties of banned (like user bans inside group)
        const bannedData = threadData.banned || {};
        bannedData.status = true;
        bannedData.reason = reason;
        bannedData.date = time;

        await threadsData.set(tid, bannedData, "banned");
        return message.reply(getLang("banned", tid, name, reason, time));
      }

      case "unban":
      case "-u": {
        if (!isAdmin) {
          return message.reply(getLang("noPermission"));
        }
        let tid;
        if (args[1] && (args[1].includes("@") || /^\d{10,}$/.test(args[1]))) {
          tid = args[1];
          if (!tid.includes("@")) {
            tid = tid + "@g.us";
          }
        } else {
          tid = event.threadID;
        }

        if (!tid || !tid.endsWith("@g.us")) {
          return message.reply(
            "❌ This command only supports groups (JIDs ending with @g.us).",
          );
        }

        const threadData = await threadsData.get(tid);
        const name = threadData.threadName || "Unknown Group";
        const status = threadData.banned?.status;

        if (!status) {
          return message.reply(getLang("notBanned", tid, name));
        }

        // Preserve individual member bans
        const bannedData = threadData.banned || {};
        delete bannedData.status;
        delete bannedData.reason;
        delete bannedData.date;

        await threadsData.set(tid, bannedData, "banned");
        return message.reply(getLang("unbanned", tid, name));
      }

      case "info":
      case "-i": {
        let tid;
        if (args[1] && (args[1].includes("@") || /^\d{10,}$/.test(args[1]))) {
          tid = args[1];
          if (!tid.includes("@")) {
            tid = tid + "@g.us";
          }
        } else {
          tid = event.threadID;
        }

        if (!tid || !tid.endsWith("@g.us")) {
          return message.reply(
            "❌ This command only supports groups (JIDs ending with @g.us).",
          );
        }

        const threadData = await threadsData.get(tid);
        let createdDate = formatTime(threadData.createdAt);
        try {
          if (tid.endsWith("@g.us")) {
            const groupInfo = await api.getGroupInfo(tid);
            if (groupInfo && groupInfo.creation) {
              createdDate = formatTime(groupInfo.creation * 1000);
            }
          }
        } catch (_) {}
        const membersArray = Array.isArray(threadData.members)
          ? threadData.members
          : Object.values(threadData.members || {});

        const valuesMember = membersArray.filter(
          (item) => item && item.inGroup,
        );
        const totalMessage = valuesMember.reduce(
          (i, item) => (i += item.count || 0),
          0,
        );

        const infoBanned = threadData.banned?.status
          ? `\n- Banned: ${threadData.banned.status}` +
            `\n- Reason: ${threadData.banned.reason}` +
            `\n- Time: ${threadData.banned.date}`
          : "";

        const msg = getLang(
          "info",
          threadData.threadID,
          threadData.threadName || "Unknown Group",
          createdDate,
          valuesMember.length,
          totalMessage,
          infoBanned,
        );
        return message.reply(msg);
      }

      default:
        return message.reply(
          `❌ Invalid option. Use find/ban/unban/info.\n📖 Guide:\n${module.exports.config.guide.en.replace(/\{pn\}/g, global.GoatBot.config.prefix + module.exports.config.name)}`,
        );
    }
  },
};

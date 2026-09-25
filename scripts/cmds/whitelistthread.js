const fs = require("fs");
const path = require("path");

const { config } = global.GoatBot;

module.exports = {
  config: {
    name: "whitelistthread",
    aliases: ["wlt"],
    version: "1.5.0",
    author: "SK-SIDDIK-KHAN",
    countDown: 3,
    role: 2,
    shortDescription: "Manage bot thread whitelist",
    category: "admin",
    guide: {
      en:
        "   {pn} on/off      — turn whitelist thread mode on or off\n" +
        "   {pn} list        — list all whitelisted groups\n" +
        "   {pn} add [tid]   — add current or specified group to whitelist\n" +
        "   {pn} remove [tid]— remove group from whitelist",
    },
  },

  onStart: async ({ event, args, message, api, threadsData }) => {
    if (!config.featureBox) config.featureBox = {};
    const fb = config.featureBox;

    const wlThreads = fb.whitelistThreadIDs || [];
    const sub = (args[0] || "").toLowerCase();

    if (sub === "on") {
      fb.whitelistThreadMode = true;
      fs.writeFileSync(
        global.client.dirConfig,
        JSON.stringify(config, null, 2),
        "utf8",
      );
      return message.reply(
        "✅ Whitelist Thread mode is now ON. Bot will only reply in whitelisted groups or to admins.",
      );
    }

    if (sub === "off") {
      fb.whitelistThreadMode = false;
      fs.writeFileSync(
        global.client.dirConfig,
        JSON.stringify(config, null, 2),
        "utf8",
      );
      return message.reply(
        "✅ Whitelist Thread mode is now OFF. Bot will reply in any group.",
      );
    }

    if (!sub || sub === "list") {
      if (wlThreads.length === 0)
        return message.reply("❌ No groups in the whitelist.");

      let msg = `📜 *WHITELISTED GROUPS (${wlThreads.length})*\n${"─".repeat(25)}\n`;
      for (let i = 0; i < wlThreads.length; i++) {
        const id = wlThreads[i];
        let name = "Unknown Group";
        try {
          const tData = await threadsData(id);
          if (tData) {
            name = tData.threadName || tData.name || "Unknown Group";
          }
        } catch (e) {}
        msg += `${i + 1}. ${name}\n- ID: ${id}\n\n`;
      }
      msg += `${"─".repeat(25)}\n`;
      msg += `📌 *Status:* ${fb.whitelistThreadMode ? "ON ✅" : "OFF ❌"}\n`;
      return message.reply(msg);
    }

    if (sub === "add") {
      let target = args[1] ? args[1] : event.isGroup ? event.threadID : null;
      if (!target) {
        return message.reply(
          "❌ Please specify a thread ID or use this command inside the group you want to add.",
        );
      }
      if (!target.includes("@g.us")) {
        target = target + "@g.us";
      }

      if (wlThreads.includes(target)) {
        return message.reply(
          `⚠️ Group *${target}* is already in the whitelist.`,
        );
      }
      wlThreads.push(target);
      fb.whitelistThreadIDs = wlThreads;
      fs.writeFileSync(
        global.client.dirConfig,
        JSON.stringify(config, null, 2),
        "utf8",
      );

      let name = "Unknown Group";
      try {
        const tData = await threadsData(target);
        if (tData) {
          name = tData.threadName || tData.name || "Unknown Group";
        }
      } catch (e) {}

      return message.reply(
        `✅ Added *${name}* (${target}) to the thread whitelist.`,
      );
    }

    if (sub === "remove" || sub === "del" || sub === "delete") {
      let target = args[1] ? args[1] : event.isGroup ? event.threadID : null;
      if (!target) {
        return message.reply(
          "❌ Please specify a thread ID or use this command inside the group you want to remove.",
        );
      }
      if (!target.includes("@g.us")) {
        target = target + "@g.us";
      }

      const idx = wlThreads.indexOf(target);
      if (idx === -1) {
        return message.reply(`⚠️ Group *${target}* is not in the whitelist.`);
      }
      wlThreads.splice(idx, 1);
      fb.whitelistThreadIDs = wlThreads;
      fs.writeFileSync(
        global.client.dirConfig,
        JSON.stringify(config, null, 2),
        "utf8",
      );

      let name = "Unknown Group";
      try {
        const tData = await threadsData(target);
        if (tData) {
          name = tData.threadName || tData.name || "Unknown Group";
        }
      } catch (e) {}

      return message.reply(
        `✅ Removed *${name}* (${target}) from the thread whitelist.`,
      );
    }

    return message.reply(
      "❓ Unknown action. Usage:\n" +
        "   `.whitelistthread on/off` — toggle mode\n" +
        "   `.whitelistthread list`   — list groups\n" +
        "   `.whitelistthread add`    — add current group\n" +
        "   `.whitelistthread remove` — remove current group",
    );
  },
};

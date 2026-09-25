module.exports = {
  config: {
    name: "eval",
    version: "1.5.0",
    author: "SK-SIDDIK-KHAN",
    role: 2,
    shortDescription: "Test code quickly",
    category: "admin",
    guide: {
      en: "{pn} <code to test>",
    },
  },

  onStart: async function ({ api, event, args, message }) {
    const admin = global.GoatBot.config.adminBot || [];
    if (!admin.includes(global.normUID(event.senderID))) {
      return message.reply(
        "You don't have enough permission to use this command. Only My Author Have Access.",
      );
    }

    function output(msg) {
      if (
        typeof msg == "number" ||
        typeof msg == "boolean" ||
        typeof msg == "function"
      ) {
        msg = msg.toString();
      } else if (msg instanceof Map) {
        let text = `Map(${msg.size}) `;
        text += JSON.stringify(mapToObj(msg), null, 2);
        msg = text;
      } else if (typeof msg == "object") {
        msg = JSON.stringify(msg, null, 2);
      } else if (typeof msg == "undefined") {
        msg = "undefined";
      }
      message.reply(msg);
    }

    function out(msg) {
      output(msg);
    }

    function mapToObj(map) {
      const obj = {};
      map.forEach(function (v, k) {
        obj[k] = v;
      });
      return obj;
    }

    const cmdCode = args.join(" ");
    if (!cmdCode) return message.reply("Please provide code to evaluate.");

    const getStream = global.utils.getStreamFromUrl;

    const cmd = `
    (async () => {
      try {
        ${cmdCode}
      } catch(err) {
        message.reply("❌ An error occurred:\\n" + (err.stack ? err.stack : JSON.stringify(err, null, 2) || ""));
      }
    })()`;

    try {
      eval(cmd);
    } catch (err) {
      message.reply("❌ Eval error:\\n" + err.message);
    }
  },
};

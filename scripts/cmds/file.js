const fs = require("fs");
const path = require("path");

module.exports = {
	config: {
		name: "file",
		version: "1.5.0",
		author: "SK-SIDDIK-KHAN",
		countDown: 5,
		role: 2,
		usePrefix: true,
		description: {
			vi: "Gửi mã nguồn thô của bất kỳ lệnh nào",
			en: "Sends the raw source code of any command file"
		},
		category: "admin",
		guide: {
			en: "{pn} <cmdName>"
		}
	},

	langs: {
		vi: {
			usage: "❌ Cách dùng: !file <commandName>",
			notFound: "❌ Không tìm thấy lệnh \"%1.js\""
		},
		en: {
			usage: "❌ Usage: !file <commandName>",
			notFound: "❌ Command \"%1.js\" not found"
		}
	},

	onStart: async function ({ api, event, args, message, getLang }) {
		const cmdName = args[0];
		if (!cmdName) return message.reply(getLang("usage"));

		const filePath = path.resolve(__dirname, `${cmdName}.js`);
		if (!fs.existsSync(filePath))
			return message.reply(getLang("notFound", cmdName));

		const code = fs.readFileSync(filePath, "utf8");
		api.sendMessage(code, event.threadID, event.messageID);
	}
};

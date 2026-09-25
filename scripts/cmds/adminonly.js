const fs = require("fs");

module.exports = {
	config: {
		name: "adminonly",
		aliases: ["adonly", "onlyad", "onlyadmin"],
		version: "1.5.0",
		author: "SK-SIDDIK-KHAN",
		countDown: 5,
		role: 2,
		usePrefix: true,
		description: {
			vi: "Bật/tắt chế độ chỉ admin mới dùng được bot",
			en: "Turn on/off only admin can use bot"
		},
		category: "admin",
		guide: {
			en: "{pn} [on | off]"
		}
	},

	langs: {
		vi: {
			syntaxError: "❌ Cú pháp lỗi, chỉ dùng .adminonly on hoặc .adminonly off",
			turnedOn: "✅ Đã bật chế độ chỉ admin mới dùng được bot",
			turnedOff: "❎ Đã tắt chế độ chỉ admin mới dùng được bot"
		},
		en: {
			syntaxError: "❌ Syntax error, only use .adminonly on or .adminonly off",
			turnedOn: "✅ Turned on the mode only admin can use bot",
			turnedOff: "❎ Turned off the mode only admin can use bot"
		}
	},

	onStart: function ({ args, message, getLang }) {
		const { config } = global.GoatBot;
		const { client } = global;

		if (!config.featureBox) config.featureBox = {};

		let value;
		if (args[0] === "on") value = true;
		else if (args[0] === "off") value = false;
		else
			return message.reply(getLang("syntaxError"));

		config.featureBox.adminOnly = value;
		message.reply(value ? getLang("turnedOn") : getLang("turnedOff"));

		fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2), "utf8");
	}
};

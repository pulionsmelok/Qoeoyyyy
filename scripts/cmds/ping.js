module.exports = {
	config: {
		name: "ping",
		version: "1.5.0",
		author: "SK-SIDDIK-KHAN",
		countDown: 5,
		role: 0,
		usePrefix: true,
		description: {
			vi: "Kiểm tra thời gian phản hồi và uptime của bot",
			en: "Shows the bot's response time and uptime"
		},
		category: "info",
		guide: {
			en: "{pn}"
		}
	},

	langs: {
		vi: {
			result: "🏓 Pong!\n⏱ Thời gian phản hồi: %1ms\n⏰ Uptime: %2"
		},
		en: {
			result: "🏓 Pong!\n⏱ Response time: %1ms\n⏰ Uptime: %2"
		}
	},

	onStart: async function ({ message, getLang }) {
		const timeStart = Date.now();
		const uptime = process.uptime();
		const hours = Math.floor(uptime / 3600);
		const minutes = Math.floor((uptime % 3600) / 60);
		const seconds = Math.floor(uptime % 60);
		const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;

		const time = Date.now() - timeStart;
		return message.reply(getLang("result", time, uptimeStr));
	}
};

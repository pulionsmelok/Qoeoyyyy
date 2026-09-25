module.exports = {
	config: {
		name: "stats",
		aliases: ["up"],
		version: "1.5.0",
		author: "SK-SIDDIK-KHAN",
		countDown: 10,
		role: 0,
		usePrefix: true,
		description: {
			vi: "Hiển thị uptime, lệnh, event, số lượng database và bộ nhớ",
			en: "Displays uptime, loaded commands, events, database counts, and memory usage"
		},
		category: "system",
		guide: {
			en: "{pn}"
		}
	},

	langs: {
		vi: {
			result: "🤖 *%1 Stats*\n\n📱 Account: %2\n⏱️ Uptime: %3\n💾 Memory: %4 MB\n\n📦 Commands: %5\n⚡ Events: %6\n\n👥 Users in DB: %7\n💬 Threads in DB: %8\n\n🗄️ DB Type: %9"
		},
		en: {
			result: "🤖 *%1 Stats*\n\n📱 Account: %2\n⏱️ Uptime: %3\n💾 Memory: %4 MB\n\n📦 Commands: %5\n⚡ Events: %6\n\n👥 Users in DB: %7\n💬 Threads in DB: %8\n\n🗄️ DB Type: %9"
		}
	},

	onStart: async function ({ api, event, message, getLang }) {
		const uptime = humanDuration(
			Date.now() - (global.GoatBot.startTime || Date.now()),
		);
		const cmds = global.GoatBot.cmds ? global.GoatBot.cmds.size : 0;
		const events = global.GoatBot.events ? global.GoatBot.events.size : 0;
		const mem = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);

		let users = 0;
		let threads = 0;
		try {
			if (global.db) {
				users = (global.db.allUserData || []).length;
				threads = (global.db.allThreadData || []).length;
			} else if (global.GoatBot.DB) {
				users = await global.GoatBot.DB.users.count();
				threads = await global.GoatBot.DB.threads.count();
			}
		} catch (_) {}

		const selfID = api.getCurrentUserID ? api.getCurrentUserID() : "";
		const phone = selfID.split(":")[0].split("@")[0] || selfID;

		return message.reply(
			getLang(
				"result",
				global.GoatBot.config.botName || "WAGoat Bot",
				phone,
				uptime,
				mem,
				cmds,
				events,
				users,
				threads,
				(global.GoatBot.config.database && global.GoatBot.config.database.type) || "json"
			)
		);
	}
};

const fs = require("fs");
const path = require("path");

const CACHE_DIR = path.resolve(process.cwd(), "cache");
const RESTART_FILE = path.join(CACHE_DIR, "restart.txt");

module.exports = {
	config: {
		name: "restart",
		version: "1.5.0",
		author: "SK-SIDDIK-KHAN",
		countDown: 10,
		role: 2,
		usePrefix: true,
		description: {
			vi: "Khởi động lại bot. Sau khi restart sẽ gửi xác nhận. Chỉ admin",
			en: "Gracefully restarts the bot. After restart, sends confirmation. Admin only"
		},
		category: "admin",
		guide: {
			en: "{pn}"
		}
	},

	langs: {
		vi: {
			restarting: "🔄 Đang khởi động lại… Tôi sẽ báo khi quay lại"
		},
		en: {
			restarting: "🔄 Restarting… I'll let you know when I'm back"
		}
	},

	onStart: async function ({ api, event, message, getLang }) {
		if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

		const data = {
			time: Date.now(),
			threads: [event.threadID],
			sender: event.senderID,
		};
		fs.writeFileSync(RESTART_FILE, JSON.stringify(data), "utf8");

		await message.reply(getLang("restarting"));
		setTimeout(() => process.exit(2), 2000);
	}
};

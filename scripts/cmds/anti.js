module.exports = {
	config: {
		name: "anti",
		version: "1.5.0",
		author: "SK-SIDDIK-KHAN",
		countDown: 5,
		role: 1,
		usePrefix: true,
		description: {
			vi: "Bật/tắt tính năng bảo vệ bot: antiInbox, whitelist, whitelistThread, adminOnly",
			en: "Toggle bot protection features: antiInbox, whitelistMode, whitelistThreadMode, adminOnly"
		},
		category: "admin",
		guide: {
			en: "{pn} [antiinbox | whitelist | whitelistthread | adminonly] [on/off]"
		}
	},

	langs: {
		vi: {
			available: "❓ Tính năng có sẵn:\n• antiinbox — chặn DM\n• whitelist — chỉ UID được phép\n• whitelistthread — chỉ thread được phép\n• adminonly — chỉ admin\n\nCách dùng: !anti [feature] [on/off]",
			status: "ℹ️ %1 hiện tại: %2\nDùng !anti %1 on/off để thay đổi",
			turned: "✅ *%1* đã được bật/tắt: %2"
		},
		en: {
			available: "❓ Available features:\n• antiinbox — block DMs\n• whitelist — only allowed UIDs\n• whitelistthread — only allowed threads\n• adminonly — admins only mode\n\nUsage: !anti [feature] [on/off]",
			status: "ℹ️ %1 is currently: %2\nUse !anti %1 on/off to toggle",
			turned: "✅ *%1* has been turned %2"
		}
	},

	onStart: async function ({ api, event, args, message, getLang }) {
		const feature = (args[0] || "").toLowerCase();
		const toggle = (args[1] || "").toLowerCase();

		const featureMap = {
			antiinbox: "antiInbox",
			whitelist: "whitelistMode",
			whitelistthread: "whitelistThreadMode",
			adminonly: "adminOnly",
		};

		if (!featureMap[feature]) {
			return message.reply(getLang("available"));
		}

		if (toggle !== "on" && toggle !== "off") {
			const current = global.GoatBot.config.featureBox[featureMap[feature]];
			return message.reply(getLang("status", feature, current ? "ON" : "OFF"));
		}

		const newVal = toggle === "on";
		global.GoatBot.config.featureBox[featureMap[feature]] = newVal;

		return message.reply(getLang("turned", feature, toggle.toUpperCase()));
	}
};

module.exports = {
	config: {
		name: "event",
		version: "1.5.0",
		author: "SK-SIDDIK-KHAN",
		countDown: 5,
		role: 2,
		usePrefix: true,
		description: {
			vi: "Quản lý event bot mà không cần restart",
			en: "Dynamically manage bot events without restarting"
		},
		category: "admin",
		guide: {
			en: "{pn} load/unload/reload [eventname]"
		}
	},

	langs: {
		vi: {
			usage: "❓ Cách dùng: !event load/unload/reload [event name]",
			loaded: "✅ Event *%1* đã được load",
			unloaded: "✅ Event *%1* đã được unload",
			reloaded: "✅ Event *%1* đã được reload",
			error: "❌ Lỗi: %1"
		},
		en: {
			usage: "❓ Usage: !event load/unload/reload [event name]",
			loaded: "✅ Event *%1* loaded",
			unloaded: "✅ Event *%1* unloaded",
			reloaded: "✅ Event *%1* reloaded",
			error: "❌ Error: %1"
		}
	},

	onStart: async function ({ api, event, args, message, getLang }) {
		const action = (args[0] || "").toLowerCase();
		const evtName = args[1] || "";

		if (!["load", "unload", "reload"].includes(action) || !evtName) {
			return message.reply(getLang("usage"));
		}

		try {
			if (action === "load") {
				const mod = await loadEvent(evtName, api);
				return message.reply(getLang("loaded", mod.config.name));
			}
			if (action === "unload") {
				unloadEvent(evtName);
				return message.reply(getLang("unloaded", evtName));
			}
			if (action === "reload") {
				const mod = await reloadEvent(evtName, api);
				return message.reply(getLang("reloaded", mod.config.name));
			}
		} catch (e) {
			return message.reply(getLang("error", e.message));
		}
	}
};

module.exports = {
	config: {
		name: "help",
		aliases: ["menu"],
		version: "1.5.0",
		author: "SK-SIDDIK-KHAN",
		countDown: 5,
		role: 0,
		usePrefix: true,
		description: {
			vi: "Xem danh sách lệnh hoặc chi tiết một lệnh",
			en: "Lists all available bot commands, or shows detailed info about a specific command"
		},
		category: "system",
		guide: {
			en: "{pn} [command name]"
		}
	},

	langs: {
		vi: {
			notFound: "❌ Không tìm thấy lệnh \"%1\"",
			cmdInfo: "📌 *%1*\nVersion: %2\nAuthor: %3\nCategory: %4\nCooldown: %5s\nRole: %6\n\n📝 %7\n\n📖 Cách dùng:\n%8",
			header: "🤖 *%1*\nPrefix: %2 | Tổng lệnh: %3\n\n",
			category: "📂 *%1*\n",
			footer: "Dùng %1help [lệnh] để xem chi tiết"
		},
		en: {
			notFound: "❌ Command \"%1\" not found",
			cmdInfo: "📌 *%1*\nVersion: %2\nAuthor: %3\nCategory: %4\nCooldown: %5s\nRole: %6\n\n📝 %7\n\n📖 Usage:\n%8",
			header: "🤖 *%1*\nPrefix: %2 | Commands: %3\n\n",
			category: "📂 *%1*\n",
			footer: "Use %1help [command] for details"
		}
	},

	onStart: async function ({ api, event, args, message, prefix, getLang }) {
		const cmds = global.GoatBot.cmds;

		if (args[0]) {
			const name = args[0].toLowerCase().replace(prefix, "");
			const cmd = cmds.get(name);
			if (!cmd) return message.reply(getLang("notFound", name));

			const c = cmd.config;
			const guide = (c.guide && (c.guide.en || Object.values(c.guide)[0])) || "";
			const pn = prefix + c.name;
			const guideText = guide.replace(/\{pn\}/gi, pn);
			const role = c.role === 1 ? "Admin" : c.role === 2 ? "Bot Admin" : "Everyone";
			const desc = (c.description && (c.description.en || c.description.vi)) || c.longDescription || c.shortDescription || "";

			return message.reply(
				getLang("cmdInfo", pn, c.version || "1.0.0", c.author || "Unknown", c.category || "misc", c.countDown || 0, role, desc, guideText || "N/A")
			);
		}

		const grouped = {};
		for (const [name, cmd] of cmds) {
			const cat = (cmd.config.category || "misc").toLowerCase();
			if (!grouped[cat]) grouped[cat] = [];
			grouped[cat].push(prefix + cmd.config.name);
		}

		let text = getLang("header", global.GoatBot.config.botName || "WCA Bot", prefix, cmds.size);

		for (const [cat, list] of Object.entries(grouped)) {
			text += getLang("category", cat.toUpperCase());
			text += list.join(", ") + "\n\n";
		}

		text += getLang("footer", prefix);

		return message.reply(text);
	}
};

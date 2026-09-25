const fs = require("fs");
const path = require("path");

module.exports = {
	config: {
		name: "delete",
		aliases: ["delcmd", "del"],
		version: "1.5.0",
		author: "SK-SIDDIK-KHAN",
		role: 2,
		usePrefix: true,
		description: {
			vi: "Gỡ lệnh khỏi bộ nhớ và xóa vĩnh viễn file .js",
			en: "Unloads a command from memory and permanently deletes its .js file"
		},
		category: "admin",
		guide: {
			en: "{pn} <command_name>"
		}
	},

	langs: {
		vi: {
			noPerm: "❌ Bạn không có quyền dùng lệnh này",
			usage: "❌ Cách dùng: !delete <command_name>",
			cannotCore: "❌ Không thể xóa lệnh quản lý cốt lõi!",
			notExist: "❌ File lệnh *%1.js* không tồn tại",
			success: "✅ Lệnh *%1* đã được gỡ và file (%1.js) đã xóa vĩnh viễn",
			failed: "❌ Không thể xóa file *%1.js*.\nLý do: %2"
		},
		en: {
			noPerm: "❌ You don't have enough permission to use this command",
			usage: "❌ Usage: !delete <command_name>",
			cannotCore: "❌ You cannot delete core management commands!",
			notExist: "❌ The command file *%1.js* does not exist",
			success: "✅ Command *%1* has been unloaded and its file (%1.js) deleted permanently",
			failed: "❌ Failed to delete the file *%1.js*.\nReason: %2"
		}
	},

	onStart: async function ({ api, event, args, message, getLang }) {
		const admin = global.GoatBot.config.adminBot || [];
		if (!admin.includes(global.normUID(event.senderID))) {
			return message.reply(getLang("noPerm"));
		}

		const target = args[0]?.toLowerCase();
		if (!target) return message.reply(getLang("usage"));

		if (target === "delete" || target === "cmd") {
			return message.reply(getLang("cannotCore"));
		}

		const filePath = path.join(__dirname, target + ".js");

		if (!fs.existsSync(filePath)) {
			return message.reply(getLang("notExist", target));
		}

		try {
			global.unloadCmd(target);
		} catch (err) {
			console.log(`[delete.js] Note: Could not unload ${target}. Message: ${err.message}`);
		}

		try {
			fs.unlinkSync(filePath);
			await message.react("✅");
			return message.reply(getLang("success", target));
		} catch (err) {
			await message.react("❌");
			return message.reply(getLang("failed", target, err.message));
		}
	}
};

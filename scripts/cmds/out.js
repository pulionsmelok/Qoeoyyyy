module.exports = {
	config: {
		name: "out",
		aliases: ["leave"],
		version: "1.5.0",
		author: "SK-SIDDIK-KHAN",
		countDown: 5,
		role: 2,
		usePrefix: true,
		description: {
			vi: "Buộc bot rời khỏi nhóm hiện tại hoặc nhóm chỉ định. Chỉ Admin Bot mới dùng được",
			en: "Forces the bot to leave the current group or a specified group. Only Bot Admins can use this"
		},
		category: "admin",
		guide: {
			en: "{pn} [threadID]"
		}
	},

	langs: {
		vi: {
			onlyGroup: "❌ Lệnh này chỉ dùng trong nhóm!",
			goodbye: "👋 Tạm biệt mọi người! Bot đang rời nhóm...",
			failed: "❌ Không thể rời nhóm: %1"
		},
		en: {
			onlyGroup: "❌ This command can only be used in groups!",
			goodbye: "👋 Goodbye everyone! The bot is leaving the group...",
			failed: "❌ Failed to leave the group: %1"
		}
	},

	onStart: async function ({ api, event, args, message, getLang }) {
		const threadID = args[0] || event.threadID;

		if (!threadID.endsWith("@g.us")) {
			return message.reply(getLang("onlyGroup"));
		}

		try {
			await message.reply(getLang("goodbye"));
			await api.leaveGroup(threadID);
		} catch (e) {
			return message.reply(getLang("failed", e.message));
		}
	}
};

module.exports = {
	config: {
		name: "kick",
		version: "1.5.0",
		author: "SK-SIDDIK-KHAN",
		countDown: 5,
		role: 1,
		usePrefix: true,
		description: {
			vi: "Xóa một thành viên khỏi nhóm hiện tại. Bot phải là admin. Chỉ admin mới dùng được",
			en: "Removes a user from the current group. Bot must be admin. Admins only"
		},
		category: "group",
		guide: {
			en: "{pn} [@mention | reply]"
		}
	},

	langs: {
		vi: {
			onlyGroup: "❌ Lệnh này chỉ dùng trong nhóm",
			cannotSelf: "❌ Bạn không thể kick chính mình",
			cannotAdmin: "❌ Bạn không thể kick admin bot",
			success: "✅ @%1 đã bị kick khỏi nhóm",
			failed: "❌ Không thể kick: %1\n(Hãy chắc bot là admin)"
		},
		en: {
			onlyGroup: "❌ This command only works in groups",
			cannotSelf: "❌ You cannot kick yourself",
			cannotAdmin: "❌ You cannot kick a bot admin",
			success: "✅ @%1 has been kicked from the group",
			failed: "❌ Failed to kick: %1\n(Make sure the bot is an admin)"
		}
	},

	onStart: async function ({ api, event, args, message, getLang }) {
		if (!event.isGroup)
			return message.reply(getLang("onlyGroup"));

		const targetUID = getTargetUser(event, args);
		const phone = jidToPhone(targetUID);

		if (targetUID === event.senderID)
			return message.reply(getLang("cannotSelf"));

		const adminList = global.GoatBot.config.adminBot || [];
		if (adminList.includes(targetUID))
			return message.reply(getLang("cannotAdmin"));

		try {
			await api.removeUserFromGroup(event.threadID, [targetUID]);
			return message.reply({
				body: getLang("success", phone),
				mentions: [targetUID]
			});
		} catch (e) {
			return message.reply(getLang("failed", e.message));
		}
	}
};

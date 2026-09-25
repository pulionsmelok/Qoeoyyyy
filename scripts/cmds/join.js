module.exports = {
	config: {
		name: "join",
		version: "1.5.0",
		author: "SK-SIDDIK-KHAN",
		countDown: 5,
		role: 2,
		usePrefix: true,
		description: {
			vi: "Tham gia nhóm WhatsApp bằng link mời. Chỉ Admin Bot",
			en: "Joins a WhatsApp group using the provided group invite link. Only Bot Admins"
		},
		category: "admin",
		guide: {
			en: "{pn} [invite link]"
		}
	},

	langs: {
		vi: {
			needLink: "❌ Hãy cung cấp link mời nhóm.\nVí dụ: !join https://chat.whatsapp.com/XXXXXX",
			invalidLink: "❌ Link không hợp lệ. Hãy cung cấp link mời nhóm WhatsApp hợp lệ",
			success: "✅ Đã tham gia nhóm thành công!\nGroup ID: %1",
			alreadyMember: "❌ Đã là thành viên của nhóm này rồi",
			failed: "❌ Không thể tham gia nhóm: %1"
		},
		en: {
			needLink: "❌ Please provide a group invite link.\nExample: !join https://chat.whatsapp.com/XXXXXX",
			invalidLink: "❌ Invalid invite link. Please provide a valid WhatsApp group invite link",
			success: "✅ Successfully joined the group!\nGroup ID: %1",
			alreadyMember: "❌ Already a member of this group",
			failed: "❌ Failed to join group: %1"
		}
	},

	onStart: async function ({ api, event, args, message, getLang }) {
		if (!args[0])
			return message.reply(getLang("needLink"));

		const link = args[0].trim();
		const match = link.match(/chat\.whatsapp\.com\/([a-zA-Z0-9_-]+)/);
		if (!match)
			return message.reply(getLang("invalidLink"));

		const code = match[1];

		try {
			const result = await api.groupAcceptInvite(code);
			const gid = typeof result === "object" ? result.id : result;
			const groupJid =
				typeof gid === "string" && gid.includes("@g.us") ? gid : gid + "@g.us";

			message.reply(getLang("success", gid));

			try {
				const info = await api.getGroupInfo(groupJid);
				const groupName = info.subject || info.name || "this group";
				const cfg = global.GoatBot.config;
				const prefix = cfg.prefix || "!";
				const botName = cfg.botName || "WCA Bot";
				await api.sendMessage(
					{
						body: `👋 Hello everyone! I'm *${botName}*, your new assistant bot.\nThank you for adding me to *${groupName}* 🎉\n\nType *${prefix}help* to see all available commands.`,
					},
					groupJid,
				);
			} catch (_) {}
		} catch (e) {
			if (e.message?.includes("409")) {
				return message.reply(getLang("alreadyMember"));
			}
			return message.reply(getLang("failed", e.message));
		}
	}
};

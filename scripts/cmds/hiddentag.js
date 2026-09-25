module.exports = {
	config: {
		name: "hiddentag",
		aliases: ["htag", "taghidden"],
		version: "1.5.0",
		author: "SK-SIDDIK-KHAN",
		role: 1,
		usePrefix: true,
		description: {
			vi: "Gửi tin nhắn tag ẩn tất cả thành viên nhóm",
			en: "Sends a message that notifies every member without showing @mentions"
		},
		category: "group",
		guide: {
			en: "{pn} [text]"
		}
	},

	langs: {
		vi: {
			onlyGroup: "❌ Lệnh này chỉ dùng trong nhóm",
			needText: "❌ Hãy cung cấp nội dung tin nhắn",
			noMembers: "❌ Không tải được dữ liệu thành viên nhóm",
			error: "❌ Lỗi gửi hidden tag: %1"
		},
		en: {
			onlyGroup: "❌ This command can only be used in groups",
			needText: "❌ Please provide the message you want to send",
			noMembers: "❌ Could not load group member data from WhatsApp",
			error: "❌ Error sending hidden tag: %1"
		}
	},

	onStart: async function ({ api, event, args, message, getLang }) {
		try {
			if (!event.isGroup) {
				return message.reply(getLang("onlyGroup"));
			}

			const text = args.join(" ");
			if (!text) {
				return message.reply(getLang("needText"));
			}

			const groupInfo = await api.getGroupInfo(event.threadID);
			if (!groupInfo || !groupInfo.participants) {
				return message.reply(getLang("noMembers"));
			}

			const jidArray = groupInfo.participants.map((m) => m.id);

			await api.sendMessage(
				{
					body: text,
					mentions: jidArray,
				},
				event.threadID,
			);
		} catch (err) {
			return message.reply(getLang("error", err.message));
		}
	}
};

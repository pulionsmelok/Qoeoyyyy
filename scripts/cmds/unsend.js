module.exports = {
	config: {
		name: "unsend",
		aliases: ["uns"],
		version: "1.5.0",
		author: "SK-SIDDIK-KHAN",
		countDown: 3,
		role: 1,
		usePrefix: true,
		description: {
			vi: "Xóa tin nhắn của bot (reply vào tin nhắn cần xóa). Chỉ admin",
			en: "Unsends the bot's replied-to message. Admin only"
		},
		category: "admin",
		guide: {
			en: "{pn} (reply to a bot message)"
		}
	},

	langs: {
		vi: {
			needReply: "❌ Hãy reply vào tin nhắn bạn muốn xóa",
			noMsgId: "❌ Không phát hiện được message ID",
			failed: "❌ Không thể xóa. Hãy chắc bạn reply vào tin nhắn của bot.\n%1"
		},
		en: {
			needReply: "❌ Please reply to the message you want to delete",
			noMsgId: "❌ Could not detect the replied message ID",
			failed: "❌ Failed to delete. Make sure you replied to one of my messages.\n%1"
		}
	},

	onStart: async function ({ api, event, message, getLang }) {
		const replied = event.messageReply || event.replyToMessage;
		if (!replied) {
			return message.reply(getLang("needReply"));
		}

		const targetMsgID = replied.messageID || replied.messageId;
		if (!targetMsgID) {
			return message.reply(getLang("noMsgId"));
		}

		try {
			await api.deleteMessage(
				event.threadID,
				{
					remoteJid: event.threadID,
					id: targetMsgID,
					fromMe: true,
				},
				true,
			);
			await message.react("✅");
		} catch (e) {
			return message.reply(getLang("failed", e.message));
		}
	}
};

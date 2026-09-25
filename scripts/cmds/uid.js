module.exports = {
	config: {
		name: "uid",
		version: "1.5.0",
		author: "SK-SIDDIK-KHAN",
		countDown: 5,
		role: 0,
		usePrefix: true,
		description: {
			vi: "Trả về JID (UID) của bản thân, người được tag, người reply hoặc nhóm hiện tại",
			en: "Returns the WhatsApp JID (UID) of yourself, a mentioned user, replied user, or the current group"
		},
		category: "info",
		guide: {
			en: "{pn} [@mention | reply | 'group']"
		}
	},

	langs: {
		vi: {
			onlyGroup: "❌ Lệnh này phải dùng trong nhóm",
			groupInfo: "📋 *Thông tin nhóm*\nThread ID: %1",
			userUID: "📋 *User UID*\nPhone: %1\nJID: %2",
			userInfo: "📋 *Thông tin người dùng*\nTên: %1\nPhone: %2\nJID: %3"
		},
		en: {
			onlyGroup: "❌ This command must be used in a group",
			groupInfo: "📋 *Group Info*\nThread ID: %1",
			userUID: "📋 *User UID*\nPhone: %1\nJID: %2",
			userInfo: "📋 *User Info*\nName: %1\nPhone: %2\nJID: %3"
		}
	},

	onStart: async function ({ api, event, args, message, getLang }) {
		const isGroupReq = args[0] && args[0].toLowerCase() === "group";

		if (isGroupReq) {
			if (!event.isGroup)
				return message.reply(getLang("onlyGroup"));
			return message.reply(getLang("groupInfo", event.threadID));
		}

		const targetUID = getTargetUser(event, args);
		const phone = jidToPhone(targetUID);

		let text = getLang("userUID", phone, targetUID);

		try {
			if (global.GoatBot.DB && global.GoatBot.DB.userData) {
				const user = await global.GoatBot.DB.userData(targetUID);
				if (user && user.name && user.name !== "Unknown") {
					text = getLang("userInfo", user.name, phone, targetUID);
				}
			}
		} catch (_) {}

		return message.reply(text);
	}
};

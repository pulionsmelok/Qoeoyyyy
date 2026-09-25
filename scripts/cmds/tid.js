module.exports = {
	config: {
		name: "tid",
		version: "1.5.0",
		author: "SK-SIDDIK-KHAN",
		countDown: 5,
		role: 0,
		usePrefix: true,
		description: {
			vi: "Trả về JID (Thread ID) của cuộc trò chuyện hoặc nhóm hiện tại",
			en: "Returns the JID (Thread ID) of the current chat or group"
		},
		category: "info",
		guide: {
			en: "{pn}"
		}
	},

	langs: {
		vi: {
			threadInfo: "📋 *Thông tin Thread*\nThread ID: %1\nLoại: %2",
			groupName: "\nTên: %1",
			members: "\nThành viên: %1",
			group: "Nhóm",
			dm: "Tin nhắn riêng"
		},
		en: {
			threadInfo: "📋 *Thread Info*\nThread ID: %1\nType: %2",
			groupName: "\nName: %1",
			members: "\nMembers: %1",
			group: "Group",
			dm: "DM"
		}
	},

	onStart: async function ({ event, message, getLang }) {
		let text = getLang("threadInfo", event.threadID, event.isGroup ? getLang("group") : getLang("dm"));

		if (event.isGroup && global.db) {
			try {
				const thread = await global.db.threadsData.get(event.threadID);
				const name = thread?.threadName || thread?.name;
				if (name) text += getLang("groupName", name);
				const count = thread?.members?.length || thread?.totalMember;
				if (count) text += getLang("members", count);
			} catch (_) {}
		}

		return message.reply(text);
	}
};

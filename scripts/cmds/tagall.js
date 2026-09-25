module.exports = {
	config: {
		name: "tagall",
		aliases: ["everyone", "all", "mention"],
		version: "1.5.0",
		author: "SK-SIDDIK-KHAN",
		role: 1,
		usePrefix: true,
		countDown: 10,
		description: {
			vi: "Tag tất cả thành viên trong nhóm bằng một tin nhắn",
			en: "Tags every member of the group in a single message"
		},
		category: "group",
		guide: {
			en: "{pn} [message]"
		}
	},

	langs: {
		vi: {
			onlyGroup: "❌ Lệnh này chỉ dùng trong nhóm",
			noMembers: "❌ Không tải được dữ liệu thành viên nhóm",
			defaultMsg: "Xin chào mọi người, đây là WAGoat-Bot",
			header: "╭────❒ 📢 Thông báo ❒\n├⬡ *%1*\n╰────────────❒\n\n"
		},
		en: {
			onlyGroup: "❌ This command can only be used in groups",
			noMembers: "❌ Could not load group member data",
			defaultMsg: "Hello everyone it's WAGoat-Bot",
			header: "╭────❒ 📢 Announcement ❒\n├⬡ *%1*\n╰────────────❒\n\n"
		}
	},

	onStart: async function ({ api, event, args, message, threadsData, getLang }) {
		try {
			if (!event.isGroup) {
				return message.reply(getLang("onlyGroup"));
			}

			let thread;
			if (typeof threadsData === "function") {
				thread = await threadsData(event.threadID);
			} else {
				thread = await threadsData.get(event.threadID);
			}

			const membersList = thread.members || thread.allMembers;
			if (!thread || !membersList) {
				return message.reply(getLang("noMembers"));
			}

			const activeMembers = membersList.filter((m) => m.inGroup !== false);
			const jidArray = activeMembers.map((m) => m.userID || m.uid);

			const msgText = args.join(" ") || getLang("defaultMsg");

			let mentionText = getLang("header", msgText);

			for (let member of activeMembers) {
				const uid = member.userID || member.uid;
				mentionText += `@${uid.split("@")[0]}\n`;
			}

			await api.sendMessage(
				{
					body: mentionText,
					mentions: jidArray
				},
				event.threadID
			);
		} catch (e) {
			return message.reply("❌ Error: " + e.message);
		}
	}
};

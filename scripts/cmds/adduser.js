module.exports = {
	config: {
		name: "adduser",
		version: "1.5.0",
		author: "SK-SIDDIK-KHAN",
		countDown: 5,
		role: 1,
		usePrefix: true,
		description: {
			vi: "Thêm thành viên vào box chat của bạn",
			en: "Add user to box chat of you",
		},
		category: "box chat",
		guide: {
			en: "   {pn} [phone number | jid]",
		},
	},

	langs: {
		vi: {
			alreadyInGroup: "Đã có trong nhóm",
			successAdd: "- Đã thêm thành công %1 thành viên vào nhóm",
			failedAdd: "- Không thể thêm %1 thành viên vào nhóm",
			approve: "- Đã thêm %1 thành viên vào danh sách phê duyệt",
			invalidLink: "Vui lòng nhập số điện thoại hợp lệ",
			cannotGetUid: "Không thể lấy được uid của người dùng này",
			linkNotExist: "Profile url này không tồn tại",
			cannotAddUser:
				"Bot bị chặn tính năng hoặc người dùng này chặn người lạ thêm vào nhóm",
		},
		en: {
			alreadyInGroup: "Already in group",
			successAdd: "- Successfully added %1 members to the group",
			failedAdd: "- Failed to add %1 members to the group",
			approve: "- Added %1 members to the approval list",
			invalidLink: "Please enter a valid phone number",
			cannotGetUid: "Cannot get uid of this user",
			linkNotExist: "This profile url does not exist",
			cannotAddUser:
				"Bot is blocked or this user blocked strangers from adding to the group",
		},
	},

	onStart: async function ({ api, event, args, message, getLang }) {
		if (!event.isGroup)
			return message.reply("❌ This command only works in groups.");
		if (!args[0])
			return message.reply(
				getLang("invalidLink") ||
					"❌ Please provide a phone number. Example: !adduser 8801XXXXXXXXX",
			);

		const raw = args[0].replace(/[^0-9]/g, "");
		const jid = raw + "@s.whatsapp.net";
		const phone = raw;

		try {
			await api.addUserToGroup(event.threadID, [jid]);
			return message.reply(
				(
					getLang("successAdd") ||
					"- Successfully added %1 members to the group"
				).replace("%1", phone),
			);
		} catch (e) {
			return message.reply(
				(getLang("cannotAddUser") || "❌ Failed to add user: ") + e.message,
			);
		}
	},
};

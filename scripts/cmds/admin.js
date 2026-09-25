module.exports = {
	config: {
		name: "admin",
		version: "1.5.0",
		author: "SK-SIDDIK-KHAN",
		countDown: 5,
		role: 1,
		usePrefix: true,
		description: {
			vi: "Thăng cấp hoặc hạ cấp thành viên nhóm thành admin. Bot phải là admin nhóm",
			en: "Promotes or demotes a group member as admin. Bot must be a group admin"
		},
		category: "group",
		guide: {
			en: "{pn} promote/demote [@mention | reply]"
		}
	},

	langs: {
		vi: {
			onlyGroup: "❌ Lệnh này chỉ dùng trong nhóm",
			usage: "❌ Cách dùng: !admin promote/demote [@mention | reply]",
			promoted: "✅ @%1 đã được thăng cấp thành admin nhóm",
			demoted: "✅ @%1 đã bị hạ cấp khỏi admin nhóm",
			failed: "❌ Thất bại: %1\n(Hãy chắc bot là admin nhóm)"
		},
		en: {
			onlyGroup: "❌ This command only works in groups",
			usage: "❌ Usage: !admin promote/demote [@mention | reply]",
			promoted: "✅ @%1 has been promoted to group admin",
			demoted: "✅ @%1 has been demoted from group admin",
			failed: "❌ Failed: %1\n(Make sure the bot is a group admin)"
		}
	},

	onStart: async function ({ api, event, args, message, getLang }) {
		if (!event.isGroup)
			return message.reply(getLang("onlyGroup"));

		const action = (args[0] || "").toLowerCase();
		if (action !== "promote" && action !== "demote") {
			return message.reply(getLang("usage"));
		}

		const relevantArgs = args.slice(1);
		const targetUID = getTargetUser(event, relevantArgs);
		const phone = jidToPhone(targetUID);

		try {
			if (action === "promote") {
				await api.promoteAdmin(event.threadID, [targetUID]);
				return message.reply({
					body: getLang("promoted", phone),
					mentions: [targetUID]
				});
			} else {
				await api.demoteAdmin(event.threadID, [targetUID]);
				return message.reply({
					body: getLang("demoted", phone),
					mentions: [targetUID]
				});
			}
		} catch (e) {
			return message.reply(getLang("failed", e.message));
		}
	}
};

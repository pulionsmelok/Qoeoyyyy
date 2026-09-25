const fs = require("fs-extra");

module.exports = {
	config: {
    name: "prefix",
        aliases: [],
        version: "1.5.0",
        author: "SK-SIDDIK-KHAN",
        countDown: 5,
        role: 0,
        usePrefix: true,
    description: {
            en: "Thay đổi dấu lệnh của bot trong box chat của bạn hoặc cả hệ thống bot (chỉ admin bot)"
        },
        category: "config",
        guide: {
            vi: "   {pn} <new prefix>: thay đổi prefix mới trong box chat của bạn"
        			+ "\n   Ví dụ:"
        			+ "\n    {pn} #"
        			+ "\n\n   {pn} <new prefix> -g: thay đổi prefix mới trong hệ thống bot (chỉ admin bot)"
        			+ "\n   Ví dụ:"
        			+ "\n    {pn} # -g"
        			+ "\n\n   {pn} reset: thay đổi prefix trong box chat của bạn về mặc định",
            en: "   {pn} <new prefix>: change new prefix in your box chat"
        			+ "\n   Example:"
        			+ "\n    {pn} #"
        			+ "\n\n   {pn} <new prefix> -g: change new prefix in system bot (only admin bot)"
        			+ "\n   Example:"
        			+ "\n    {pn} # -g"
        			+ "\n\n   {pn} reset: change prefix in your box chat to default",
            bn: "   {pn} <new prefix>: change new prefix in আপনার box chat"
        			+ "\n   Example:"
        			+ "\n    {pn} #"
        			+ "\n\n   {pn} <new prefix> -g: change new prefix in system bot (only admin bot)"
        			+ "\n   Example:"
        			+ "\n    {pn} # -g"
        			+ "\n\n   {pn} reset: change prefix in আপনার box chat এ ডিফল্ট"
        }
},
	langs: {
		vi: {
			reset: "Đã reset prefix của bạn về mặc định: %1",
			onlyAdmin: "Chỉ admin mới có thể thay đổi prefix hệ thống bot",
			confirmGlobal: "Vui lòng thả cảm xúc bất kỳ vào tin nhắn này để xác nhận thay đổi prefix của toàn bộ hệ thống bot",
			confirmThisThread: "Vui lòng thả cảm xúc bất kỳ vào tin nhắn này để xác nhận thay đổi prefix trong nhóm chat của bạn",
			successGlobal: "Đã thay đổi prefix hệ thống bot thành: %1",
			successThisThread: "Đã thay đổi prefix trong nhóm chat của bạn thành: %1",
			myPrefix: "🌐 Prefix của hệ thống: %1\n🛸 Prefix của nhóm bạn: %2"
		},
		en: {
			reset: "Your prefix has been reset to default: %1",
			onlyAdmin: "Only admin can change prefix of system bot",
			confirmGlobal: "Please react to this message to confirm change prefix of system bot",
			confirmThisThread: "Please react to this message to confirm change prefix in your box chat",
			successGlobal: "Changed prefix of system bot to: %1",
			successThisThread: "Changed prefix in your box chat to: %1",
			myPrefix: "🌐 System prefix: %1\n🛸 Your box chat prefix: %2"
		},
		bn: {
			reset: "আপনার prefix has been reset এ ডিফল্ট: %1",
			onlyAdmin: "শুধুমাত্র অ্যাডমিন can change prefix এর system bot",
			confirmGlobal: "অনুগ্রহ করে এই বার্তায় রিঅ্যাক্ট করুন এ this বার্তা এ নিশ্চিত change prefix এর system bot",
			confirmThisThread: "অনুগ্রহ করে এই বার্তায় রিঅ্যাক্ট করুন এ this বার্তা এ নিশ্চিত change prefix in আপনার box chat",
			successGlobal: "পরিবর্তন করা হয়েছে prefix এর system bot এ: %1",
			successThisThread: "পরিবর্তন করা হয়েছে prefix in আপনার box chat এ: %1",
			myPrefix: "🌐 System prefix: %1\n🛸 আপনার box chat prefix: %2"
		}
	},
	onStart: async function ({ message, role, args, commandName, event, threadsData, getLang }) {
		if (!args[0])
			return message.reply(getLang("myPrefix", global.GoatBot.config.prefix, await global.getThreadPrefix(event.threadID)));
		if (args[0] == 'reset') {
			await threadsData.set(event.threadID, null, "data.prefix");
			return message.reply(getLang("reset", global.GoatBot.config.prefix));
		}
		const newPrefix = args[0];
		const formSet = {
			commandName,
			author: event.senderID,
			newPrefix
		};
		if (args[1] === "-g")
			if (role < 2)
				return message.reply(getLang("onlyAdmin"));
			else
				formSet.setGlobal = true;
		else
			formSet.setGlobal = false;
		return message.reply(args[1] === "-g" ? getLang("confirmGlobal") : getLang("confirmThisThread"), (err, info) => {
			formSet.messageID = info.messageID;
			global.GoatBot.onReply.set(info.messageID, formSet);
		});
	},
	onReply: async function ({ message, threadsData, event, Reply, getLang }) {
		const { author, newPrefix, setGlobal } = Reply;
		if (event.senderID !== author)
			return;
		if (setGlobal) {
			global.GoatBot.config.prefix = newPrefix;
			fs.writeFileSync(global.client.dirConfig, JSON.stringify(global.GoatBot.config, null, 2));
			return message.reply(getLang("successGlobal", newPrefix));
		}
		else {
			await threadsData.set(event.threadID, newPrefix, "data.prefix");
			return message.reply(getLang("successThisThread", newPrefix));
		}
	},
	onChat: async function ({ event, message, getLang }) {
		if (event.body && event.body.toLowerCase() === "prefix") {
			const threadPrefix = typeof global.getThreadPrefix === "function"
				? await global.getThreadPrefix(event.threadID)
				: (global.GoatBot.config.prefix || ".");
			return message.reply(getLang("myPrefix", global.GoatBot.config.prefix, threadPrefix));
		}
	}
};

const DIG = require("@zorner/discord-image-generation");
const axios = require("axios");

module.exports = {
	config: {
		name: "buttslap",
		aliases: ["slap"],
		version: "1.5.0",
		author: "SK-SIDDIK-KHAN",
		countDown: 5,
		role: 0,
		description: {
			vi: "Slaps someone on their butt using their avatar.",
			en: "Slaps someone on their butt using their avatar.",
		},
		usePrefix: true,
		category: "fun",
		guide: { en: "{pn} [@mention]" },
	},
	langs: {
		vi: {
			needMention: "❌ Hãy tag ai đó",
			error: "❌ Lỗi tạo ảnh: %1"
		},
		en: {
			needMention: "❌ Please mention someone",
			error: "❌ Error generating image: %1"
		}
	},

	onStart: async function ({ api, event, args, message, getLang }) {
		let mentionJid = null;
		if (event.mentions && event.mentions.length > 0) {
			mentionJid = event.mentions[0];
		} else if (event.mentions && Object.keys(event.mentions).length > 0) {
			mentionJid = Object.keys(event.mentions)[0];
		}

		if (!mentionJid) {
			return message.reply(getLang("needMention"));
		}

		try {
			const one = event.senderID;
			const two = mentionJid;

			const oneUrl = await global.db.usersData.getAvatarUrl(api, one);
			const twoUrl = await global.db.usersData.getAvatarUrl(api, two);

			const [resOne, resTwo] = await Promise.all([
				axios.get(oneUrl, { responseType: "arraybuffer", timeout: 8000 }),
				axios.get(twoUrl, { responseType: "arraybuffer", timeout: 8000 }),
			]);

			const avatarOne = Buffer.from(resOne.data);
			const avatarTwo = Buffer.from(resTwo.data);

			const imgBuffer = await new DIG.Batslap().getImage(avatarOne, avatarTwo);

			await api.sendImage(imgBuffer, event.threadID, "👋😹 move your butt");
		} catch (e) {
			console.error(e);
			await message.reply(getLang("error", e.message));
		}
	},
};

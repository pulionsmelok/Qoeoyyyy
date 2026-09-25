const fs = require("fs");
const path = require("path");
const Canvas = require("canvas");
const os = require("os");

module.exports = {
	config: {
    name: "uptime1",
		aliases: ["up1"],
		version: "1.5.0",
		author: "SK-SIDDIK-KHAN",
		countDown: 5,
		role: 0,
		usePrefix: true,
    description: {
            en: "Shows uptime, ping, CPU load and owner information."
        },
        category: "image",
        guide: {
            en: "{pn}"
        }
},
    langs: {
        en: { syntaxError: "Please use the correct syntax: {pn}!" }
    },
	onStart: async function ({ message }) {
		let filePath = null;
		try {
			const pingMsg = await message.reply({
				body: "⚡ 𝐂𝐡𝐞𝐜𝐤𝐢𝐧𝐠..."
			});
			const uptime = process.uptime();
			const days = Math.floor(uptime / 86400);
			const hours = Math.floor((uptime % 86400) / 3600);
			const minutes = Math.floor((uptime % 3600) / 60);
			const seconds = Math.floor(uptime % 60);
			const uptimeStr =
				`${days > 0 ? days + "d " : ""}` +
				`${hours}h ${minutes}m ${seconds}s`;
			let ping = null;
			try {
				const pingStart = process.hrtime.bigint();
				const controller = new AbortController();
				const timeout = setTimeout(() => {
					controller.abort();
				}, 5000);
				try {
					await fetch("https://www.google.com/generate_204", {
						method: "GET",
						cache: "no-store",
						signal: controller.signal
					});
				} finally {
					clearTimeout(timeout);
				}
				const pingEnd = process.hrtime.bigint();
				ping = Math.round(Number(pingEnd - pingStart) / 1e6);
			} catch (err) {
				console.error("Ping check failed:", err.message);
				ping = null;
			}
			const pingDisplay = ping === null ? "N/A" : `${ping} ms`;
			let cpuUsage = "N/A";
			try {
				if (typeof os.loadavg === "function") {
					cpuUsage = os.loadavg()[0].toFixed(2);
				}
			} catch {
				cpuUsage = "N/A";
			}
			const owner = "SK-SIDDIK";
			const canvas = Canvas.createCanvas(1000, 500);
			const ctx = canvas.getContext("2d");
			const bgImg = await Canvas.loadImage("https://i.imgur.com/UtV4VNy.jpeg");
			ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
			const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
			gradient.addColorStop(0, "rgba(0,0,0,0.25)");
			gradient.addColorStop(1, "rgba(0,0,0,0.55)");
			ctx.fillStyle = gradient;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.shadowColor = "rgba(0,0,0,0.7)";
			ctx.shadowOffsetX = 3;
			ctx.shadowOffsetY = 3;
			ctx.shadowBlur = 8;
			const leftMargin = 40;
			let startY = 120;
			ctx.fillStyle = "#FFD700";
			ctx.font = "bold 60px Sans";
			ctx.textAlign = "left";
			ctx.fillText("𝐁𝐎𝐓 𝐒𝐓𝐀𝐓𝐔𝐒", leftMargin, startY);
			const infoTexts = [
				` 𝐔𝐩𝐭𝐢𝐦𝐞: ${uptimeStr}`,
				` 𝐏𝐢𝐧𝐠: ${pingDisplay}`,
				` 𝐂𝐏𝐔 𝐋𝐨𝐚𝐝: ${cpuUsage}`,
				`𝐎𝐰𝐧𝐞𝐫: ${owner}`
			];
			ctx.fillStyle = "#F0F0F0";
			ctx.font = "bold 40px Sans";
			startY += 80;
			for (const text of infoTexts) {
				ctx.fillText(text, leftMargin, startY);
				startY += 70;
			}
			filePath = path.join(__dirname, `up-${Date.now()}.png`);
			await fs.promises.writeFile(filePath, canvas.toBuffer("image/png"));
			if (!fs.existsSync(filePath)) {
				throw new Error("Image was not generated.");
			}
			if (fs.statSync(filePath).size <= 0) {
				throw new Error("Generated image is empty.");
			}
			const bodyText =
				`┌─[ 𝐒𝐈𝐃𝐃𝐈𝐊 𝐁𝐎𝐓 ]\n` +
				`├‣ 𝐔𝐩𝐭𝐢𝐦𝐞: ${uptimeStr}\n` +
				`├‣ 𝐏𝐢𝐧𝐠: ${pingDisplay}\n` +
				`├‣ 𝐂𝐏𝐔 𝐋𝐨𝐚𝐝: ${cpuUsage}\n` +
				`├‣𝐎𝐰𝐧𝐞𝐫: ${owner}\n` +
				`└─────────────┘`;
			await message.reply({
				body: bodyText,
				attachment: filePath
			});
			setTimeout(async () => {
				try {
					if (pingMsg?.message_id) {
						await message.unsend(pingMsg.message_id);
					}
				} catch {}
				try {
					if (filePath && fs.existsSync(filePath)) {
						fs.unlinkSync(filePath);
					}
				} catch {}
			}, 5000);
		} catch (err) {
			console.error("❌ UP Command Error:", err);
			try {
				if (filePath && fs.existsSync(filePath)) {
					fs.unlinkSync(filePath);
				}
			} catch {}
			return message.reply(`❌ 𝐂𝐨𝐮𝐥𝐝 𝐧𝐨𝐭 𝐠𝐞𝐧𝐞𝐫𝐚𝐭𝐞 𝐬𝐭𝐚𝐭𝐮𝐬.\n\n${err.message || err}`);
		}
	}
};

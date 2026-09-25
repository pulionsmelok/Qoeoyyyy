const { createCanvas } = require("canvas");
const fs = require("fs");
const os = require("os");
const path = require("path");

module.exports = {
	config: {
    name: "upt2",
		aliases: ["dashboard", "up2"],
		version: "1.5.0",
		author: "SK-SIDDIK-KHAN",
		countDown: 5,
		role: 0,
		usePrefix: true,
    description: {
            en: "Shows uptime, RAM, CPU, ping with inner card and body message"
        },
        category: "system",
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
			const uptimeBot = process.uptime();
			const uptimeSystem = os.uptime();
			const formatTime = (sec) => {
				const d = Math.floor(sec / 86400);
				const h = Math.floor((sec % 86400) / 3600);
				const m = Math.floor((sec % 3600) / 60);
				const s = Math.floor(sec % 60);
				return `${d}d ${h}h ${m}m ${s}s`;
			};
			const totalMem = os.totalmem() / 1024 / 1024;
			const freeMem = os.freemem() / 1024 / 1024;
			const usedMem = totalMem - freeMem;
			const ramPercent = ((usedMem / totalMem) * 100).toFixed(1);
			const cpus = os.cpus();
			const cpuModel = cpus?.[0]?.model || "Unknown";
			const cores = cpus?.length || 0;
			const platform = `${os.platform()} (${os.arch()})`;
			const hostname = os.hostname();
			const botMemory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
			let ping = null;
			try {
				const controller = new AbortController();
				const timeout = setTimeout(() => {
					controller.abort();
				}, 5000);
				const pingStart = process.hrtime.bigint();
				try {
					await fetch("https://www.google.com/generate_204", {
						method: "GET",
						cache: "no-store",
						signal: controller.signal,
					});
					const pingEnd = process.hrtime.bigint();
					ping = Math.round(Number(pingEnd - pingStart) / 1000000);
				} finally {
					clearTimeout(timeout);
				}
			} catch (err) {
				console.error("Real ping error:", err.message);
				ping = null;
			}
			const pingDisplay = ping === null ? "N/A" : `${ping} ms`;
			const width = 600;
			const height = 460;
			const canvas = createCanvas(width, height);
			const ctx = canvas.getContext("2d");
			ctx.fillStyle = "#0c1420";
			ctx.fillRect(0, 0, width, height);
			const leftGlow = ctx.createLinearGradient(0, 0, 100, 0);
			leftGlow.addColorStop(0, "rgba(0, 255, 255, 0.45)");
			leftGlow.addColorStop(1, "rgba(0, 255, 255, 0)");
			ctx.fillStyle = leftGlow;
			ctx.fillRect(0, 0, 100, height);
			const rightGlow = ctx.createLinearGradient(width - 100, 0, width, 0);
			rightGlow.addColorStop(0, "rgba(0, 255, 255, 0)");
			rightGlow.addColorStop(1, "rgba(0, 255, 255, 0.45)");
			ctx.fillStyle = rightGlow;
			ctx.fillRect(width - 100, 0, 100, height);
			const cardX = 30;
			const cardY = 60;
			const cardWidth = width - 60;
			const cardHeight = height - 100;
			ctx.fillStyle = "#1a1f2b";
			ctx.shadowColor = "#00bfff";
			ctx.shadowBlur = 20;
			ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
			ctx.shadowBlur = 0;
			ctx.fillStyle = "#00bfff";
			ctx.font = "22px Roboto";
			ctx.shadowColor = "#00d5ff";
			ctx.shadowBlur = 18;
			ctx.fillText("SIDDIK-BOT V2", 50, 40);
			const labels = [
				"Bot Uptime",
				"System Uptime",
				"CPU",
				"RAM Usage",
				"Platform",
				"Node.js",
				"Host",
				"Ping",
				"Memory",
				"Dev"
			];
			const values = [
				formatTime(uptimeBot),
				formatTime(uptimeSystem),
				`${cpuModel} (${cores} cores)`,
				`${usedMem.toFixed(0)} / ${totalMem.toFixed(0)} MB`,
				platform,
				process.version,
				hostname,
				pingDisplay,
				`${botMemory} MB`,
				"SK-SIDDIK"
			];
			const labelColors = [
				"#00ff7f",
				"#00ffff",
				"#ff00ff",
				"#ff4500",
				"#1e90ff",
				"#ffd700",
				"#7fff00",
				"#ff69b4",
				"#00bfff",
				"#ffa500"
			];
			ctx.font = "15px Roboto";
			labels.forEach((label, i) => {
				const y = cardY + 40 + i * 30;
				ctx.shadowBlur = 12;
				ctx.shadowColor = labelColors[i];
				ctx.fillStyle = labelColors[i];
				ctx.textAlign = "left";
				ctx.textBaseline = "alphabetic";
				ctx.fillText(label, cardX + 20, y);
				ctx.shadowColor = "#68c6ff";
				ctx.shadowBlur = 5;
				ctx.fillStyle = "#ffffff";
				ctx.fillText(values[i], cardX + 180, y, cardWidth - 200);
			});
			const centerX = cardX + cardWidth - 70;
			const centerY = cardY + 60;
			const radius = 45;
			const startAngle = -Math.PI / 2;
			const endAngle = startAngle + (2 * Math.PI * Number(ramPercent)) / 100;
			ctx.shadowBlur = 0;
			ctx.beginPath();
			ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
			ctx.strokeStyle = "#111";
			ctx.lineWidth = 7;
			ctx.stroke();
			const grad = ctx.createLinearGradient(
				centerX - radius,
				centerY - radius,
				centerX + radius,
				centerY + radius
			);
			grad.addColorStop(0, "#00ffff");
			grad.addColorStop(0.5, "#00bfff");
			grad.addColorStop(1, "#1e90ff");
			ctx.beginPath();
			ctx.arc(centerX, centerY, radius, startAngle, endAngle);
			ctx.strokeStyle = grad;
			ctx.lineWidth = 7;
			ctx.shadowColor = "#00ffff";
			ctx.shadowBlur = 20;
			ctx.stroke();
			ctx.shadowBlur = 12;
			ctx.shadowColor = "#00bfff";
			ctx.fillStyle = "#00bfff";
			ctx.font = "14px Roboto";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(`${ramPercent}%`, centerX, centerY);
			ctx.font = "16px Roboto";
			ctx.fillStyle = "#00ffff";
			ctx.shadowColor = "#00ffff";
			ctx.shadowBlur = 15;
			ctx.textAlign = "center";
			ctx.textBaseline = "alphabetic";
			ctx.fillText("Bot is running smoothly", width / 2, height - 20);
			const buffer = canvas.toBuffer("image/png");
			filePath = path.join(__dirname, `status_card_${Date.now()}.png`);
			await fs.promises.writeFile(filePath, buffer);
			if (!fs.existsSync(filePath)) {
				throw new Error("Image file তৈরি হয়নি।");
			}
			await message.reply({
				body: "👑 DEV : SK SIDDIK",
				attachment: filePath
			});
			setTimeout(() => {
				try {
					if (filePath && fs.existsSync(filePath)) {
						fs.unlinkSync(filePath);
					}
				} catch (err) {
					console.error("File delete error:", err.message);
				}
			}, 10000);
		} catch (err) {
			console.error("❌ UP Command Error:", err);
			try {
				if (filePath && fs.existsSync(filePath)) {
					fs.unlinkSync(filePath);
				}
			} catch {}
			return message.reply(`❌ Dashboard generate problem.\n\n${String(err.message || err)}`);
		}
	}
};

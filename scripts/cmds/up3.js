const fs = require("fs");
const path = require("path");
const Canvas = require("canvas");

module.exports = {
	config: {
    name: "up3",
		aliases: ["uptime3", "upt3"],
		version: "1.5.0",
		author: "SK-SIDDIK-KHAN",
		countDown: 5,
		role: 0,
		usePrefix: true,
    description: {
            en: "Premium bot status dashboard"
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
		try {
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
				const timeout = setTimeout(() => controller.abort(), 5000);
				try {
					await fetch("https://www.google.com/generate_204", {
						method: "GET",
						cache: "no-store",
						signal: controller.signal
					});
				} finally {
					clearTimeout(timeout);
				}
				ping = Number(process.hrtime.bigint() - pingStart) / 1000000;
			} catch (err) {
				console.error("Ping check failed:", err.message);
				ping = null;
			}
			const pingText = ping === null ? "N/A" : `${ping.toFixed(0)} ms`;
			const memory = process.memoryUsage();
			const memUsed = (memory.heapUsed / 1024 / 1024).toFixed(2);
			const memTotal = (memory.heapTotal / 1024 / 1024).toFixed(2);
			const memPercent = ((Number(memUsed) / Number(memTotal)) * 100).toFixed(1);
			const cpu = process.cpuUsage();
			const cpuUsage = Math.min(((cpu.user + cpu.system) / 1000000) % 100, 100);
			const nodeVersion = process.version;
			const platform = process.platform.toUpperCase();
			const arch = process.arch;
			const canvas = Canvas.createCanvas(1400, 900);
			const ctx = canvas.getContext("2d");
			function roundedRect(ctx, x, y, w, h, r) {
				ctx.beginPath();
				ctx.moveTo(x + r, y);
				ctx.lineTo(x + w - r, y);
				ctx.quadraticCurveTo(x + w, y, x + w, y + r);
				ctx.lineTo(x + w, y + h - r);
				ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
				ctx.lineTo(x + r, y + h);
				ctx.quadraticCurveTo(x, y + h, x, y + h - r);
				ctx.lineTo(x, y + r);
				ctx.quadraticCurveTo(x, y, x + r, y);
				ctx.closePath();
			}
			const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
			bg.addColorStop(0, "#000428");
			bg.addColorStop(1, "#004e92");
			ctx.fillStyle = bg;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			const containerX = 30;
			const containerY = 30;
			const containerW = 1340;
			const containerH = 840;
			ctx.fillStyle = "rgba(255,255,255,0.07)";
			roundedRect(ctx, containerX, containerY, containerW, containerH, 45);
			ctx.fill();
			ctx.fillStyle = "rgba(0,0,0,0.35)";
			roundedRect(ctx, containerX, containerY, containerW, 150, 45);
			ctx.fill();
			ctx.textAlign = "center";
			ctx.font = "bold 64px Segoe UI";
			ctx.fillStyle = "#FFFFFF";
			ctx.fillText("BOT STATUS DASHBOARD", canvas.width / 2, containerY + 85);
			ctx.font = "italic 28px Segoe UI";
			ctx.fillStyle = "rgba(255,255,255,0.8)";
			ctx.fillText("All systems running smoothly", canvas.width / 2, containerY + 125);
			const stats = [
				{
					icon: "⌛",
					title: "SYSTEM UPTIME",
					value: uptimeStr,
					sub: "Running Time",
					color: "#FFD700",
					bar: Math.min((uptime / 3600) * 4.1667, 100)
				},
				{
					icon: "⚡",
					title: "NETWORK PING",
					value: pingText,
					sub: "Google Network Latency",
					color: "#00FFAA",
					bar: ping === null ? 0 : Math.max(0, Math.min(100, 100 - (ping / 500) * 100))
				},
				{
					icon: "💾",
					title: "MEMORY USAGE",
					value: `${memUsed} MB`,
					sub: `${memPercent}% of ${memTotal} MB`,
					color: "#00FF00",
					bar: Number(memPercent)
				},
				{
					icon: "🔥",
					title: "CPU LOAD",
					value: `${cpuUsage.toFixed(1)}%`,
					sub: "Processor",
					color: "#FFAA00",
					bar: cpuUsage
				},
				{
					icon: "◉",
					title: "NODE VERSION",
					value: nodeVersion,
					sub: `${platform} • ${arch}`,
					color: "#9D4EDD",
					bar: 100
				},
				{
					icon: "👑",
					title: "BOT OWNER",
					value: "SK-SIDDIK",
					sub: "Administrator",
					color: "#FFA500",
					bar: 100
				}
			];
			const boxW = 610;
			const boxH = 190;
			const startX = 70;
			const startY = 210;
			stats.forEach((s, i) => {
				const row = Math.floor(i / 2);
				const col = i % 2;
				const x = startX + col * 660;
				const y = startY + row * 210;
				ctx.fillStyle = "rgba(0,0,0,0.35)";
				roundedRect(ctx, x, y, boxW, boxH, 28);
				ctx.fill();
				ctx.strokeStyle = s.color;
				ctx.lineWidth = 3;
				roundedRect(ctx, x, y, boxW, boxH, 28);
				ctx.stroke();
				ctx.textAlign = "left";
				ctx.font = "bold 25px Segoe UI";
				ctx.fillStyle = s.color;
				ctx.fillText(s.icon, x + 30, y + 55);
				ctx.font = "bold 26px Segoe UI";
				ctx.fillStyle = "#FFFFFF";
				ctx.fillText(s.title, x + 130, y + 50);
				ctx.font = "18px Segoe UI";
				ctx.fillStyle = "rgba(255,255,255,0.7)";
				ctx.fillText(s.sub, x + 130, y + 82);
				ctx.font = "bold 36px Segoe UI";
				ctx.fillStyle = s.color;
				ctx.textAlign = "right";
				ctx.fillText(s.value, x + boxW - 30, y + 135);
				const barX = x + 30;
				const barY = y + 158;
				const barW = boxW - 60;
				const barH = 12;
				ctx.fillStyle = "rgba(255,255,255,0.15)";
				roundedRect(ctx, barX, barY, barW, barH, 6);
				ctx.fill();
				const progress = Math.max(0, Math.min(s.bar, 100));
				if (progress > 0) {
					ctx.fillStyle = s.color;
					roundedRect(ctx, barX, barY, (barW * progress) / 100, barH, 6);
					ctx.fill();
				}
				ctx.textAlign = "center";
				ctx.font = "bold 15px Segoe UI";
				ctx.fillStyle = "#FFFFFF";
				ctx.fillText(`${progress.toFixed(1)}%`, x + boxW / 2, barY - 10);
			});
			const imageBuffer = canvas.toBuffer("image/png");
			if (!imageBuffer.length) throw new Error("Generated image is empty.");
			const fs2 = require("fs");
			const path2 = require("path");
			const cacheDir2 = path2.join(__dirname, "cache");
			if (!fs2.existsSync(cacheDir2)) fs2.mkdirSync(cacheDir2, { recursive: true });
			const tmpPath2 = path2.join(cacheDir2, `up3_${Date.now()}.png`);
			fs2.writeFileSync(tmpPath2, imageBuffer);
			await message.reply({
				body: "👑 DEV : SK SIDDIK",
				attachment: fs2.createReadStream(tmpPath2)
			});
			setTimeout(() => { try { fs2.unlinkSync(tmpPath2); } catch (e) {} }, 12000);
			setTimeout(() => {
				try {
					if (filePath && fs.existsSync(filePath)) {
						fs.unlinkSync(filePath);
					}
				} catch (err) {
					console.error("Temp file delete error:", err.message);
				}
			}, 10000);
		} catch (err) {
			console.error("❌ Uptime Dashboard Error:", err);
			try {
				if (filePath && fs.existsSync(filePath)) {
					fs.unlinkSync(filePath);
				}
			} catch {}
			return message.reply(`❌ Dashboard generate problem.\n\n${String(err.message || err)}`);
		}
	}
};

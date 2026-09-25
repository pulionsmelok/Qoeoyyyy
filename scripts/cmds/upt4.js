const os = require("os");

function formatBytes(bytes) {
	if (!Number.isFinite(bytes) || bytes < 0) return "N/A";
	if (bytes === 0) return "0 B";

	const units = ["B", "KB", "MB", "GB", "TB"];
	const index = Math.min(
		Math.floor(Math.log(bytes) / Math.log(1024)),
		units.length - 1
	);

	return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatTime(seconds) {
	seconds = Math.floor(Math.max(0, seconds));

	const days = Math.floor(seconds / 86400);
	seconds %= 86400;

	const hours = Math.floor(seconds / 3600);
	seconds %= 3600;

	const minutes = Math.floor(seconds / 60);
	const secs = seconds % 60;

	return [
		days ? `${days}d` : "",
		hours ? `${hours}h` : "",
		minutes ? `${minutes}m` : "",
		`${secs}s`
	].filter(Boolean).join(" ");
}

function getVersion() {
	try {
		return require("../../package.json").version;
	} catch (_) {
		try {
			return require("../package.json").version;
		} catch (_) {
			return "N/A";
		}
	}
}

module.exports = {
	config: {
		name: "uptime4",
		aliases: ["up4", "upt4", "runtime4"],
		version: "2.0.0",
		author: "SK-SIDDIK-KHAN",
		countDown: 2,
		role: 0,
		usePrefix: true,
		category: "info",
		shortDescription: {
			en: "Show bot runtime and system information"
		},
		guide: {
			en: "{pn}"
		}
	},

	onStart: async function ({ event, api }) {
		const threadID = String(event.threadID);
		const messageID = event.messageID;

		try {
			const botUptime = process.uptime();
			const systemUptime = os.uptime();
			const memory = process.memoryUsage();

			const totalMemory = os.totalmem();
			const freeMemory = os.freemem();
			const usedMemory = totalMemory - freeMemory;

			const cpus = os.cpus();
			const cpuModel = cpus?.[0]?.model || "N/A";
			const cpuCores = cpus?.length || 0;
			const cpuSpeed = cpus?.[0]?.speed
				? `${(cpus[0].speed / 1000).toFixed(2)} GHz`
				: "N/A";

			const load = os.loadavg();

			const startedAt = new Date(
				Date.now() - botUptime * 1000
			)
				.toISOString()
				.replace("T", " ")
				.replace(/\..+$/, " UTC");

			const memoryPercent = totalMemory > 0
				? ((usedMemory / totalMemory) * 100).toFixed(1)
				: "0.0";

			const botVersion = getVersion();

			let ping = "N/A";

			try {
				const start = Date.now();
				await api.getMe();
				ping = `${Date.now() - start} ms`;
			} catch (_) {}

			const body = [
				"╭────────────────────⭓",
				"│ ☠️ GOATBOT ☠️",
				"├────────────────────⭔",
				"├── ❏ BOT RUNTIME ❏ ──⭔",
				`│   ▪ Uptime: ${formatTime(botUptime)}`,
				`│   ▪ Started: ${startedAt}`,
				`│   ▪ PID: ${process.pid}`,
				"├── ❏ SYSTEM ❏ ──⭔",
				`│   ▪ Host: ${os.hostname()}`,
				`│   ▪ OS: ${os.type()} ${os.release()}`,
				`│   ▪ Platform: ${process.platform}/${process.arch}`,
				`│   ▪ System uptime: ${formatTime(systemUptime)}`,
				"├── ❏ CPU ❏ ──⭔",
				`│   ▪ Model: ${cpuModel}`,
				`│   ▪ Cores: ${cpuCores}`,
				`│   ▪ Speed: ${cpuSpeed}`,
				`│   ▪ Load: ${Number(load[0] || 0).toFixed(2)} / ${Number(load[1] || 0).toFixed(2)} / ${Number(load[2] || 0).toFixed(2)}`,
				"├── ❏ HOST MEMORY ❏ ──⭔",
				`│   ▪ Used: ${formatBytes(usedMemory)}`,
				`│   ▪ Free: ${formatBytes(freeMemory)}`,
				`│   ▪ Total: ${formatBytes(totalMemory)}`,
				`│   ▪ Usage: ${memoryPercent}%`,
				"├── ❏ BOT MEMORY ❏ ──⭔",
				`│   ▪ RSS: ${formatBytes(memory.rss)}`,
				`│   ▪ Heap: ${formatBytes(memory.heapUsed)} / ${formatBytes(memory.heapTotal)}`,
				`│   ▪ External: ${formatBytes(memory.external)}`,
				`│   ▪ ArrayBuffers: ${formatBytes(memory.arrayBuffers || 0)}`,
				"├── ❏ TELEGRAM ❏ ──⭔",
				`│   ▪ API Ping: ${ping}`,
				"├────────────────────⭔",
				`│ Node.js: ${process.version}`,
				`│ Bot Version: v${botVersion}`,
				"╰────────────────────⭔"
			].join("\n");

			return await api.sendMessage(
				body,
				threadID,
				null,
				messageID
			);
		} catch (error) {
			console.error("UPTIME ERROR:", error);

			return api.sendMessage(
				"❌ Failed to fetch uptime.",
				threadID,
				null,
				messageID
			);
		}
	}
};
const os = require("os");
const process = require("process");

module.exports = {
    config: {
    name: "upt",
        aliases: [],
        version: "1.5.0",
        author: "SK-SIDDIK-KHAN",
        countDown: 5,
        role: 0,
        usePrefix: true,
    description: {
            en: "Get system and bot uptime information"
        },
        category: "utility",
        guide: {
            en: "{pn}"
        }
},
    langs: {
        en: { syntaxError: "Please use the correct syntax: {pn}!" }
    },
    onStart: async function ({ message }) {
        try {
            function formatUptime(totalSeconds) {
                let seconds = Math.max(0, Math.floor(totalSeconds));
                const days = Math.floor(seconds / 86400);
                seconds %= 86400;
                const hours = Math.floor(seconds / 3600);
                seconds %= 3600;
                const minutes = Math.floor(seconds / 60);
                seconds %= 60;
                const parts = [];
                if (days > 0) parts.push(`${days}d`);
                if (hours > 0 || days > 0) parts.push(`${hours}h`);
                if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
                parts.push(`${seconds}s`);
                return parts.join(" ");
            }
            const systemUptime = formatUptime(os.uptime());
            const processUptime = formatUptime(process.uptime());
            const cpus = os.cpus();
            const systemInfo = {
                os: `${os.type()} ${os.release()}`,
                cores: cpus.length,
                architecture: os.arch(),
                node: process.version,
                totalMemory: (os.totalmem() / (1024 ** 3)).toFixed(2) + " GB",
                freeMemory: (os.freemem() / (1024 ** 3)).toFixed(2) + " GB",
                ramUsage: ((os.totalmem() - os.freemem()) / (1024 ** 2)).toFixed(2) + " MB"
            };
            let totalUsers = 0;
            let totalThreads = 0;
            try {
                if (Array.isArray(global.db?.allUserData)) {
                    totalUsers = global.db.allUserData.length;
                } else if (typeof global.db?.getAllUsers === "function") {
                    const users = await global.db.getAllUsers();
                    totalUsers = Array.isArray(users) ? users.length : 0;
                }
                if (Array.isArray(global.db?.allThreadData)) {
                    totalThreads = global.db.allThreadData.filter(t =>
                        t?.threadID && (String(t.threadID).startsWith("-") || t.isGroup === true)
                    ).length;
                } else if (typeof global.db?.getAllThreads === "function") {
                    const threads = await global.db.getAllThreads();
                    totalThreads = Array.isArray(threads) ? threads.length : 0;
                }
            } catch (dbError) {
                console.log("UPTIME DB ERROR:", dbError.message);
            }
            const uptimeMessage = `
╭──✦ [ 𝐔𝐩𝐭𝐢𝐦𝐞 𝐈𝐧𝐟𝐨𝐫𝐦𝐚𝐭𝐢𝐨𝐧 ]
├‣ 🕒 𝚂𝚢𝚜𝚝𝚎𝚖 𝚄𝚙𝚝𝚒𝚖𝚎: ${systemUptime}
╰‣ ⏱ 𝙿𝚛𝚘𝚌𝚎𝚜𝚜 𝚄𝚙𝚝𝚒𝚖𝚎: ${processUptime}
╭──✦ [ 𝐒𝐲𝐬𝐭𝐞𝐦 𝐈𝐧𝐟𝐨𝐫𝐦𝐚𝐭𝐢𝐨𝐧 ]
├‣ 📡 𝙾𝚂: ${systemInfo.os}
├‣ 🛡 𝙲𝚘𝚛𝚎𝚜: ${systemInfo.cores}
├‣ 🔍 𝙰𝚛𝚌𝚑𝚒𝚝𝚎𝚌𝚝𝚞𝚛𝚎: ${systemInfo.architecture}
├‣ 🖥 𝙽𝚘𝚍𝚎 𝚅𝚎𝚛𝚜𝚒𝚘𝚗: ${systemInfo.node}
├‣ 📈 𝚃𝚘𝚝𝚊𝚕 𝙼𝚎𝚖𝚘𝚛𝚢: ${systemInfo.totalMemory}
├‣ 📉 𝙵𝚛𝚎𝚎 𝙼𝚎𝚖𝚘𝚛𝚢: ${systemInfo.freeMemory}
├‣ 📊 𝚁𝙰𝙼 𝚄𝚜𝚊𝚐𝚎: ${systemInfo.ramUsage}
├‣ 👥 𝚃𝚘𝚝𝚊𝚕 𝚄𝚜𝚎𝚛𝚜: ${totalUsers} members
╰‣ 📂 𝚃𝚘𝚝𝚊𝚕 𝚃𝚑𝚛𝚎𝚊𝚍𝚜: ${totalThreads} Groups`;
            await message.reply(uptimeMessage);
        } catch (err) {
            console.error("UPTIME ERROR:", err);
            try {
                await message.reply(`❌ | Error occurred: ${err.message}`);
            } catch {}
        }
    }
};

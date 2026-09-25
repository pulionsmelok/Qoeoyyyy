async function handletCheckData(api, event) {
    if (!global.GoatBot || !global.GoatBot.DB) return;

    const db = global.GoatBot.DB;
    const userData = db.userData || db.users || db.usersData;
    const threadsData = db.threadsData || db.threads;
    if (!userData || !threadsData) return;

    try {
        if (event.senderID) {
            const user = (await userData(event.senderID)) || { name: "Unknown", msgCount: 0 };
            const senderName = event.senderName || event.pushName || (event.raw && event.raw.pushName);

            if (senderName && senderName.trim() && senderName.trim() !== user.name) {
                await (db.users || userData).set(event.senderID, senderName.trim(), "name");
            } else if (!user.name || user.name === "Unknown") {
                try {
                    const sock = global.GoatBot.api && global.GoatBot.api.sock;
                    if (sock && sock.contacts) {
                        const { normUID } = require("../login/baileys.js");
                        const uid = normUID(event.senderID);
                        const contact =
                            sock.contacts[uid + "@s.whatsapp.net"] ||
                            sock.contacts[uid + "@lid"];
                        const contactName = contact && (contact.name || contact.notify || contact.verifiedName);

                        if (contactName && contactName !== user.name) {
                            await (db.users || userData).set(event.senderID, contactName, "name");
                        }
                    }
                } catch (e) {}
            }

            try {
                const updatedUser = (await userData(event.senderID)) || { msgCount: 0 };
                await (db.users || userData).set(event.senderID, (updatedUser.msgCount || 0) + 1, "msgCount");
            } catch (e) {}
        }

        if (event.mentions && event.mentions.length > 0) {
            try {
                const sock = global.GoatBot.api && global.GoatBot.api.sock;
                if (sock && sock.contacts) {
                    const { normUID } = require("../login/baileys.js");
                    for (const mentionId of event.mentions) {
                        const uid = normUID(mentionId);
                        const contact =
                            sock.contacts[uid + "@s.whatsapp.net"] ||
                            sock.contacts[uid + "@lid"];
                        const contactName = contact && (contact.name || contact.notify || contact.verifiedName);

                        if (contactName) {
                            const mentionedUser = (await userData(mentionId)) || { name: "Unknown" };
                            if (mentionedUser.name !== contactName) {
                                await (db.users || userData).set(mentionId, contactName, "name");
                            }
                        }
                    }
                }
            } catch (e) {}
        }

        if (event.threadID && event.isGroup) {
            const thread = (await threadsData(event.threadID)) || {};

            if (
                !thread.threadName ||
                thread.threadName === "Unknown Group" ||
                !thread.members ||
                thread.members.length === 0
            ) {
                try {
                    const groupInfo = await api.getGroupInfo(event.threadID);
                    await (db.threads || threadsData).refreshInfo(event.threadID, groupInfo);
                } catch (e) {}
            }

            if (event.senderID) {
                try {
                    await (db.threads || threadsData).incrementMsgCount(event.threadID, event.senderID);
                } catch (e) {}
            }
        }
    } catch (e) {}
}

module.exports = handletCheckData;
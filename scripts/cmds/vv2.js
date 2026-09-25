const { downloadMediaMessage } = require("@whiskeysockets/baileys");

module.exports = {
  config: {
    name: "vv2",
    aliases: ["viewonce2"],
    version: "1.5.0",
    author: "SK-SIDDIK-KHAN",
    role: 2,
    shortDescription: "Send View Once media to your DM",
    longDescription:
      "Reply to a view-once (1-time view) image, video, or voice note to download and secretly send it to your direct messages.",
    category: "utility",
    guide: { en: "{pn} [reply to view-once media]" },
  },

  onStart: async ({ api, event, message }) => {
    try {
      const replied = event.messageReply || event.replyToMessage;

      if (
        !replied ||
        !replied.attachments ||
        replied.attachments.length === 0
      ) {
        return;
      }

      const attachment = replied.attachments[0];
      const validTypes = ["image", "video", "audio", "ptt"];
      if (!validTypes.includes(attachment.type)) {
        return;
      }

      let buffer;
      try {
        const msgObj = {
          key: {
            id: replied.messageID,
            remoteJid: event.threadID,
            participant: replied.senderID,
          },
          message: replied.raw,
        };
        buffer = await downloadMediaMessage(
          msgObj,
          "buffer",
          {},
          { reuploadRequest: api.updateMediaMessage },
        );
      } catch (err) {
        return;
      }

      if (!buffer) {
        return;
      }

      const caption = attachment.caption
        ? `*Caption:* ${attachment.caption}`
        : "";

      if (attachment.type === "image") {
        await api.sendImage(buffer, event.senderID, caption, {
          mimetype: attachment.mimetype || "image/jpeg",
        });
      } else if (attachment.type === "video") {
        await api.sendVideo(buffer, event.senderID, caption, {
          mimetype: attachment.mimetype || "video/mp4",
        });
      } else if (attachment.type === "audio" || attachment.type === "ptt") {
        await api.sendAudio(buffer, event.senderID, {
          mimetype: attachment.mimetype || "audio/mpeg",
          ptt: attachment.type === "ptt",
        });
      }
    } catch (e) {
      return;
    }
  },
};

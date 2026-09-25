const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");

function formatBalance(num) {
  num = Number(num) || 0;
  if (num >= 1e15) return (num / 1e15).toFixed(2).replace(/\.00$/, "") + "q";
  if (num >= 1e12) return (num / 1e12).toFixed(2).replace(/\.00$/, "") + "t";
  if (num >= 1e9) return (num / 1e9).toFixed(2).replace(/\.00$/, "") + "b";
  if (num >= 1e6) return (num / 1e6).toFixed(2).replace(/\.00$/, "") + "m";
  if (num >= 1e3) return (num / 1e3).toFixed(2).replace(/\.00$/, "") + "k";
  return num.toFixed(0);
}

function roundRect(ctx, x, y, w, h, r, fill = false, stroke = false) {
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
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

async function loadAvatar(api, userID) {
  try {
    let url = null;
    if (global.utils && global.utils.getAvatar) {
      url = await global.utils.getAvatar(api, userID);
    } else if (api && api.getProfilePicture) {
      url = await api.getProfilePicture(userID);
    }
    if (!url) return null;
    const response = await axios.get(url, { responseType: "arraybuffer", timeout: 8000 });
    return await loadImage(Buffer.from(response.data));
  } catch (_) {
    return null;
  }
}

async function drawCard({ api, userID, userName, balance }) {
  const formatted = "$" + formatBalance(balance);
  const width = 850, height = 520;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, "#0f2027");
  grad.addColorStop(0.5, "#1c4966");
  grad.addColorStop(1, "#2a7ab0");
  ctx.fillStyle = grad;
  roundRect(ctx, 0, 0, width, height, 30, true);

  ctx.font = "bold 34px Arial";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("GOAT NATIONAL BANK", 40, 60);
  ctx.font = "20px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText("DIGITAL BALANCE CARD", 40, 90);

  const avatar = await loadAvatar(api, userID);
  if (avatar) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(120, 250, 70, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 50, 180, 140, 140);
    ctx.restore();
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.beginPath();
    ctx.arc(120, 250, 70, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.font = "bold 28px Arial";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(String(userName).slice(0, 24), 220, 230);
  ctx.font = "22px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillText("Balance", 220, 270);
  ctx.font = "bold 48px Arial";
  ctx.fillStyle = "#00e676";
  ctx.fillText(formatted, 220, 330);

  ctx.font = "16px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText("UID: " + String(userID).split("@")[0].slice(0, 20), 40, 480);

  return canvas.toBuffer("image/png");
}

function resolveTarget(event, args) {
  if (typeof global.getTargetUser === "function") {
    const t = global.getTargetUser(event, args);
    if (t) return t;
  }
  if (event.mentions) {
    if (Array.isArray(event.mentions) && event.mentions.length > 0) return event.mentions[0];
    const keys = Object.keys(event.mentions || {});
    if (keys.length > 0) return keys[0];
  }
  const replied = event.messageReply || event.replyToMessage;
  if (replied && replied.senderID) return replied.senderID;
  const num = (args || []).find((a) => /^\d{6,}$/.test(String(a).replace(/\D/g, "")));
  if (num) return String(num).replace(/\D/g, "");
  return event.senderID;
}

module.exports = {
  config: {
    name: "balance",
    aliases: ["bal", "money", "taka"],
    version: "1.6.0",
    author: "SK-SIDDIK-KHAN",
    countDown: 5,
    role: 0,
    shortDescription: "Check balance or transfer money",
    category: "economy",
    guide: {
      en: "{pn}\n{pn} @user\n{pn} transfer <amount> @user"
    }
  },

  onStart: async function ({ api, event, args, message, usersData, userData }) {
    const db = usersData || userData || (global.GoatBot.DB && (global.GoatBot.DB.userData || global.GoatBot.DB.usersData));
    if (!db) return message.reply("❌ Database not initialized.");

    try {
      const sub = (args[0] || "").toLowerCase();

      if (sub === "transfer" || sub === "send" || sub === "pay") {
        const amount = parseInt(args[1], 10);
        if (!Number.isFinite(amount) || amount <= 0) {
          return message.reply("❌ Please enter a valid amount.\n\nExample:\n.balance transfer 10000 @friend");
        }
        const targetID = resolveTarget(event, args.slice(2));
        const senderID = event.senderID;
        if (!targetID || String(targetID).split("@")[0] === String(senderID).split("@")[0]) {
          return message.reply("❌ Who do you want to send money to?\nMention, reply, or give their number.");
        }

        const senderData = await db.get(senderID);
        const senderBalance = Number(senderData?.money) || 0;
        if (senderBalance < amount) {
          return message.reply(`❌ Insufficient balance.\n\n💰 Your balance: $${formatBalance(senderBalance)}`);
        }

        const receiverData = await db.get(targetID);
        const receiverBalance = Number(receiverData?.money) || 0;
        await db.set(senderID, { money: senderBalance - amount });
        await db.set(targetID, { money: receiverBalance + amount });

        const senderName = senderData?.name || String(senderID).split("@")[0];
        const receiverName = receiverData?.name || String(targetID).split("@")[0];
        return message.reply(
          `✅ *Transfer Successful!*\n\n👤 ${senderName} ➝ ${receiverName}\n💸 Amount: $${formatBalance(amount)}\n\n💰 Your new balance: $${formatBalance(senderBalance - amount)}`
        );
      }

      const targetID = resolveTarget(event, args);
      const data = await db.get(targetID);
      const balance = Number(data?.money) || 0;
      const userName = data?.name || String(targetID).split("@")[0] || "User";

      try {
        const buffer = await drawCard({ api, userID: targetID, userName, balance });
        return message.reply({
          body: `💳 *${userName}*\n💰 Balance: *$${formatBalance(balance)}*`,
          attachment: { type: "image", data: buffer, mimetype: "image/png" }
        });
      } catch (cardErr) {
        return message.reply(`💳 *${userName}*\n💰 Balance: *$${formatBalance(balance)}*`);
      }
    } catch (err) {
      console.error("Balance command error:", err);
      return message.reply("❌ Something went wrong while running the balance command.");
    }
  }
};

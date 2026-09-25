const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");

const PROFILE_SIZE = 42;

async function fetchAvatar(api, jid) {
  try {
    const url = await global.db.usersData.getAvatarUrl(api, jid);
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 8000,
    });
    return Buffer.from(res.data);
  } catch {
    return null;
  }
}

/**
 * Normalise a WhatsApp JID to a bare phone number string for comparison.
 * "601234567890@s.whatsapp.net" → "601234567890"
 * "601234567890"                → "601234567890"
 */
function bareNum(jid) {
  if (!jid) return "";
  return String(jid).split(":")[0].split("@")[0];
}

module.exports = {
  config: {
    name: "gcimg",
    version: "1.5.0",
    author: "SK-SIDDIK-KHAN",
    countDown: 15,
    role: 0,
    shortDescription: "Group stats image",
    longDescription:
      "Generates a group image showing all member profile pictures.",
    category: "group",
    guide: {
      en: "{pn} [--colour <c>] [--admincolour <c>] [--membercolour <c>] [--bgcolour <url>]",
    },
  },

  onStart: async function ({ api, event, message, threadsData }) {
    await message.react("⏳");

    try {
      const args = (event.body || "").split(/\s+/).slice(1);
      const opt = {
        colour: "red",
        admincolour: "blue",
        membercolour: "green",
        bgcolour: null,
      };
      args.forEach((a, i) => {
        if (a === "--colour" && args[i + 1]) opt.colour = args[i + 1];
        if (a === "--admincolour" && args[i + 1]) opt.admincolour = args[i + 1];
        if (a === "--membercolour" && args[i + 1])
          opt.membercolour = args[i + 1];
        if (a === "--bgcolour" && args[i + 1]) opt.bgcolour = args[i + 1];
      });

      // threadsData can be called as a function OR via .get()
      let thread;
      if (typeof threadsData === "function") {
        thread = await threadsData(event.threadID);
      } else {
        thread = await threadsData.get(event.threadID);
      }
      if (!thread) return message.reply("❌ Could not load group info.");

      // DB schema: thread.adminIDs = string[], thread.members = [{userID, name, inGroup, count}]
      const adminIDs = (thread.adminIDs || []).map(bareNum);
      // Support both .members (DB schema) and .allMembers (legacy alias)
      const memberList = thread.members || thread.allMembers || [];
      const allMembers = memberList.filter((m) => m.inGroup !== false);

      const adminMembers = allMembers.filter((m) =>
        adminIDs.includes(bareNum(m.userID || m.uid)),
      );
      const normMembers = allMembers.filter(
        (m) => !adminIDs.includes(bareNum(m.userID || m.uid)),
      );
      const orderedMembers = [...adminMembers, ...normMembers];

      const buffers = await Promise.all(
        orderedMembers.map((m) => fetchAvatar(api, m.userID || m.uid)),
      );

      const GAP = 10;
      const MAX_PER_ROW = 15;
      const HEADER_H = PROFILE_SIZE * 3 + 170; // group pic + name + counts
      const numRows = Math.ceil(orderedMembers.length / MAX_PER_ROW);
      const canvasWidth = MAX_PER_ROW * (PROFILE_SIZE + GAP) - GAP + 20;
      const canvasHeight = HEADER_H + numRows * (PROFILE_SIZE + GAP) + 20;

      const canvas = createCanvas(canvasWidth, canvasHeight);
      const ctx = canvas.getContext("2d");

      if (opt.bgcolour) {
        try {
          const res = await axios.get(opt.bgcolour, {
            responseType: "arraybuffer",
            timeout: 8000,
          });
          const bg = await loadImage(Buffer.from(res.data));
          ctx.drawImage(bg, 0, 0, canvasWidth, canvasHeight);
        } catch {
          /* fall through to solid bg */
        }
      }
      if (!opt.bgcolour) {
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }

      const GRP_SIZE = PROFILE_SIZE * 3;
      const GRP_X = (canvasWidth - GRP_SIZE) / 2;
      const GRP_Y = 20;
      const GRP_CX = canvasWidth / 2;
      const GRP_CY = GRP_Y + GRP_SIZE / 2;

      const groupBuf = await fetchAvatar(api, event.threadID);
      if (groupBuf) {
        const img = await loadImage(groupBuf).catch(() => null);
        if (img) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(GRP_CX, GRP_CY, GRP_SIZE / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, GRP_X, GRP_Y, GRP_SIZE, GRP_SIZE);
          ctx.restore();
          ctx.beginPath();
          ctx.arc(GRP_CX, GRP_CY, GRP_SIZE / 2 + 3, 0, Math.PI * 2);
          ctx.lineWidth = 4;
          ctx.strokeStyle = opt.colour;
          ctx.stroke();
        }
      }

      // DB uses threadName (not name)
      const groupName = thread.threadName || thread.name || "Group";
      const nameY = GRP_Y + GRP_SIZE + 38;
      ctx.font = "bold 22px Arial";
      ctx.fillStyle = opt.colour;
      ctx.textAlign = "center";
      ctx.fillText(groupName, GRP_CX, nameY);

      const countY = nameY + 34;
      ctx.font = "14px Arial";

      ctx.textAlign = "left";
      ctx.fillStyle = opt.admincolour;
      ctx.fillText(`👑 Admins: ${adminMembers.length}`, 10, countY);

      ctx.textAlign = "right";
      ctx.fillStyle = opt.membercolour;
      ctx.fillText(
        `👥 Members: ${normMembers.length}`,
        canvasWidth - 10,
        countY,
      );

      let px = 10,
        py = countY + 20,
        colIdx = 0;

      for (let i = 0; i < orderedMembers.length; i++) {
        const buf = buffers[i];
        const memberUID = orderedMembers[i].userID || orderedMembers[i].uid;
        const isAdmin = adminIDs.includes(bareNum(memberUID));
        const cx = px + PROFILE_SIZE / 2;
        const cy = py + PROFILE_SIZE / 2;
        const r = PROFILE_SIZE / 2;

        if (buf) {
          const img = await loadImage(buf).catch(() => null);
          if (img) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(img, px, py, PROFILE_SIZE, PROFILE_SIZE);
            ctx.restore();
          } else {
            // grey placeholder circle (image failed to load)
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fillStyle = "#2d2d4e";
            ctx.fill();
          }
        } else {
          // grey placeholder circle (no avatar)
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fillStyle = "#2d2d4e";
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = isAdmin ? opt.admincolour : opt.membercolour;
        ctx.stroke();

        colIdx++;
        px += PROFILE_SIZE + GAP;
        if (colIdx >= MAX_PER_ROW) {
          colIdx = 0;
          px = 10;
          py += PROFILE_SIZE + GAP;
        }
      }

      const imgBuffer = canvas.toBuffer("image/png");
      const caption =
        `📊 *${groupName}*\n` +
        `👑 Admins: ${adminMembers.length} | 👥 Members: ${normMembers.length}`;

      await message.react("✅");
      await api.sendImage(imgBuffer, event.threadID, caption);
    } catch (err) {
      await message.react("❌");
      return message.reply("❌ Error: " + err.message);
    }
  },
};

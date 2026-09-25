const { createCanvas } = require("canvas");

function hexToRgb(hex) {
    hex = hex.replace(/^#/, "");
    if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
    const n = parseInt(hex, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}

function lighten(hex, amt) {
    try { const { r, g, b } = hexToRgb(hex); return rgbToHex(r + amt, g + amt, b + amt); } catch { return hex; }
}

function darken(hex, amt) {
    try { const { r, g, b } = hexToRgb(hex); return rgbToHex(r - amt, g - amt, b - amt); } catch { return hex; }
}

module.exports = {
    config: {
    name: "bank2",
        version: "1.5.0",
        author: "SK-SIDDIK-KHAN",
        role: 0,
        usePrefix: true,
    description: {
            en: "𝐂𝐨𝐦𝐩𝐥𝐞𝐭𝐞 𝐝𝐢𝐠𝐢𝐭𝐚𝐥 𝐛𝐚𝐧𝐤𝐢𝐧𝐠 𝐰𝐢𝐭𝐡 𝐫𝐞𝐚𝐥𝐢𝐬𝐭𝐢𝐜 𝐀𝐓𝐌 𝐜𝐚𝐫𝐝𝐬"
        },
        category: "ECONOMY",
        guide: {
            en: "🏦 𝐁𝐀𝐍𝐊𝐈𝐍𝐆 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒:\n💳 𝐀𝐂𝐂𝐎𝐔𝐍𝐓:\n{𝐩𝐧} 𝐫𝐞𝐠𝐢𝐬𝐭𝐞𝐫 - 𝐎𝐩𝐞𝐧 𝐚𝐜𝐜𝐨𝐮𝐧𝐭\n{𝐩𝐧} 𝐛𝐚𝐥𝐚𝐧𝐜𝐞 - 𝐂𝐡𝐞𝐜𝐤 𝐛𝐚𝐥𝐚𝐧𝐜𝐞\n{𝐩𝐧} 𝐚𝐜𝐜𝐨𝐮𝐧𝐭 - 𝐀𝐜𝐜𝐨𝐮𝐧𝐭 𝐝𝐞𝐭𝐚𝐢𝐥𝐬\n💳 𝐀𝐓𝐌 𝐂𝐀𝐑𝐃:\n{𝐩𝐧} 𝐜𝐚𝐫𝐝 - 𝐕𝐢𝐞𝐰 𝐀𝐓𝐌 𝐜𝐚𝐫𝐝\n{𝐩𝐧} 𝐜𝐚𝐫𝐝 𝐛𝐚𝐜𝐤 - 𝐕𝐢𝐞𝐰 𝐜𝐚𝐫𝐝 𝐛𝐚𝐜𝐤\n{𝐩𝐧} 𝐜𝐚𝐫𝐝 𝐝𝐞𝐬𝐢𝐠𝐧𝐬 - 𝐀𝐥𝐥 𝐝𝐞𝐬𝐢𝐠𝐧𝐬\n{𝐩𝐧} 𝐚𝐭𝐦𝐜𝐨𝐝𝐞 - 𝐆𝐞𝐧𝐞𝐫𝐚𝐭𝐞 𝐀𝐓𝐌 𝐜𝐨𝐝𝐞\n{𝐩𝐧} 𝐚𝐭𝐦𝐰𝐢𝐭𝐡𝐝𝐫𝐚𝐰 <𝐜𝐨𝐝𝐞> <𝐚𝐦𝐨𝐮𝐧𝐭> - 𝐀𝐓𝐌 𝐰𝐢𝐭𝐡𝐝𝐫𝐚𝐰\n💸 𝐓𝐑𝐀𝐍𝐒𝐀𝐂𝐓𝐈𝐎𝐍𝐒:\n{𝐩𝐧} 𝐝𝐞𝐩𝐨𝐬𝐢𝐭 <𝐚𝐦𝐨𝐮𝐧𝐭> - 𝐀𝐝𝐝 𝐦𝐨𝐧𝐞𝐲\n{𝐩𝐧} 𝐰𝐢𝐭𝐡𝐝𝐫𝐚𝐰 <𝐚𝐦𝐨𝐮𝐧𝐭> - 𝐓𝐚𝐤𝐞 𝐦𝐨𝐧𝐞𝐲\n{𝐩𝐧} 𝐬𝐞𝐧𝐝 <@𝐮𝐬𝐞𝐫> <𝐚𝐦𝐨𝐮𝐧𝐭> - 𝐒𝐞𝐧𝐝 𝐦𝐨𝐧𝐞𝐲\n{𝐩𝐧} 𝐭𝐫𝐚𝐧𝐬𝐟𝐞𝐫 <𝐚𝐜𝐜#> <𝐚𝐦𝐨𝐮𝐧𝐭> - 𝐁𝐲 𝐚𝐜𝐜𝐨𝐮𝐧𝐭\n💰 𝐈𝐍𝐕𝐄𝐒𝐓𝐌𝐄𝐍𝐓𝐒:\n{𝐩𝐧} 𝐟𝐝 - 𝐅𝐢𝐱𝐞𝐝 𝐃𝐞𝐩𝐨𝐬𝐢𝐭\n{𝐩𝐧} 𝐢𝐧𝐭𝐞𝐫𝐞𝐬𝐭 - 𝐂𝐨𝐥𝐥𝐞𝐜𝐭 𝐢𝐧𝐭𝐞𝐫𝐞𝐬𝐭\n🏦 𝐋𝐎𝐀𝐍𝐒:\n{𝐩𝐧} 𝐥𝐨𝐚𝐧 <𝐚𝐦𝐨𝐮𝐧𝐭> - 𝐀𝐩𝐩𝐥𝐲 𝐥𝐨𝐚𝐧\n{𝐩𝐧} 𝐫𝐞𝐩𝐚𝐲 <𝐚𝐦𝐨𝐮𝐧𝐭> - 𝐑𝐞𝐩𝐚𝐲 𝐥𝐨𝐚𝐧\n📊 𝐎𝐓𝐇𝐄𝐑𝐒:\n{𝐩𝐧} 𝐡𝐢𝐬𝐭𝐨𝐫𝐲 - 𝐅𝐮𝐥𝐥 𝐡𝐢𝐬𝐭𝐨𝐫𝐲\n{𝐩𝐧} 𝐦𝐢𝐧𝐢𝐬𝐭𝐚𝐭𝐞𝐦𝐞𝐧𝐭 - 𝐋𝐚𝐬𝐭 𝟓\n{𝐩𝐧} 𝐥𝐞𝐚𝐝𝐞𝐫𝐛𝐨𝐚𝐫𝐝 - 𝐓𝐨𝐩 𝟏𝟎 𝐫𝐢𝐜𝐡"
        }
},
    langs: {
        en: { syntaxError: "Please use the correct syntax: {pn}!" }
    },
    formatMoney(amount) {
        if (isNaN(amount)) return "𝟎";
        amount = Number(amount);
        const scales = [
            { value: 1e15, suffix: '𝐐' },
            { value: 1e12, suffix: '𝐓' },
            { value: 1e9, suffix: '𝐁' },
            { value: 1e6, suffix: '𝐌' },
            { value: 1e3, suffix: '𝐤' }
        ];
        for (let scale of scales) {
            if (amount >= scale.value) {
                let val = amount / scale.value;
                return val % 1 === 0 ? `${val}${scale.suffix}` : `${val.toFixed(2)}${scale.suffix}`;
            }
        }
        return amount.toString();
    },
    generateCardNumber() {
        const prefix = Math.random() > 0.5 ? "4" : "5";
        let number = prefix;
        for (let i = 0; i < 15; i++) number += Math.floor(Math.random() * 10);
        return number.match(/.{1,4}/g).join(" ");
    },
    generateCVV() {
        return Math.floor(100 + Math.random() * 900).toString();
    },
    generatePIN() {
        return Math.floor(1000 + Math.random() * 9000).toString();
    },
    generateATMCode() {
        const chars = '𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗';
        let code = '';
        for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
        return code;
    },
    generateAccountNumber() {
        const num1 = Math.floor(10000000 + Math.random() * 90000000).toString();
        const num2 = Math.floor(1000 + Math.random() * 9000).toString();
        return `𝐆𝐁${num1.split('').map(d => String.fromCharCode(120783 + parseInt(d))).join('')}${num2.split('').map(d => String.fromCharCode(120783 + parseInt(d))).join('')}`;
    },
    getExpiry() {
        const now = new Date();
        const month = (now.getMonth() + 1).toString().padStart(2, "0");
        const year = (now.getFullYear() + 4).toString().slice(-2);
        return `${month}/${year}`;
    },
    nowISO() {
        return new Date().toISOString();
    },
    calculateInterest(amount, days) {
        return amount * 0.05 * (days / 365);
    },
    calculateLoanInterest(amount, days) {
        return amount * 0.12 * (days / 365);
    },
    calculateCreditScore(transactions, balance, loanHistory) {
        let score = 500;
        score += Math.min(transactions.length * 5, 200);
        score += Math.min(Math.floor(balance / 10000) * 2, 200);
        if (loanHistory) {
            if (loanHistory.repaidOnTime) score += 100;
            if (loanHistory.defaulted) score -= 200;
        }
        return Math.min(Math.max(score, 300), 850);
    },
    cardDesigns: {
        visa_platinum: { name: "𝐕𝐈𝐒𝐀 𝐏𝐋𝐀𝐓𝐈𝐍𝐔𝐌", gradient: ["#0d1b3a", "#1b2b4f", "#2a3b64"], chipColor: "#b8860b", hologramColors: ["#c0c0c0", "#e8e8e8", "#a0a0a0"], textColor: "#ffffff", accentColor: "#d4af37", logo: "𝐕𝐈𝐒𝐀", logoColor: "#1a1f71", network: "visa", type: "𝐏𝐋𝐀𝐓𝐈𝐍𝐔𝐌", metallic: true },
        mastercard_black: { name: "𝐌𝐀𝐒𝐓𝐄𝐑𝐂𝐀𝐑𝐃 𝐁𝐋𝐀𝐂𝐊", gradient: ["#000000", "#1a1a1a", "#2d2d2d"], chipColor: "#c0c0c0", hologramColors: ["#808080", "#a9a9a9", "#666666"], textColor: "#ffffff", accentColor: "#ffd700", logo: "𝐌𝐀𝐒𝐓𝐄𝐑𝐂𝐀𝐑𝐃", logoColor: "#ff5f00", network: "mastercard", type: "𝐁𝐋𝐀𝐂𝐊 𝐄𝐃𝐈𝐓𝐈𝐎𝐍", metallic: true },
        american_express: { name: "𝐀𝐌𝐄𝐑𝐈𝐂𝐀𝐍 𝐄𝐗𝐏𝐑𝐄𝐒𝐒", gradient: ["#002663", "#003087", "#0046b3"], chipColor: "#b5b5b5", hologramColors: ["#8a6e4b", "#c0a97a", "#9b7e55"], textColor: "#ffffff", accentColor: "#ffffff", logo: "𝐀𝐌𝐄𝐗", logoColor: "#ffffff", network: "amex", type: "𝐆𝐎𝐋𝐃", metallic: true },
        gold_elite: { name: "𝐄𝐋𝐈𝐓𝐄 𝐆𝐎𝐋𝐃", gradient: ["#8B7355", "#B8860B", "#DAA520"], chipColor: "#DAA520", hologramColors: ["#FBB917", "#E5B73B", "#FFD700"], textColor: "#000000", accentColor: "#000000", logo: "𝐄𝐋𝐈𝐓𝐄", logoColor: "#000000", network: "premium", type: "𝐆𝐎𝐋𝐃", metallic: true },
        signature_visa: { name: "𝐕𝐈𝐒𝐀 𝐒𝐈𝐆𝐍𝐀𝐓𝐔𝐑𝐄", gradient: ["#0a0f2c", "#1a1f4a", "#2a2f6a"], chipColor: "#9b870c", hologramColors: ["#b8860b", "#daa520", "#ffd700"], textColor: "#ffffff", accentColor: "#c0c0c0", logo: "𝐕𝐈𝐒𝐀", logoColor: "#ffffff", network: "visa", type: "𝐒𝐈𝐆𝐍𝐀𝐓𝐔𝐑𝐄", metallic: true },
        world_mastercard: { name: "𝐖𝐎𝐑𝐋𝐃 𝐌𝐀𝐒𝐓𝐄𝐑𝐂𝐀𝐑𝐃", gradient: ["#1a237e", "#283593", "#3949ab"], chipColor: "#c0c0c0", hologramColors: ["#e0e0e0", "#f5f5f5", "#ffffff"], textColor: "#ffffff", accentColor: "#ffd700", logo: "𝐌𝐀𝐒𝐓𝐄𝐑𝐂𝐀𝐑𝐃", logoColor: "#ffffff", network: "mastercard", type: "𝐖𝐎𝐑𝐋𝐃 𝐄𝐋𝐈𝐓𝐄", metallic: true },
        titanium: { name: "𝐓𝐈𝐓𝐀𝐍𝐈𝐔𝐌", gradient: ["#2b2b2b", "#3d3d3d", "#4f4f4f"], chipColor: "#a8a9ad", hologramColors: ["#71797E", "#8C8F94", "#A9ACB1"], textColor: "#ffffff", accentColor: "#00ffff", logo: "𝐓𝐈𝐓𝐀𝐍𝐈𝐔𝐌", logoColor: "#00ffff", network: "premium", type: "𝐌𝐄𝐓𝐀𝐋", metallic: true },
        infinite: { name: "𝐈𝐍𝐅𝐈𝐍𝐈𝐓𝐄", gradient: ["#0b0b0b", "#1e1e1e", "#2d2d2d"], chipColor: "#ffd700", hologramColors: ["#c0c0c0", "#d4af37", "#e5e4e2"], textColor: "#ffffff", accentColor: "#d4af37", logo: "𝐈𝐍𝐅𝐈𝐍𝐈𝐓𝐄", logoColor: "#d4af37", network: "premium", type: "𝐁𝐋𝐀𝐂𝐊", metallic: true }
    },
    roundRect(ctx, x, y, w, h, r) {
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
    },
    drawChip(ctx, x, y, color) {
        const w = 88, h = 68;
        const chipGrad = ctx.createLinearGradient(x, y, x + w, y + h);
        chipGrad.addColorStop(0, lighten(color, 40));
        chipGrad.addColorStop(0.3, color);
        chipGrad.addColorStop(0.7, darken(color, 20));
        chipGrad.addColorStop(1, lighten(color, 20));
        ctx.fillStyle = chipGrad;
        this.roundRect(ctx, x, y, w, h, 6);
        ctx.fill();
        ctx.strokeStyle = darken(color, 35);
        ctx.lineWidth = 1.5;
        [y + 14, y + 32, y + 50].forEach(ly => {
            ctx.beginPath(); ctx.moveTo(x + 4, ly); ctx.lineTo(x + w - 4, ly); ctx.stroke();
        });
        [x + 22, x + 44, x + 66].forEach(lx => {
            ctx.beginPath(); ctx.moveTo(lx, y + 4); ctx.lineTo(lx, y + h - 4); ctx.stroke();
        });
        ctx.fillStyle = darken(color, 25);
        this.roundRect(ctx, x + 27, y + 20, 34, 26, 3);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        this.roundRect(ctx, x + 29, y + 22, 15, 10, 2);
        ctx.fill();
    },
    drawNFC(ctx, x, y, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        [12, 22, 32].forEach(r => {
            ctx.globalAlpha = 1 - (r - 10) / 35;
            ctx.beginPath();
            ctx.arc(x, y, r, -Math.PI * 0.65, Math.PI * 0.65);
            ctx.stroke();
        });
        ctx.globalAlpha = 1;
        ctx.lineCap = "butt";
    },
    drawNetworkLogo(ctx, network, x, y, logoColor) {
        if (network === "visa") {
            ctx.save();
            ctx.font = "italic bold 58px Arial";
            ctx.textAlign = "center";
            ctx.fillStyle = "rgba(0,0,0,0.3)";
            ctx.fillText("VISA", x + 2, y + 2);
            ctx.fillStyle = logoColor;
            ctx.fillText("VISA", x, y);
            ctx.restore();
        } else if (network === "mastercard") {
            const r = 30;
            ctx.save();
            ctx.globalAlpha = 0.92;
            ctx.fillStyle = "#EB001B";
            ctx.beginPath(); ctx.arc(x - 18, y - r / 2, r, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#F79E1B";
            ctx.beginPath(); ctx.arc(x + 18, y - r / 2, r, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = "#FF5F00";
            ctx.beginPath();
            ctx.arc(x - 18, y - r / 2, r, -1.05, 1.05); ctx.arc(x + 18, y - r / 2, r, Math.PI - 1.05, Math.PI + 1.05, true);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.restore();
        } else if (network === "amex") {
            ctx.save();
            ctx.font = "bold 22px Arial";
            ctx.fillStyle = logoColor;
            ctx.textAlign = "center";
            ctx.fillText("AMERICAN", x, y - 18);
            ctx.font = "bold 26px Arial";
            ctx.fillText("EXPRESS", x, y + 8);
            ctx.restore();
        } else {
            ctx.save();
            ctx.font = "bold 30px Arial";
            ctx.fillStyle = logoColor;
            ctx.textAlign = "center";
            ctx.fillText("ELITE", x, y);
            ctx.restore();
        }
    },
    async createCardFront(card, username, balance, transactions = [], design = "visa_platinum", creditScore = 700) {
        const W = 900, H = 566, R = 36;
        const canvas = createCanvas(W, H);
        const ctx = canvas.getContext("2d");
        const d = this.cardDesigns[design] || this.cardDesigns.visa_platinum;
        this.roundRect(ctx, 0, 0, W, H, R);
        ctx.clip();
        const bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0,    d.gradient[0]);
        bg.addColorStop(0.45, d.gradient[1]);
        bg.addColorStop(0.75, d.gradient[2]);
        bg.addColorStop(1,    d.gradient[0]);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 0.06;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 60;
        for (let i = -H; i < W + H; i += 120) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        const shine = ctx.createLinearGradient(0, 0, 0, H * 0.45);
        shine.addColorStop(0,   "rgba(255,255,255,0.18)");
        shine.addColorStop(0.5, "rgba(255,255,255,0.05)");
        shine.addColorStop(1,   "rgba(255,255,255,0)");
        ctx.fillStyle = shine;
        ctx.fillRect(0, 0, W, H * 0.45);
        ctx.save();
        this.roundRect(ctx, 2, 2, W - 4, H - 4, R - 2);
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 2;
        ctx.stroke();
        this.roundRect(ctx, 6, 6, W - 12, H - 12, R - 4);
        ctx.strokeStyle = d.accentColor + "55";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
        ctx.font = "bold 32px Arial";
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.textAlign = "left";
        ctx.fillText("ULTIMATE BANK", 47, 73);
        ctx.fillStyle = d.textColor;
        ctx.fillText("ULTIMATE BANK", 45, 71);
        const lineGrad = ctx.createLinearGradient(45, 80, 300, 80);
        lineGrad.addColorStop(0, d.accentColor);
        lineGrad.addColorStop(1, "transparent");
        ctx.fillStyle = lineGrad;
        ctx.fillRect(45, 80, 260, 2);
        const hx = W - 80, hy = 55, hr = 32;
        const hGrad = ctx.createRadialGradient(hx - 8, hy - 8, 2, hx, hy, hr);
        hGrad.addColorStop(0,    d.hologramColors[1]);
        hGrad.addColorStop(0.4,  d.hologramColors[0]);
        hGrad.addColorStop(0.75, d.hologramColors[2]);
        hGrad.addColorStop(1,    d.hologramColors[0]);
        ctx.globalAlpha = 0.88;
        ctx.fillStyle = hGrad;
        ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        this.drawChip(ctx, 45, 158, d.chipColor);
        this.drawNFC(ctx, 165, 191, "rgba(255,255,255,0.65)");
        ctx.font = "bold 44px 'Courier New'";
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillText(card.number, 47, 363);
        ctx.fillStyle = d.textColor;
        ctx.fillText(card.number, 45, 361);
        ctx.font = "bold 11px Arial";
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fillText("VALID", 47, 398);
        ctx.fillText("THRU", 47, 410);
        ctx.font = "bold 26px 'Courier New'";
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillText(card.expiry, 102, 411);
        ctx.fillStyle = d.textColor;
        ctx.fillText(card.expiry, 100, 409);
        const displayName = (username || "CARD HOLDER").toUpperCase().slice(0, 24);
        ctx.font = "bold 26px Arial";
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillText(displayName, 47, 476);
        ctx.fillStyle = d.textColor;
        ctx.fillText(displayName, 45, 474);
        ctx.font = "bold 14px Arial";
        ctx.fillStyle = d.accentColor;
        ctx.fillText(d.type, 45, 500);
        this.drawNetworkLogo(ctx, d.network, W - 95, H - 68, d.logoColor);
        ctx.font = "13px Arial";
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.textAlign = "right";
        ctx.fillText(`BAL: ${this.formatMoney(balance)} BDT`, W - 18, H - 18);
        return canvas.toBuffer("image/png");
    },
    async createCardBack(card, username, design = "visa_platinum") {
        const W = 900, H = 566, R = 36;
        const canvas = createCanvas(W, H);
        const ctx = canvas.getContext("2d");
        const d = this.cardDesigns[design] || this.cardDesigns.visa_platinum;
        this.roundRect(ctx, 0, 0, W, H, R);
        ctx.clip();
        const bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, darken(d.gradient[0], 10));
        bg.addColorStop(1, darken(d.gradient[2], 15));
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(0, 54, W, 82);
        const sigX = 45, sigY = 196, sigW = 530, sigH = 72;
        ctx.fillStyle = "#f8f8f0";
        this.roundRect(ctx, sigX, sigY, sigW, sigH, 4);
        ctx.fill();
        ctx.font = "bold 13px Arial";
        ctx.fillStyle = "#888888";
        ctx.textAlign = "left";
        ctx.fillText("AUTHORIZED SIGNATURE — NOT VALID WITHOUT SIGNATURE", sigX + 10, sigY + 18);
        const cvvX = sigX + sigW + 16, cvvY = sigY, cvvW = 110, cvvH = sigH;
        ctx.fillStyle = "#f8f8f0";
        this.roundRect(ctx, cvvX, cvvY, cvvW, cvvH, 4);
        ctx.fill();
        ctx.font = "bold 11px Arial";
        ctx.fillStyle = "#888";
        ctx.textAlign = "center";
        ctx.fillText("CVV2/CVC2", cvvX + cvvW / 2, cvvY + 18);
        ctx.font = "bold 26px 'Courier New'";
        ctx.fillStyle = "#222222";
        ctx.fillText(card.cvv, cvvX + cvvW / 2, cvvY + 52);
        const last4 = card.number.replace(/ /g, "").slice(-4);
        ctx.font = "bold 28px 'Courier New'";
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.textAlign = "left";
        ctx.fillText(`**** **** **** ${last4}`, 45, 328);
        const name = (username || "CARD HOLDER").toUpperCase().slice(0, 24);
        ctx.font = "bold 20px Arial";
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fillText(name, 45, 360);
        ctx.font = "bold 14px Arial";
        ctx.fillStyle = d.accentColor;
        ctx.fillText("24/7 CUSTOMER SERVICE", 45, 418);
        ctx.font = "13px Arial";
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fillText("+880 1234-567890", 45, 438);
        this.drawNetworkLogo(ctx, d.network, W - 95, H - 70, d.logoColor);
        return canvas.toBuffer("image/png");
    },
    async onStart({ message, args, usersData, event }) {
        const uid = event.senderID;
        const action = args[0]?.toLowerCase();
        let data = await usersData.get(uid);
        if (!data.data) data.data = {};
        if (!data.data.bank) {
            data.data.bank = {
                balance: 0,
                registered: false,
                card: null,
                transactions: [],
                accountNumber: this.generateAccountNumber(),
                createdAt: null,
                savings: 0,
                atmCodes: [],
                loan: { amount: 0, takenAt: null, dueDate: null, interest: 0 },
                fixedDeposits: [],
                creditScore: 500,
                lastInterestClaim: null,
                accountType: "𝐒𝐭𝐚𝐧𝐝𝐚𝐫𝐝",
                dailyLimit: 100000,
                usedToday: 0,
                lastReset: new Date().setHours(0,0,0,0),
                cardDesign: "visa_platinum"
            };
        }
        const bank = data.data.bank;
        const today = new Date().setHours(0,0,0,0);
        if (bank.lastReset < today) {
            bank.usedToday = 0;
            bank.lastReset = today;
        }
        if (bank.balance >= 10000000) bank.accountType = "𝐏𝐥𝐚𝐭𝐢𝐧𝐮𝐦";
        else if (bank.balance >= 5000000) bank.accountType = "𝐆𝐨𝐥𝐝";
        else if (bank.balance >= 1000000) bank.accountType = "𝐏𝐫𝐞𝐦𝐢𝐮𝐦";
        else bank.accountType = "𝐒𝐭𝐚𝐧𝐝𝐚𝐫𝐝";
        bank.creditScore = this.calculateCreditScore(bank.transactions, bank.balance, bank.loan);
        if (action === "card" && args[1] === "designs") {
            let designsText = "💳 𝐀𝐕𝐀𝐈𝐋𝐀𝐁𝐋𝐄 𝐂𝐀𝐑𝐃 𝐃𝐄𝐒𝐈𝐆𝐍𝐒\n\n";
            Object.keys(this.cardDesigns).forEach((key, index) => {
                const d = this.cardDesigns[key];
                designsText += `${(index + 1).toString().split('').map(d => String.fromCharCode(120783 + parseInt(d))).join('')}. ${d.name}\n 🏷️ 𝐓𝐲𝐩𝐞: ${d.type}\n 💫 𝐍𝐞𝐭𝐰𝐨𝐫𝐤: ${d.network.toUpperCase()}\n 𝐔𝐬𝐞: bank card ${key}\n\n`;
            });
            designsText += "𝐄𝐱𝐚𝐦𝐩𝐥𝐞: bank card visa_platinum";
            return message.reply(designsText);
        }
        if (action === "register") {
            if (bank.registered) return message.reply("⚠️ 𝐘𝐨𝐮 𝐚𝐥𝐫𝐞𝐚𝐝𝐲 𝐡𝐚𝐯𝐞 𝐚 𝐛𝐚𝐧𝐤 𝐚𝐜𝐜𝐨𝐮𝐧𝐭.");
            bank.registered = true;
            bank.balance = 1000;
            bank.createdAt = this.nowISO();
            bank.transactions.push({ type: "received", amount: 1000, from: "𝐖𝐞𝐥𝐜𝐨𝐦𝐞 𝐁𝐨𝐧𝐮𝐬", time: Date.now() });
            await usersData.set(uid, { data: data.data });
            return message.reply(`✅ 𝐑𝐄𝐆𝐈𝐒𝐓𝐑𝐀𝐓𝐈𝐎𝐍 𝐒𝐔𝐂𝐂𝐄𝐒𝐒𝐅𝐔𝐋!\n🏦 𝐔𝐥𝐭𝐢𝐦𝐚𝐭𝐞 𝐃𝐢𝐠𝐢𝐭𝐚𝐥 𝐁𝐚𝐧𝐤\n📈 𝐀𝐜𝐜𝐨𝐮𝐧𝐭: ${bank.accountNumber}\n💰 𝐖𝐞𝐥𝐜𝐨𝐦𝐞 𝐁𝐨𝐧𝐮𝐬: 𝟏,𝟎𝟎𝟎 𝐁𝐃𝐓\n📅 𝐎𝐩𝐞𝐧𝐞𝐝: ${bank.createdAt}\n💳 𝐓𝐲𝐩𝐞: ${bank.accountType}\n\n𝐔𝐬𝐞: \`bank card\` 𝐭𝐨 𝐯𝐢𝐞𝐰 𝐲𝐨𝐮𝐫 𝐀𝐓𝐌 𝐜𝐚𝐫𝐝\n𝐔𝐬𝐞: \`bank card designs\` 𝐭𝐨 𝐬𝐞𝐞 𝐚𝐥𝐥 𝐝𝐞𝐬𝐢𝐠𝐧𝐬`);
        }
        if (!bank.registered) return message.reply("❌ 𝐘𝐨𝐮 𝐝𝐨𝐧'𝐭 𝐡𝐚𝐯𝐞 𝐚 𝐛𝐚𝐧𝐤 𝐚𝐜𝐜𝐨𝐮𝐧𝐭.\n𝐔𝐬𝐞: \`bank register\`");
        if (action === "balance") {
            return message.reply(`💰 𝐁𝐀𝐋𝐀𝐍𝐂𝐄 𝐈𝐍𝐅𝐎\n💳 𝐀𝐜𝐜𝐨𝐮𝐧𝐭: ${bank.accountNumber}\n💴 𝐁𝐚𝐥𝐚𝐧𝐜𝐞: ${this.formatMoney(bank.balance)} 𝐁𝐃𝐓\n🏦 𝐀𝐜𝐜𝐨𝐮𝐧𝐭 𝐓𝐲𝐩𝐞: ${bank.accountType}\n📊 𝐂𝐫𝐞𝐝𝐢𝐭 𝐒𝐜𝐨𝐫𝐞: ${bank.creditScore}\n💎 𝐒𝐚𝐯𝐢𝐧𝐠𝐬: ${this.formatMoney(bank.savings || 0)} 𝐁𝐃𝐓`);
        }
        if (action === "atmcode") {
            const newCode = this.generateATMCode();
            const expiryTime = Date.now() + (24 * 60 * 60 * 1000);
            if (!bank.atmCodes) bank.atmCodes = [];
            bank.atmCodes.push({ code: newCode, createdAt: Date.now(), expiresAt: expiryTime, used: false, maxAmount: Math.min(bank.balance, bank.dailyLimit - bank.usedToday) });
            await usersData.set(uid, { data: data.data });
            return message.reply(`🏧 𝐀𝐓𝐌 𝐂𝐎𝐃𝐄 𝐆𝐄𝐍𝐄𝐑𝐀𝐓𝐄𝐃\n🔐 𝐂𝐨𝐝𝐞: \`${newCode}\`\n⏰ 𝐄𝐱𝐩𝐢𝐫𝐞𝐬: ${new Date(expiryTime).toLocaleString()}\n💰 𝐌𝐚𝐱 𝐀𝐦𝐨𝐮𝐧𝐭: ${this.formatMoney(Math.min(bank.balance, bank.dailyLimit - bank.usedToday))} 𝐁𝐃𝐓\n📊 𝐃𝐚𝐢𝐥𝐲 𝐋𝐞𝐟𝐭: ${this.formatMoney(bank.dailyLimit - bank.usedToday)} 𝐁𝐃𝐓\n\n📌 𝐔𝐬𝐞: \`bank atmwithdraw ${newCode} <amount>\`\n⚠️ 𝐄𝐱𝐩𝐢𝐫𝐞𝐬 𝐢𝐧 𝟐𝟒𝐡 | 𝐎𝐧𝐞 𝐭𝐢𝐦𝐞 𝐮𝐬𝐞`);
        }
        if (action === "atmwithdraw") {
            const code = args[1]?.toUpperCase();
            const amount = parseFloat(args[2]);
            if (!code) return message.reply("❌ 𝐏𝐫𝐨𝐯𝐢𝐝𝐞 𝐀𝐓𝐌 𝐜𝐨𝐝𝐞.\n𝐔𝐬𝐚𝐠𝐞: bank atmwithdraw <code> <amount>");
            if (isNaN(amount) || amount <= 0) return message.reply("❌ 𝐕𝐚𝐥𝐢𝐝 𝐚𝐦𝐨𝐮𝐧𝐭 𝐫𝐞𝐪𝐮𝐢𝐫𝐞𝐝.");
            let foundUser = null, foundCode = null, foundUserId = null;
            const allUsers = await usersData.getAll();
            for (const [userId, userData] of Object.entries(allUsers)) {
                if (userData.data?.bank?.atmCodes) {
                    const atmCode = userData.data.bank.atmCodes.find(c => c.code === code && !c.used && c.expiresAt > Date.now());
                    if (atmCode) { foundUser = userData; foundCode = atmCode; foundUserId = userId; break; }
                }
            }
            if (!foundCode) return message.reply("❌ 𝐈𝐧𝐯𝐚𝐥𝐢𝐝/𝐞𝐱𝐩𝐢𝐫𝐞𝐝 𝐀𝐓𝐌 𝐜𝐨𝐝𝐞.");
            if (amount > foundCode.maxAmount) return message.reply(`❌ 𝐌𝐚𝐱 𝐚𝐥𝐥𝐨𝐰𝐞𝐝: ${this.formatMoney(foundCode.maxAmount)} 𝐁𝐃𝐓`);
            if (amount > foundUser.data.bank.balance) return message.reply(`❌ 𝐈𝐧𝐬𝐮𝐟𝐟𝐢𝐜𝐢𝐞𝐧𝐭 𝐛𝐚𝐥𝐚𝐧𝐜𝐞 𝐢𝐧 𝐬𝐨𝐮𝐫𝐜𝐞 𝐚𝐜𝐜𝐨𝐮𝐧𝐭.`);
            foundUser.data.bank.balance -= amount;
            foundCode.used = true;
            foundCode.usedAt = Date.now();
            foundCode.usedBy = uid;
            bank.balance += amount;
            bank.usedToday += amount;
            foundUser.data.bank.transactions.push({ type: "sent", amount, to: data.name || "𝐀𝐓𝐌 𝐔𝐬𝐞𝐫", time: Date.now(), method: "𝐀𝐓𝐌 𝐂𝐨𝐝𝐞", balance: foundUser.data.bank.balance });
            bank.transactions.push({ type: "received", amount, from: foundUser.name || "𝐀𝐓𝐌 𝐒𝐞𝐧𝐝𝐞𝐫", time: Date.now(), method: "𝐀𝐓𝐌 𝐂𝐨𝐝𝐞", balance: bank.balance });
            await usersData.set(foundUserId, { data: foundUser.data });
            await usersData.set(uid, { data: data.data });
            return message.reply(`✅ 𝐀𝐓𝐌 𝐖𝐈𝐓𝐇𝐃𝐑𝐀𝐖𝐀𝐋 𝐒𝐔𝐂𝐂𝐄𝐒𝐒!\n💰 𝐀𝐦𝐨𝐮𝐧𝐭: ${this.formatMoney(amount)} 𝐁𝐃𝐓\n👤 𝐅𝐫𝐨𝐦: ${foundUser.name || "𝐔𝐬𝐞𝐫"}\n💳 𝐘𝐨𝐮𝐫 𝐁𝐚𝐥: ${this.formatMoney(bank.balance)} 𝐁𝐃𝐓\n📊 𝐃𝐚𝐢𝐥𝐲 𝐋𝐞𝐟𝐭: ${this.formatMoney(bank.dailyLimit - bank.usedToday)} 𝐁𝐃𝐓\n\n📝 𝐓𝐫𝐚𝐧𝐬𝐚𝐜𝐭𝐢𝐨𝐧 𝐜𝐨𝐦𝐩𝐥𝐞𝐭𝐞𝐝`);
        }
        if (action === "card") {
            if (!bank.card) {
                bank.card = { number: this.generateCardNumber(), cvv: this.generateCVV(), pin: this.generatePIN(), expiry: this.getExpiry() };
                await usersData.set(uid, { data: data.data });
            }
            if (args[1] === "back") {
                const imageBuf = await this.createCardBack(bank.card, data.name || "User", bank.cardDesign);
                return message.reply({ body: `💳 𝐂𝐀𝐑𝐃 𝐁𝐀𝐂𝐊 𝐒𝐈𝐃𝐄\n\n🔐 𝐂𝐕𝐕: ${bank.card.cvv}\n📋 𝐒𝐢𝐠𝐧 𝐚𝐧𝐝 𝐤𝐞𝐞𝐩 𝐬𝐚𝐟𝐞`, attachment: imageBuf });
            }
            if (args[1] && this.cardDesigns[args[1]]) {
                bank.cardDesign = args[1];
                await usersData.set(uid, { data: data.data });
                return message.reply(`✅ 𝐂𝐚𝐫𝐝 𝐝𝐞𝐬𝐢𝐠𝐧 𝐜𝐡𝐚𝐧𝐠𝐞𝐝 𝐭𝐨: ${this.cardDesigns[args[1]].name}`);
            }
            const chosenDesign = args[1] || bank.cardDesign || "visa_platinum";
            const imageBuf = await this.createCardFront(bank.card, data.name || "User", bank.balance, bank.transactions, chosenDesign, bank.creditScore);
            return message.reply({
                body: `💳 𝐘𝐨𝐮𝐫 𝐀𝐓𝐌 𝐂𝐚𝐫𝐝\n\n💳 𝐂𝐚𝐫𝐝: ${bank.card.number}\n📅 𝐄𝐱𝐩: ${bank.card.expiry}\n🔐 𝐏𝐈𝐍: ${bank.card.pin}\n📊 𝐂𝐒: ${bank.creditScore.toString().split('').map(d => String.fromCharCode(120783 + parseInt(d))).join('')}\n💰 𝐁𝐚𝐥: ${this.formatMoney(bank.balance)} 𝐁𝐃𝐓\n\n🎨 𝐃𝐞𝐬𝐢𝐠𝐧: ${this.cardDesigns[chosenDesign]?.name || "𝐕𝐢𝐬𝐚 𝐏𝐥𝐚𝐭𝐢𝐧𝐮𝐦"}\n📱 𝐔𝐬𝐞: \`bank card back\` 𝐭𝐨 𝐬𝐞𝐞 𝐛𝐚𝐜𝐤 𝐬𝐢𝐝𝐞\n🎯 𝐔𝐬𝐞: \`bank card designs\` 𝐭𝐨 𝐬𝐞𝐞 𝐚𝐥𝐥 𝐝𝐞𝐬𝐢𝐠𝐧𝐬`,
                attachment: imageBuf
            });
        }
        if (action === "loan") {
            const amount = parseFloat(args[1]);
            if (isNaN(amount) || amount <= 0) return message.reply("❌ 𝐕𝐚𝐥𝐢𝐝 𝐚𝐦𝐨𝐮𝐧𝐭 𝐫𝐞𝐪𝐮𝐢𝐫𝐞𝐝.");
            if (bank.creditScore < 600) return message.reply(`❌ 𝐋𝐨𝐚𝐧 𝐫𝐞𝐣𝐞𝐜𝐭𝐞𝐝! 𝐘𝐨𝐮𝐫 𝐜𝐫𝐞𝐝𝐢𝐭 𝐬𝐜𝐨𝐫𝐞 (${bank.creditScore}) 𝐢𝐬 𝐭𝐨𝐨 𝐥𝐨𝐰. 𝐌𝐢𝐧 𝟔𝟎𝟎 𝐫𝐞𝐪𝐮𝐢𝐫𝐞𝐝.`);
            let maxLoan = bank.balance * 2;
            if (bank.creditScore >= 750) maxLoan = bank.balance * 5;
            else if (bank.creditScore >= 700) maxLoan = bank.balance * 3;
            if (amount > maxLoan) return message.reply(`❌ 𝐌𝐚𝐱 𝐥𝐨𝐚𝐧 𝐚𝐦𝐨𝐮𝐧𝐭: ${this.formatMoney(maxLoan)} 𝐁𝐃𝐓`);
            if (bank.loan && bank.loan.amount > 0) return message.reply(`❌ 𝐘𝐨𝐮 𝐡𝐚𝐯𝐞 𝐚𝐧 𝐞𝐱𝐢𝐬𝐭𝐢𝐧𝐠 𝐥𝐨𝐚𝐧 𝐨𝐟 ${this.formatMoney(bank.loan.amount)} 𝐁𝐃𝐓`);
            const dueDate = new Date();
            dueDate.setMonth(dueDate.getMonth() + 6);
            bank.loan = { amount, takenAt: Date.now(), dueDate: dueDate.getTime(), interest: this.calculateLoanInterest(amount, 180), repaid: false };
            bank.balance += amount;
            bank.transactions.push({ type: "received", amount, from: "𝐁𝐚𝐧𝐤 𝐋𝐨𝐚𝐧", time: Date.now(), method: "𝐋𝐨𝐚𝐧 𝐃𝐢𝐬𝐛𝐮𝐫𝐬𝐞𝐦𝐞𝐧𝐭", balance: bank.balance });
            await usersData.set(uid, { data: data.data });
            return message.reply(`✅ 𝐋𝐎𝐀𝐍 𝐀𝐏𝐏𝐑𝐎𝐕𝐄𝐃!\n💰 𝐀𝐦𝐨𝐮𝐧𝐭: ${this.formatMoney(amount)} 𝐁𝐃𝐓\n📊 𝐈𝐧𝐭𝐞𝐫𝐞𝐬𝐭: ${this.formatMoney(bank.loan.interest)} 𝐁𝐃𝐓 (𝟏𝟐%)\n📅 𝐃𝐮𝐞 𝐃𝐚𝐭𝐞: ${new Date(dueDate).toLocaleDateString()}\n💳 𝐍𝐞𝐰 𝐁𝐚𝐥: ${this.formatMoney(bank.balance)} 𝐁𝐃𝐓\n📈 𝐂𝐫𝐞𝐝𝐢𝐭 𝐒𝐜𝐨𝐫𝐞: ${bank.creditScore}\n\n𝐔𝐬𝐞: \`bank repay <amount>\` 𝐭𝐨 𝐫𝐞𝐩𝐚𝐲`);
        }
        if (action === "repay") {
            const amount = parseFloat(args[1]);
            if (!bank.loan || bank.loan.amount <= 0) return message.reply("❌ 𝐘𝐨𝐮 𝐡𝐚𝐯𝐞 𝐧𝐨 𝐚𝐜𝐭𝐢𝐯𝐞 𝐥𝐨𝐚𝐧.");
            if (isNaN(amount) || amount <= 0) return message.reply("❌ 𝐕𝐚𝐥𝐢𝐝 𝐚𝐦𝐨𝐮𝐧𝐭 𝐫𝐞𝐪𝐮𝐢𝐫𝐞𝐝.");
            const totalDue = bank.loan.amount + bank.loan.interest;
            if (amount > bank.balance) return message.reply(`❌ 𝐈𝐧𝐬𝐮𝐟𝐟𝐢𝐜𝐢𝐞𝐧𝐭 𝐛𝐚𝐥𝐚𝐧𝐜𝐞. 𝐍𝐞𝐞𝐝: ${this.formatMoney(amount)} 𝐁𝐃𝐓`);
            if (amount > totalDue) return message.reply(`❌ 𝐘𝐨𝐮 𝐨𝐧𝐥𝐲 𝐨𝐰𝐞 ${this.formatMoney(totalDue)} 𝐁𝐃𝐓`);
            bank.balance -= amount;
            bank.loan.amount -= amount;
            if (bank.loan.amount <= 0) {
                bank.loan = { amount: 0, takenAt: null, dueDate: null, interest: 0 };
            } else {
                const daysRemaining = (bank.loan.dueDate - Date.now()) / (1000 * 60 * 60 * 24);
                bank.loan.interest = this.calculateLoanInterest(bank.loan.amount, daysRemaining);
            }
            bank.transactions.push({ type: "sent", amount, to: "𝐋𝐨𝐚𝐧 𝐑𝐞𝐩𝐚𝐲𝐦𝐞𝐧𝐭", time: Date.now(), method: "𝐋𝐨𝐚𝐧 𝐑𝐞𝐩𝐚𝐲𝐦𝐞𝐧𝐭", balance: bank.balance });
            await usersData.set(uid, { data: data.data });
            return message.reply(`✅ 𝐋𝐎𝐀𝐍 𝐑𝐄𝐏𝐀𝐘𝐌𝐄𝐍𝐓 𝐒𝑈𝐂𝐂𝐄𝐒𝐒!\n💰 𝐏𝐚𝐢𝐝: ${this.formatMoney(amount)} 𝐁𝐃𝐓\n💳 𝐑𝐞𝐦𝐚𝐢𝐧𝐢𝐧𝐠: ${this.formatMoney(bank.loan.amount)} 𝐁𝐃𝐓\n📊 𝐍𝐞𝐰 𝐁𝐚𝐥: ${this.formatMoney(bank.balance)} 𝐁𝐃𝐓`);
        }
        if (action === "fd") {
            const subAction = args[1]?.toLowerCase();
            if (subAction === "create") {
                const amount = parseFloat(args[2]);
                if (isNaN(amount) || amount <= 0) return message.reply("❌ 𝐕𝐚𝐥𝐢𝐝 𝐚𝐦𝐨𝐮𝐧𝐭 𝐫𝐞𝐪𝐮𝐢𝐫𝐞𝐝.");
                if (amount > bank.balance) return message.reply(`❌ 𝐈𝐧𝐬𝐮𝐟𝐟𝐢𝐜𝐢𝐞𝐧𝐭 𝐛𝐚𝐥𝐚𝐧𝐜𝐞. 𝐍𝐞𝐞𝐝: ${this.formatMoney(amount)} 𝐁𝐃𝐓`);
                const maturityDate = new Date();
                maturityDate.setMonth(maturityDate.getMonth() + 3);
                const fd = { amount, createdAt: Date.now(), maturityDate: maturityDate.getTime(), interestRate: 0.05, interest: this.calculateInterest(amount, 90), withdrawn: false };
                if (!bank.fixedDeposits) bank.fixedDeposits = [];
                bank.fixedDeposits.push(fd);
                bank.balance -= amount;
                bank.transactions.push({ type: "sent", amount, to: "𝐅𝐢𝐱𝐞𝐝 𝐃𝐞𝐩𝐨𝐬𝐢𝐭", time: Date.now(), method: "𝐅𝐃 𝐂𝐫𝐞𝐚𝐭𝐢𝐨𝐧", balance: bank.balance });
                await usersData.set(uid, { data: data.data });
                return message.reply(`✅ 𝐅𝐈𝐗𝐄𝐃 𝐃𝐄𝐏𝐎𝐒𝐈𝐓 𝐂𝐑𝐄𝐀𝐓𝐄𝐃!\n💰 𝐀𝐦𝐨𝐮𝐧𝐭: ${this.formatMoney(amount)} 𝐁𝐃𝐓\n📈 𝐈𝐧𝐭𝐞𝐫𝐞𝐬𝐭: ${this.formatMoney(fd.interest)} 𝐁𝐃𝐓 (𝟓%)\n📅 𝐌𝐚𝐭𝐮𝐫𝐢𝐭𝐲: ${new Date(maturityDate).toLocaleDateString()}\n💰 𝐌𝐚𝐭𝐮𝐫𝐢𝐭𝐲 𝐕𝐚𝐥𝐮𝐞: ${this.formatMoney(amount + fd.interest)} 𝐁𝐃𝐓\n\n𝐔𝐬𝐞: \`bank fd withdraw\` 𝐚𝐟𝐭𝐞𝐫 𝐦𝐚𝐭𝐮𝐫𝐢𝐭𝐲`);
            }
            if (subAction === "withdraw") {
                if (!bank.fixedDeposits || bank.fixedDeposits.length === 0) return message.reply("❌ 𝐘𝐨𝐮 𝐡𝐚𝐯𝐞 𝐧𝐨 𝐅𝐃.");
                let totalWithdrawn = 0;
                const now = Date.now();
                bank.fixedDeposits = bank.fixedDeposits.filter(fd => {
                    if (fd.withdrawn) return false;
                    if (now >= fd.maturityDate) {
                        const val = fd.amount + fd.interest;
                        bank.balance += val;
                        totalWithdrawn += val;
                        bank.transactions.push({ type: "received", amount: val, from: "𝐅𝐃 𝐌𝐚𝐭𝐮𝐫𝐢𝐭𝐲", time: Date.now(), method: "𝐅𝐃 𝐖𝐢𝐭𝐡𝐝𝐫𝐚𝐰𝐚𝐥", balance: bank.balance });
                        return false;
                    }
                    return true;
                });
                if (totalWithdrawn === 0) return message.reply("❌ 𝐍𝐨 𝐅𝐃 𝐡𝐚𝐬 𝐦𝐚𝐭𝐮𝐫𝐞𝐝 𝐲𝐞𝐭.");
                await usersData.set(uid, { data: data.data });
                return message.reply(`✅ 𝐅𝐃 𝐖𝐈𝐓𝐇𝐃𝐑𝐀𝐖𝐀𝐋 𝐒𝐔𝐂𝐂𝐄𝐒𝐒!\n💰 𝐓𝐨𝐭𝐚𝐥 𝐑𝐞𝐜𝐞𝐢𝐯𝐞𝐝: ${this.formatMoney(totalWithdrawn)} 𝐁𝐃𝐓\n💳 𝐍𝐞𝐰 𝐁𝐚𝐥𝐚𝐧𝐜𝐞: ${this.formatMoney(bank.balance)} 𝐁𝐃𝐓`);
            }
            let fdText = "🏦 𝐅𝐈𝐗𝐄𝐃 𝐃𝐄𝐏𝐎𝐒𝐈𝐓𝐒\n\n";
            if (!bank.fixedDeposits || bank.fixedDeposits.length === 0) {
                fdText += "𝐍𝐨 𝐚𝐜𝐭𝐢𝐯𝐞 𝐅𝐃.\n";
            } else {
                bank.fixedDeposits.forEach((fd, i) => {
                    const status = fd.maturityDate > Date.now() ? "⏳ 𝐀𝐜𝐭𝐢𝐯𝐞" : "✅ 𝐌𝐚𝐭𝐮𝐫𝐞𝐝";
                    fdText += `${(i+1).toString().split('').map(d => String.fromCharCode(120783 + parseInt(d))).join('')}. ${status}\n 💰 ${this.formatMoney(fd.amount)} 𝐁𝐃𝐓\n 📈 +${this.formatMoney(fd.interest)} 𝐁𝐃𝐓\n 📅 ${new Date(fd.maturityDate).toLocaleDateString()}\n\n`;
                });
            }
            fdText += "𝐔𝐬𝐞: \`bank fd create <amount>\`\n𝐔𝐬𝐞: \`bank fd withdraw\`";
            return message.reply(fdText);
        }
        if (action === "interest") {
            const now = Date.now();
            const lastClaim = bank.lastInterestClaim || (bank.createdAt ? new Date(bank.createdAt).getTime() : now);
            if (lastClaim && (now - lastClaim) < 24 * 60 * 60 * 1000) {
                const hoursLeft = Math.floor((24 * 60 * 60 * 1000 - (now - lastClaim)) / (60 * 60 * 1000));
                return message.reply(`⏳ 𝐈𝐧𝐭𝐞𝐫𝐞𝐬𝐭 𝐚𝐯𝐚𝐢𝐥𝐚𝐛𝐥𝐞 𝐢𝐧 ${hoursLeft} 𝐡𝐨𝐮𝐫𝐬.`);
            }
            const totalInterest = (bank.savings * 0.02) + (bank.balance * 0.01);
            if (totalInterest < 1) return message.reply("❌ 𝐈𝐧𝐬𝐮𝐟𝐟𝐢𝐜𝐢𝐞𝐧𝐭 𝐛𝐚𝐥𝐚𝐧𝐜𝐞 𝐟𝐨𝐫 𝐢𝐧𝐭𝐞𝐫𝐞𝐬𝐭.");
            bank.balance += totalInterest;
            bank.lastInterestClaim = now;
            bank.transactions.push({ type: "received", amount: totalInterest, from: "𝐈𝐧𝐭𝐞𝐫𝐞𝐬𝐭 𝐏𝐚𝐲𝐦𝐞𝐧𝐭", time: now, method: "𝐃𝐚𝐢𝐥𝐲 𝐈𝐧𝐭𝐞𝐫𝐞𝐬𝐭", balance: bank.balance });
            await usersData.set(uid, { data: data.data });
            return message.reply(`✅ 𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 𝐂𝐎𝐋𝐋𝐄𝐂𝐓𝐄𝐃!\n💳 𝐓𝐨𝐭𝐚𝐥: ${this.formatMoney(totalInterest)} 𝐁𝐃𝐓\n📊 𝐍𝐞𝐰 𝐁𝐚𝐥: ${this.formatMoney(bank.balance)} 𝐁𝐃𝐓\n\n𝐍𝐞𝐱𝐭 𝐢𝐧 𝟐𝟒 𝐡𝐨𝐮𝐫𝐬`);
        }
        if (action === "transfer") {
            const targetAccount = args[1], amount = parseFloat(args[2]);
            if (!targetAccount) return message.reply("❌ 𝐏𝐫𝐨𝐯𝐢𝐝𝐞 𝐚𝐜𝐜𝐨𝐮𝐧𝐭 𝐧𝐮𝐦𝐛𝐞𝐫.");
            if (isNaN(amount) || amount <= 0) return message.reply("❌ 𝐕𝐚𝐥𝐢𝐝 𝐚𝐦𝐨𝐮𝐧𝐭 𝐫𝐞𝐪𝐮𝐢𝐫𝐞𝐝.");
            if (amount > bank.balance) return message.reply("❌ 𝐈𝐧𝐬𝐮𝐟𝐟𝐢𝐜𝐢𝐞𝐧𝐭 𝐛𝐚𝐥𝐚𝐧𝐜𝐞.");
            if (amount > bank.dailyLimit - bank.usedToday) return message.reply(`❌ 𝐃𝐚𝐢𝐥𝐲 𝐥𝐢𝐦𝐢𝐭 𝐞𝐱𝐜𝐞𝐞𝐝𝐞𝐝. 𝐋𝐞𝐟𝐭: ${this.formatMoney(bank.dailyLimit - bank.usedToday)} 𝐁𝐃𝐓`);
            let targetUser = null, targetUserId = null;
            const allUsers = await usersData.getAll();
            for (const [userId, userData] of Object.entries(allUsers)) {
                if (userData.data?.bank?.accountNumber === targetAccount) {
                    targetUser = userData; targetUserId = userId; break;
                }
            }
            if (!targetUser) return message.reply("❌ 𝐀𝐜𝐜𝐨𝐮𝐧𝐭 𝐧𝐮𝐦𝐛𝐞𝐫 𝐧𝐨𝐭 𝐟𝐨𝐮𝐧𝐝.");
            if (targetUserId === uid) return message.reply("❌ 𝐂𝐚𝐧𝐧𝐨𝐭 𝐭𝐫𝐚𝐧𝐬𝐟𝐞𝐫 𝐭𝐨 𝐲𝐨𝐮𝐫 𝐨𝐰𝐧 𝐚𝐜𝐜𝐨𝐮𝐧𝐭.");
            bank.balance -= amount;
            bank.usedToday += amount;
            targetUser.data.bank.balance += amount;
            bank.transactions.push({ type: "sent", amount, to: targetUser.name || "𝐔𝐬𝐞𝐫", time: Date.now(), method: "𝐀𝐜𝐜𝐨𝐮𝐧𝐭 𝐓𝐫𝐚𝐧𝐬𝐟𝐞𝐫", account: targetAccount, balance: bank.balance });
            targetUser.data.bank.transactions.push({ type: "received", amount, from: data.name || "𝐔𝐬𝐞𝐫", time: Date.now(), method: "𝐀𝐜𝐜𝐨𝐮𝐧𝐭 𝐓𝐫𝐚𝐧𝐬𝐟𝐞𝐫", account: bank.accountNumber, balance: targetUser.data.bank.balance });
            await usersData.set(uid, { data: data.data });
            await usersData.set(targetUserId, { data: targetUser.data });
            return message.reply(`✅ 𝐓𝐑𝐀𝐍𝐒𝐅𝐄𝐑 𝐒𝐔𝐂𝐂𝐄𝐒𝐒!\n💰 𝐀𝐦𝐨𝐮𝐧𝐭: ${this.formatMoney(amount)} 𝐁𝐃𝐓\n📋 𝐓𝐨: ${targetUser.name || "𝐔𝐬𝐞𝐫"}\n📈 𝐀𝐜𝐜𝐨𝐮𝐧𝐭: ${targetAccount}\n💳 𝐘𝐨𝐮𝐫 𝐁𝐚𝐥: ${this.formatMoney(bank.balance)} 𝐁𝐃𝐓\n📊 𝐃𝐚𝐢𝐥𝐲 𝐋𝐞𝐟𝐭: ${this.formatMoney(bank.dailyLimit - bank.usedToday)} 𝐁𝐃𝐓`);
        }
        if (action === "deposit") {
            const amount = parseFloat(args[1]);
            if (isNaN(amount) || amount <= 0) return message.reply("❌ 𝐄𝐧𝐭𝐞𝐫 𝐚 𝐯𝐚𝐥𝐢𝐝 𝐚𝐦𝐨𝐮𝐧𝐭.");
            bank.balance += amount;
            bank.transactions.push({ type: "received", amount, from: "𝐃𝐞𝐩𝐨𝐬𝐢𝐭", time: Date.now(), balance: bank.balance });
            await usersData.set(uid, { data: data.data });
            return message.reply(`✅ 𝐃𝐄𝐏𝐎𝐒𝐈𝐓 𝐒𝐔𝐂𝐂𝐄𝐒𝐒!\n💰 +${this.formatMoney(amount)} 𝐁𝐃𝐓\n💳 𝐍𝐞𝐰 𝐁𝐚𝐥𝐚𝐧𝐜𝐞: ${this.formatMoney(bank.balance)} 𝐁𝐃𝐓`);
        }
        if (action === "withdraw") {
            const amount = parseFloat(args[1]);
            if (isNaN(amount) || amount <= 0) return message.reply("❌ 𝐄𝐧𝐭𝐞𝐫 𝐚 𝐯𝐚𝐥𝐢𝐝 𝐚𝐦𝐨𝐮𝐧𝐭.");
            if (amount > bank.balance) return message.reply("❌ 𝐈𝐧𝐬𝐮𝐟𝐟𝐢𝐜𝐢𝐞𝐧𝐭 𝐛𝐚𝐥𝐚𝐧𝐜𝐞.");
            if (amount > bank.dailyLimit - bank.usedToday) return message.reply(`❌ 𝐃𝐚𝐢𝐥𝐲 𝐥𝐢𝐦𝐢𝐭 𝐞𝐱𝐜𝐞𝐞𝐝𝐞𝐝. 𝐋𝐞𝐟𝐭: ${this.formatMoney(bank.dailyLimit - bank.usedToday)} 𝐁𝐃𝐓`);
            bank.balance -= amount;
            bank.usedToday += amount;
            bank.transactions.push({ type: "sent", amount, to: "𝐖𝐢𝐭𝐡𝐝𝐫𝐚𝐰𝐚𝐥", time: Date.now(), balance: bank.balance });
            await usersData.set(uid, { data: data.data });
            return message.reply(`✅ 𝐖𝐈𝐓𝐇𝐃𝐑𝐀𝐖𝐀𝐋 𝐒𝐔𝐂𝐂𝐄𝐒𝐒!\n💰 -${this.formatMoney(amount)} 𝐁𝐃𝐓\n💳 𝐍𝐞𝐰 𝐁𝐚𝐥𝐚𝐧𝐜𝐞: ${this.formatMoney(bank.balance)} 𝐁𝐃𝐓\n📊 𝐃𝐚𝐢𝐥𝐲 𝐋𝐞𝐟𝐭: ${this.formatMoney(bank.dailyLimit - bank.usedToday)} 𝐁𝐃𝐓`);
        }
        if (action === "send") {
            if (!args[1] || !args[2]) return message.reply("❌ 𝐔𝐬𝐚𝐠𝐞: bank send <@user> <amount>");
            let targetId = args[1].startsWith("@") ? ((Array.isArray(event.mentions) ? event.mentions[0] : Object.keys(event.mentions || {})[0]) || null) : args[1];
            if (!targetId) return message.reply("❌ 𝐏𝐥𝐞𝐚𝐬𝐞 𝐦𝐞𝐧𝐭𝐢𝐨𝐧 𝐚 𝐮𝐬𝐞𝐫.");
            const amount = parseFloat(args[2]);
            if (isNaN(amount) || amount <= 0) return message.reply("❌ 𝐕𝐚𝐥𝐢𝐝 𝐚𝐦𝐨𝐮𝐧𝐭 𝐫𝐞𝐪𝐮𝐢𝐫𝐞𝐝.");
            if (amount > bank.balance) return message.reply("❌ 𝐈𝐧𝐬𝐮𝐟𝐟𝐢𝐜𝐢𝐞𝐧𝐭 𝐛𝐚𝐥𝐚𝐧𝐜𝐞.");
            if (amount > bank.dailyLimit - bank.usedToday) return message.reply(`❌ 𝐃𝐚𝐢𝐥𝐲 𝐥𝐢𝐦𝐢𝐭 𝐞𝐱𝐜𝐞𝐞𝐝𝐞𝐝. 𝐋𝐞𝐟𝐭: ${this.formatMoney(bank.dailyLimit - bank.usedToday)} 𝐁𝐃𝐓`);
            let targetData = await usersData.get(targetId);
            if (!targetData.data) targetData.data = {};
            if (!targetData.data.bank) targetData.data.bank = { balance: 0, registered: false, card: null, transactions: [], accountNumber: this.generateAccountNumber(), atmCodes: [] };
            if (!targetData.data.bank.registered) return message.reply("❌ 𝐑𝐞𝐜𝐢𝐩𝐢𝐞𝐧𝐭 𝐝𝐨𝐞𝐬 𝐧𝐨𝐭 𝐡𝐚𝐯𝐞 𝐚 𝐛𝐚𝐧𝐤 𝐚𝐜𝐜𝐨𝐮𝐧𝐭.");
            bank.balance -= amount;
            bank.usedToday += amount;
            targetData.data.bank.balance += amount;
            bank.transactions.push({ type: "sent", amount, to: targetData.name || "𝐔𝐬𝐞𝐫", time: Date.now(), method: "𝐃𝐢𝐫𝐞𝐜𝐭 𝐒𝐞𝐧𝐝", balance: bank.balance });
            targetData.data.bank.transactions.push({ type: "received", amount, from: data.name || "𝐔𝐬𝐞𝐫", time: Date.now(), method: "𝐃𝐢𝐫𝐞𝐜𝐭 𝐒𝐞𝐧𝐝", balance: targetData.data.bank.balance });
            await usersData.set(uid, { data: data.data });
            await usersData.set(targetId, { data: targetData.data });
            return message.reply(`✅ 𝐓𝐑𝐀𝐍𝐒𝐅𝐄𝐑 𝐒𝐔𝐂𝐂𝐄𝐒𝐒!\n💰 𝐀𝐦𝐨𝐮𝐧𝐭: ${this.formatMoney(amount)} 𝐁𝐃𝐓\n👤 𝐓𝐨: ${targetData.name || "𝐔𝐬𝐞𝐫"}\n💳 𝐘𝐨𝐮𝐫 𝐁𝐚𝐥: ${this.formatMoney(bank.balance)} 𝐁𝐃𝐓\n📊 𝐃𝐚𝐢𝐥𝐲 𝐋𝐞𝐟𝐭: ${this.formatMoney(bank.dailyLimit - bank.usedToday)} 𝐁𝐃𝐓`);
        }
        if (action === "ministatement" || action === "history") {
            const limit = action === "ministatement" ? 5 : 15;
            let text = action === "ministatement" ? "📋 𝐌𝐈𝐍𝐈 𝐒𝐓𝐀𝐓𝐄𝐌𝐄𝐍𝐓\n\n" : "📝 𝐓𝐑𝐀𝐍𝐒𝐀𝐂𝐓𝐈𝐎𝐍 𝐇𝐈𝐒𝐓𝐎𝐑𝐘\n\n";
            if (!bank.transactions.length) {
                text += "𝐍𝐨 𝐭𝐫𝐚𝐧𝐬𝐚𝐜𝐭𝐢𝐨𝐧𝐬 𝐲𝐞𝐭.\n";
            } else {
                bank.transactions.slice(-limit).reverse().forEach((tx, i) => {
                    const date = tx.time ? new Date(tx.time).toLocaleString() : "𝐈𝐧𝐯𝐚𝐥𝐢𝐝 𝐃𝐚𝐭𝐞";
                    const isRec = tx.type === "received";
                    text += `${isRec ? '📥' : '📤'} ${isRec ? '+' : '-'}${this.formatMoney(tx.amount)} 𝐁𝐃𝐓\n ${isRec ? '𝐅𝐫𝐨𝐦' : '𝐓𝐨'}: ${tx.from || tx.to || '𝐔𝐧𝐤𝐧𝐨𝐰𝐧'}\n 📅 ${date}\n\n`;
                });
            }
            return message.reply(text);
        }
        if (action === "leaderboard") {
            const allUsers = await usersData.getAll();
            const richList = [];
            for (const [userId, userData] of Object.entries(allUsers)) {
                if (userData.data?.bank?.registered && userData.data.bank.balance > 0) {
                    richList.push({ name: userData.name || "𝐔𝐬𝐞𝐫", balance: userData.data.bank.balance, type: userData.data.bank.accountType || "𝐒𝐭𝐚𝐧𝐝𝐚𝐫𝐝" });
                }
            }
            richList.sort((a, b) => b.balance - a.balance);
            let lbText = "👑 𝐖𝐄𝐀𝐋𝐓𝐇 𝐋𝐄𝐀𝐃𝐄𝐑𝐁𝐎𝐀𝐑𝐃\n\n";
            richList.slice(0, 10).forEach((u, i) => {
                lbText += `${i < 3 ? ['🥇','🥈','🥉'][i] : (i+1)+'.'} ${u.name}\n 💰 ${this.formatMoney(u.balance)} 𝐁𝐃𝐓\n 🏦 ${u.type}\n\n`;
            });
            return message.reply(lbText || "𝐍𝐨 𝐫𝐞𝐠𝐢𝐬𝐭𝐞𝐫𝐞𝐝 𝐮𝐬𝐞𝐫𝐬 𝐲𝐞𝐭.");
        }
        if (action === "account") {
            const activeCodes = bank.atmCodes?.filter(c => !c.used && c.expiresAt > Date.now()).length || 0;
            const activeFD = bank.fixedDeposits?.filter(fd => !fd.withdrawn).length || 0;
            const loanInfo = (bank.loan && bank.loan.amount > 0) ? `${this.formatMoney(bank.loan.amount)} 𝐁𝐃𝐓` : "𝐍𝐨 𝐚𝐜𝐭𝐢𝐯𝐞 𝐥𝐨𝐚𝐧";
            return message.reply(`💳 𝐀𝐂𝐂𝐎𝐔𝐍𝐓 𝐃𝐄𝐓𝐀𝐈𝐋𝐒\n🏦 𝐁𝐚𝐧𝐤: 𝐔𝐥𝐭𝐢𝐦𝐚𝐭𝐞 𝐁𝐚𝐧𝐤\n👤 𝐇𝐨𝐥𝐝𝐞𝐫: ${data.name || "𝐔𝐬𝐞𝐫"}\n📈 𝐀𝐜𝐜𝐨𝐮𝐧𝐭: ${bank.accountNumber}\n🏷️ 𝐓𝐲𝐩𝐞: ${bank.accountType}\n💴 𝐁𝐚𝐥𝐚𝐧𝐜𝐞: ${this.formatMoney(bank.balance)} 𝐁𝐃𝐓\n💎 𝐒𝐚𝐯𝐢𝐧𝐠𝐬: ${this.formatMoney(bank.savings || 0)} 𝐁𝐃𝐓\n📊 𝐂𝐫𝐞𝐝𝐢𝐭 𝐒𝐜𝐨𝐫𝐞: ${bank.creditScore}\n🏧 𝐀𝐓𝐌 𝐂𝐨𝐝𝐞𝐬: ${activeCodes} 𝐚𝐜𝐭𝐢𝐯𝐞\n🏦 𝐅𝐃 𝐂𝐨𝐮𝐧𝐭: ${activeFD}\n💰 𝐋𝐨𝐚𝐧: ${loanInfo}\n📅 𝐉𝐨𝐢𝐧𝐞𝐝: ${bank.createdAt ? new Date(bank.createdAt).toLocaleDateString() : "𝐍/𝐀"}`);
        }
        return message.reply(`🏦 𝐔𝐋𝐓𝐈𝐌𝐀𝐓𝐄 𝐁𝐀𝐍𝐊 𝐌𝐄𝐍𝐔\n💳 𝐀𝐂𝐂𝐎𝐔𝐍𝐓:\n• 𝐫𝐞𝐠𝐢𝐬𝐭𝐞𝐫 | 𝐛𝐚𝐥𝐚𝐧𝐜𝐞 | 𝐚𝐜𝐜𝐨𝐮𝐧𝐭\n\n💳 𝐀𝐓𝐌 𝐂𝐀𝐑𝐃:\n• 𝐜𝐚𝐫𝐝 | 𝐜𝐚𝐫𝐝 𝐛𝐚𝐜𝐤 | 𝐜𝐚𝐫𝐝 𝐝𝐞𝐬𝐢𝐠𝐧𝐬 | 𝐚𝐭𝐦𝐜𝐨𝐝𝐞 | 𝐚𝐭𝐦𝐰𝐢𝐭𝐡𝐝𝐫𝐚𝐰\n\n💸 𝐓𝐑𝐀𝐍𝐒𝐀𝐂𝐓𝐈𝐎𝐍𝐒:\n• 𝐝𝐞𝐩𝐨𝐬𝐢𝐭 | 𝐰𝐢𝐭𝐡𝐝𝐫𝐚𝐰 | 𝐬𝐞𝐧𝐝 | 𝐭𝐫𝐚𝐧𝐬𝐟𝐞𝐫\n\n💰 𝐈𝐍𝐕𝐄𝐒𝐓𝐌𝐄𝐍𝐓𝐒 & 𝐋𝐎𝐀𝐍𝐒:\n• 𝐟𝐝 | 𝐢𝐧𝐭𝐞𝐫𝐞𝐬𝐭 | 𝐥𝐨𝐚𝐧 | 𝐫𝐞𝐩𝐚𝐲\n\n📊 𝐎𝐓𝐇𝐄𝐑𝐒:\n• 𝐡𝐢𝐬𝐭𝐨𝐫𝐲 | 𝐦𝐢𝐧𝐢𝐬𝐭𝐚𝐭𝐞𝐦𝐞𝐧𝐭 | 𝐥𝐞𝐚𝐝𝐞𝐫𝐛𝐨𝐚𝐫𝐝`);
    }
};

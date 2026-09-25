module.exports = {
  config: {
    name: "bank",
    aliases: ["bankinfo", "banking"],
    version: "1.5.0",
    author: "SK-SIDDIK-KHAN",
    countDown: 5,
    role: 0,
    usePrefix: true,
    description: {
            en: "Bank system with wallet, bank, loan, etc."
        },
        category: "economy",
        guide: {
            en: "{pn} balance\n{pn} deposit <amount>\n{pn} withdraw <amount>\n{pn} loan\n{pn} preloan\n{pn} top"
        }
},
    langs: {
        en: { syntaxError: "Please use the correct syntax: {pn}!" }
    },
  formatMoney(amount) {
    if (amount === 0) return "0";
    const abs = Math.abs(amount);
    if (abs >= 1e15)
      return (amount / 1e15).toFixed(2).replace(/\.00$/, "") + "qt";
    if (abs >= 1e12)
      return (amount / 1e12).toFixed(2).replace(/\.00$/, "") + "treelion";
    if (abs >= 1e9)
      return (amount / 1e9).toFixed(2).replace(/\.00$/, "") + "bilon";
    if (abs >= 1e6)
      return (amount / 1e6).toFixed(2).replace(/\.00$/, "") + "milon";
    if (abs >= 1e3)
      return (amount / 1e3).toFixed(2).replace(/\.00$/, "") + "k";
    return amount.toString();
  },
  onStart: async function ({ message, args, event, usersData }) {
    try {
      const senderID = event.senderID;
      const cmd = args[0]?.toLowerCase();
      if (!cmd) {
        return message.reply(
          "┌───────────⭓\n" +
          "│ 𝐁𝐀𝐍𝐊 𝐈𝐍𝐅𝐎\n" +
          "├───────────\n" +
          "│ 💰 𝐁𝐚𝐥𝐚𝐧𝐜𝐞\n" +
          "│ 💵 𝐃𝐞𝐩𝐨𝐬𝐢𝐭 <amount>\n" +
          "│ 🏧 𝐖𝐢𝐭𝐡𝐝𝐫𝐚𝐰 <amount>\n" +
          "│ 💳 𝐋𝐨𝐚𝐧\n" +
          "│ 📋 𝐏𝐫𝐞𝐥𝐨𝐚𝐧\n" +
          "│ 🏆 𝐓𝐨𝐩\n" +
          "└───────────⭓"
        );
      }
      let userData = await usersData.get(senderID);
      if (!userData.data)
        userData.data = {};
      if (!userData.data.bankdata)
        userData.data.bankdata = {
          bank: 0,
          loan: 0
        };
      let wallet = userData.money || 0;
      let bankData = userData.data.bankdata;
      const format = this.formatMoney;
      if (cmd === "balance") {
        return message.reply(
          `🏦 Your Bank Account Summary:\n` +
          `💰 Wallet: ${format(wallet)}\n` +
          `🏦 Bank: ${format(bankData.bank)}\n` +
          `💳 Loan: ${format(bankData.loan)}`
        );
      }
      if (cmd === "deposit") {
        const amount = parseInt(args[1]);
        if (isNaN(amount) || amount <= 0) {
          return message.reply("❌ Provide a valid amount to deposit.");
        }
        if (wallet < amount) {
          return message.reply(
            `❌ You only have ${format(wallet)} in your wallet.`
          );
        }
        wallet -= amount;
        bankData.bank += amount;
        await usersData.set(senderID, {
          money: wallet,
          data: userData.data
        });
        return message.reply(
          `✅ Deposited ${format(amount)}\n` +
          `🏦 Bank: ${format(bankData.bank)}\n` +
          `💰 Wallet: ${format(wallet)}`
        );
      }
      if (cmd === "withdraw") {
        const amount = parseInt(args[1]);
        if (isNaN(amount) || amount <= 0) {
          return message.reply("❌ Provide a valid amount to withdraw.");
        }
        if (bankData.bank < amount) {
          return message.reply(
            `❌ You only have ${format(bankData.bank)} in your bank.`
          );
        }
        bankData.bank -= amount;
        wallet += amount;
        await usersData.set(senderID, {
          money: wallet,
          data: userData.data
        });
        return message.reply(
          `✅ Withdrew ${format(amount)}\n` +
          `💰 Wallet: ${format(wallet)}\n` +
          `🏦 Bank: ${format(bankData.bank)}`
        );
      }
      if (cmd === "loan") {
        const loanLimit = 1000000;
        if (bankData.loan > 0) {
          return message.reply(
            `⛔ You already have a loan of ${format(bankData.loan)}. Repay it first.`
          );
        }
        bankData.loan = loanLimit;
        wallet += loanLimit;
        await usersData.set(senderID, {
          money: wallet,
          data: userData.data
        });
        return message.reply(
          `✅ Loan approved: ${format(loanLimit)} added to your wallet. Remember to repay it!`
        );
      }
      if (cmd === "preloan") {
        if (bankData.loan === 0) {
          return message.reply("✅ You have no active loan.");
        }
        if (wallet < bankData.loan) {
          return message.reply(
            `❌ You need ${format(bankData.loan)} to repay.`
          );
        }
        wallet -= bankData.loan;
        bankData.loan = 0;
        await usersData.set(senderID, {
          money: wallet,
          data: userData.data
        });
        return message.reply("✅ Loan fully repaid. You are debt-free!");
      }
      if (cmd === "top") {
        const allUsers = await usersData.getAll();
        const topUsers = allUsers
          .filter(u => u?.data?.bankdata?.bank > 0)
          .sort((a, b) => b.data.bankdata.bank - a.data.bankdata.bank)
          .slice(0, 10);
        if (topUsers.length === 0) {
          return message.reply("❌ No users found with money in bank.");
        }
        let msg = "🏆 Top 10 Users by Bank Balance:\n";
        for (let i = 0; i < topUsers.length; i++) {
          const user = topUsers[i];
          msg += `${i + 1}. ${user.name || "Unknown"}: ${format(user.data.bankdata.bank)}\n`;
        }
        return message.reply(msg.trim());
      }
      return message.reply(
        "❓ Invalid subcommand. Try: balance, deposit, withdraw, loan, preloan, top"
      );
    } catch (error) {
      console.error("Bank command error:", error);
      return message.reply("❌ An error occurred. Please try again later.");
    }
  }
};

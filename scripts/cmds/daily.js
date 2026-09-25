const moment = require("moment-timezone");

module.exports = {
  config: {
    name: "daily",
    version: "1.5.0",
    author: "SK-SIDDIK-KHAN",
    countDown: 5,
    role: 0,
    shortDescription: "Receive daily gift",
    longDescription:
      "Receive daily gift or view information about the daily rewards.",
    category: "game",
    guide: {
      en: "   {pn}\n   {pn} info: View daily gift information",
    },
    envConfig: {
      rewardFirstDay: {
        coin: 100,
        exp: 10,
      },
    },
  },

  langs: {
    en: {
      monday: "Monday",
      tuesday: "Tuesday",
      wednesday: "Wednesday",
      thursday: "Thursday",
      friday: "Friday",
      saturday: "Saturday",
      sunday: "Sunday",
      alreadyReceived: "You have already received the gift",
      received: "You have received %1 coin and %2 exp",
    },
  },

  onStart: async function ({ args, message, event }) {
    const langData = module.exports.langs.en;
    const getLang = (key, ...args) => {
      let text = langData[key] || key;
      args.forEach((arg, i) => {
        text = text.replace(`%${i + 1}`, arg);
      });
      return text;
    };

    const reward = module.exports.config.envConfig.rewardFirstDay;

    if (args[0] == "info") {
      let msg = "";
      for (let i = 1; i < 8; i++) {
        const getCoin = Math.floor(
          reward.coin * (1 + 20 / 100) ** ((i == 0 ? 7 : i) - 1),
        );
        const getExp = Math.floor(
          reward.exp * (1 + 20 / 100) ** ((i == 0 ? 7 : i) - 1),
        );
        const day =
          i == 7
            ? getLang("sunday")
            : i == 6
              ? getLang("saturday")
              : i == 5
                ? getLang("friday")
                : i == 4
                  ? getLang("thursday")
                  : i == 3
                    ? getLang("wednesday")
                    : i == 2
                      ? getLang("tuesday")
                      : getLang("monday");
        msg += `${day}: ${getCoin} coin, ${getExp} exp\n`;
      }
      return message.reply(msg);
    }

    const usersData = global.db && global.db.usersData;
    if (!usersData) return message.reply("❌ Database not initialized.");

    const dateTime = moment.tz("Asia/Dhaka").format("DD/MM/YYYY");
    const date = new Date();
    const currentDay = date.getDay();
    const senderID = event.senderID;

    const userData = await usersData.get(senderID);
    if (!userData)
      return message.reply("❌ User data not found. Please try again.");
    if (!userData.data) userData.data = {};

    if (userData.data.lastTimeGetReward === dateTime)
      return message.reply(getLang("alreadyReceived"));

    const getCoin = Math.floor(
      reward.coin * (1 + 20 / 100) ** ((currentDay == 0 ? 7 : currentDay) - 1),
    );
    const getExp = Math.floor(
      reward.exp * (1 + 20 / 100) ** ((currentDay == 0 ? 7 : currentDay) - 1),
    );

    userData.data.lastTimeGetReward = dateTime;
    await usersData.set(senderID, {
      money: userData.money + getCoin,
      exp: userData.exp + getExp,
      data: userData.data,
    });

    message.reply(getLang("received", getCoin, getExp));
  },
};

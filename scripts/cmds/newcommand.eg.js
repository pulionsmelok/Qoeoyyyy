module.exports = {
  config: {
    name: "newcommand", // The name of the command
    aliases: ["newcmd"], // Alternative names to trigger the command
    version: "1.5.0",
    author: "SK-SIDDIK-KHAN",
    countDown: 5, // Cooldown time in seconds before user can run this command again
    role: 0, // Permission level: 0 = everyone, 1 = group admin, 2 = bot admin
    shortDescription: "A brief description of what this command does",
    longDescription:
      "A more detailed description explaining the command features and usage.",
    category: "custom", // The category this command belongs to
    guide: {
      en: "{pn} [args]", // {pn} is replaced with the prefix + command name. e.g., !newcommand
    },
  },

  // The main function that runs when the command is called
  onStart: async function ({
    api,
    event,
    message,
    args,
    threadsData,
    usersData,
  }) {
    // Example: send a message back to the user
    // args contains the arguments passed after the command name

    const replyText =
      args.length > 0
        ? `You provided the following arguments: ${args.join(" ")}`
        : "Hello! This is a template command. You didn't provide any arguments.";

    return message.reply(replyText);
  },

  // Optional: handles replies to a message sent by this command
  onReply: async function ({
    api,
    event,
    Reply,
    message,
    threadsData,
    usersData,
  }) {
    // Write logic here for when a user replies to the bot's message
  },

  // Optional: executes on every event that happens in the chat (if you need a listener)
  onEvent: async function ({ api, event, message, threadsData, usersData }) {
    // Write logic here
  },
};

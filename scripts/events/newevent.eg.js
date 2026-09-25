module.exports = {
  config: {
    name: "newevent", // The name of the event
    version: "1.5.0",
    author: "SK-SIDDIK-KHAN",
    category: "events", // Categorize as an event
  },

  // The main function that runs for system/group events
  onStart: async ({ api, event, threadsData, userData }) => {
    // Write your event handling logic here
    // Usually, you check for the event type or logMessageType first.
    // Example: Only run if it's a specific system event
    // if (event.logMessageType !== "log:subscribe") return;
    // Example: Prevent running on regular text messages if you only want system events
    // if (event.type === "message") return;
    // You can access group/thread data via threadsData and user data via userData
    // const threadID = event.threadID;
    // Example logic
    // console.log(`An event happened in thread ${event.threadID}`);
  },
};

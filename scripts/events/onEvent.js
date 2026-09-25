/**
 * onEvent.js — Generic event router.
 * Calls onEvent() on every loaded command that defines it,
 */
module.exports = {
  config: {
    name: "onEvent",
    version: "1.5.0",
    author: "SK-SIDDIK-KHAN",
    category: "events",
  },

  onStart: async ({ api, event, threadsData, userData, message }) => {
    // Only fire for group-type events, not plain messages
    if (event.type === "message") return;

    for (const [, cmd] of global.GoatBot.cmds) {
      if (typeof cmd.onEvent === "function") {
        try {
          await cmd.onEvent({
            api,
            event,
            message: message || global.buildMessage(api, event),
            threadsData,
            userData,
          });
        } catch (_) {}
      }
    }
  },
};

const { colors, theme } = require("./colors.js");

module.exports = function logColor(color, message) {
  if (message === undefined) { message = color; color = null; }
  if (typeof color === "function") return console.log(color(message));
  if (typeof color === "string") {
    if (color.startsWith("#")) return console.log(colors.hex(color, String(message)));
    if (theme[color])          return console.log(colors.hex(theme[color], String(message)));
  }
  console.log(String(message));
};
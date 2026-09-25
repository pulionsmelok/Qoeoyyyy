const http = require("http");
const https = require("https");

// ==================== KEEP-ALIVE SELF-PING ====================
const KEEP_ALIVE_INTERVAL = 13 * 60 * 1000;
const port = Number(process.env.PORT) || 3000;

let myUrl = `http://127.0.0.1:${port}`;
if (process.env.RENDER_EXTERNAL_URL) {
  myUrl = process.env.RENDER_EXTERNAL_URL;
} else if (process.env.REPL_ID) {
  myUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
} else if (process.env.PROJECT_DOMAIN) {
  myUrl = `https://${process.env.PROJECT_DOMAIN}.glitch.me`;
} else if (process.env.RAILWAY_PUBLIC_DOMAIN) {
  myUrl = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
}

if (myUrl.includes("localhost") || myUrl.includes("127.0.0.1")) {
  myUrl = myUrl.replace("https://", "http://");
}

const endpoints = ["/", "/health", "/uptime"];
let currentEndpointIndex = 0;
let consecutiveFailures = 0;
let started = false;

function doPing() {
  const endpoint = endpoints[currentEndpointIndex];
  const fullUrl = myUrl.replace(/\/$/, "") + endpoint;
  const isHttps = fullUrl.startsWith("https");
  const lib = isHttps ? https : http;

  const req = lib.get(fullUrl, { timeout: 8000 }, (res) => {
    consecutiveFailures = 0;
    currentEndpointIndex = 0;
    res.resume();
  });

  req.on("error", (err) => {
    consecutiveFailures++;
    if (currentEndpointIndex < endpoints.length - 1) {
      currentEndpointIndex++;
      return;
    }
    console.error(`[KEEP-ALIVE] ❌ Self-ping failed: ${err.message}`);
  });

  req.on("timeout", () => {
    req.destroy();
    console.error("[KEEP-ALIVE] ❌ Self-ping timeout");
  });
}

function startAutoUptime() {
  if (started) return;
  started = true;

  setTimeout(function keepAliveLoop() {
    doPing();
    setTimeout(keepAliveLoop, KEEP_ALIVE_INTERVAL);
  }, 30 * 1000);

  console.log(`[KEEP-ALIVE] 🔄 | Auto Uptime System Started`);
  console.log(`[KEEP-ALIVE] → URL: ${myUrl}`);
  console.log(`[KEEP-ALIVE] → Interval: every 13 minutes`);
}

// Start automatically, while also supporting login.js calling startAutoUptime().
startAutoUptime();

module.exports = { startAutoUptime, startKeepAlive: startAutoUptime, doPing };

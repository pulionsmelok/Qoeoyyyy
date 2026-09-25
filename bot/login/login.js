const fs = require("fs");
const path = require("path");
const readline = require("readline");
const zlib = require("zlib");

const configPath = path.resolve(process.cwd(), "config.json");
const configCommandsPath = path.resolve(process.cwd(), "configCommands.json");
const cacheDir = path.resolve(process.cwd(), "cache");
const restartFile = path.join(cacheDir, "restart.txt");

function askQuestion(promptText) {
    return new Promise(resolve => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question(promptText, answer => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkVersion(localVersion) {
    const remotePackageUrl = "https://raw.githubusercontent.com/update-1/Whatsapp-Goatbot/main/package.json";
    try {
        const axios = require("axios");
        const response = await axios.get(remotePackageUrl, {
            timeout: 10000,
            responseType: "json"
        });
        const remoteVersion = response?.data?.version;
        if (!remoteVersion) {
            return false;
        }

        const parseVersion = ver => String(ver || "0").split(".").map(part => Number.isNaN(Number(part)) ? 0 : Number(part));
        const localVerArray = parseVersion(localVersion);
        const remoteVerArray = parseVersion(remoteVersion);

        const compareVersions = (v1, v2) => {
            const maxLength = Math.max(v1.length, v2.length);
            for (let i = 0; i < maxLength; i++) {
                const num1 = v1[i] || 0;
                const num2 = v2[i] || 0;
                if (num1 > num2) return 1;
                if (num1 < num2) return -1;
            }
            return 0;
        };

        const comparisonResult = compareVersions(remoteVerArray, localVerArray);
        if (comparisonResult > 0) {
            global.log.info("VERSION", `Update available: ${localVersion} →${remoteVersion}`);
            return true;
        } else if (comparisonResult === 0) {
            global.log.info("VERSION", `Version check: ${localVersion} (up to date)`);
            return false;
        } else {
            global.log.info("VERSION", `Version check: ${localVersion} (local is newer)`);
            return true;
        }
    } catch (error) {
        global.log.warn("VERSION", "Could not verify remote version: " + error.message);
        return false;
    }
}

function loadConfig() {
    try {
        global.GoatBot.config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    } catch (error) {
        global.log.err("CONFIG", "Failed to load config.json: " + error.message);
        process.exit(1);
    }
}

function loadConfigCommands() {
    try {
        global.GoatBot.configCommands = JSON.parse(fs.readFileSync(configCommandsPath, "utf8"));
    } catch (error) {
        if (fs.existsSync(configCommandsPath)) {
            global.log.err("CONFIG", "Failed to load configCommands.json: " + error.message);
        }
        global.GoatBot.configCommands = {
            commandUnload: [],
            commandEventUnload: [],
            commandAllowLoad: []
        };
    }
}

function watchConfigs() {
    let configTimer = null, configCommandsTimer = null;
    
    fs.watch(configPath, () => {
        clearTimeout(configTimer);
        configTimer = setTimeout(() => {
            try {
                global.GoatBot.config = JSON.parse(fs.readFileSync(configPath, "utf8"));
                global.log.info("CONFIG", "config.json reloaded ✓");
            } catch (error) {
                global.log.err("CONFIG", "Error reloading config.json: " + error.message);
            }
        }, 500);
    });

    fs.watch(configCommandsPath, () => {
        clearTimeout(configCommandsTimer);
        configCommandsTimer = setTimeout(() => {
            try {
                global.GoatBot.configCommands = JSON.parse(fs.readFileSync(configCommandsPath, "utf8"));
                global.log.info("CONFIG", "configCommands.json reloaded ✓");
            } catch (error) {
                global.log.err("CONFIG", "Error reloading configCommands.json: " + error.message);
            }
        }, 500);
    });
}

function saveLoginConfig(phoneNumber, loginMode) {
    try {
        const configData = JSON.parse(fs.readFileSync(configPath, "utf8"));
        configData.phoneNumber = phoneNumber;
        configData.loginMode = loginMode;
        fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), "utf8");
        global.GoatBot.config.phoneNumber = phoneNumber;
        global.GoatBot.config.loginMode = loginMode;
    } catch (error) {
        global.log.warn("LOGIN", "Could not save to config.json: " + error.message);
    }
}

async function importSession() {
    const config = global.GoatBot.config;
    const sessionId = (process.env.SESSION_ID || config.sessionID || "").trim();
    if (!sessionId) {
        return false;
    }
    const authFolderPath = path.resolve(process.cwd(), config.authFolder || "./auth");
    global.log.info("SESSION", "Session ID detected — attempting import…");
    
    try {
        let sessionBuffer = null;
        const axios = require("axios");

        if (sessionId.startsWith("Wagoat~")) {
            const pasteId = sessionId.substring("Wagoat~".length);
            const response = await axios.get(`https://pastebin.com/raw/${pasteId}`, {
                timeout: 15000,
                responseType: "text"
            });
            const rawData = (response.data || "").trim();
            if (!rawData || rawData.startsWith("Bad")) {
                throw new Error("Invalid session payload");
            }
            const cleanData = rawData.substring("Wagoat~".length);
            sessionBuffer = zlib.gunzipSync(Buffer.from(cleanData, "base64"));
        } else if (sessionId.startsWith("EF-PRIME-MD_")) {
            const pasteId = sessionId.substring("EF-PRIME-MD_".length);
            const response = await axios.get(`https://pastebin.com/raw/${pasteId}`, {
                timeout: 15000,
                responseType: "text"
            });
            const rawData = (response.data || "").trim();
            if (!rawData || rawData.startsWith("Bad")) {
                throw new Error("Invalid session payload");
            }
            JSON.parse(rawData);
            sessionBuffer = Buffer.from(rawData, "utf8");
        } else if (sessionId.startsWith("RomeoBot!")) {
            const cleanData = sessionId.substring("RomeoBot!".length);
            sessionBuffer = zlib.gunzipSync(Buffer.from(cleanData, "base64"));
        } else if (sessionId.startsWith("RomeoBot~")) {
            const encodedUrl = sessionId.substring("RomeoBot~".length);
            const targetUrl = Buffer.from(encodedUrl, "base64").toString("utf8");
            const response = await axios.get(targetUrl, {
                timeout: 15000,
                responseType: "text"
            });
            let rawData = response.data;
            if (typeof rawData === "object") {
                rawData = JSON.stringify(rawData);
            } else {
                rawData = (rawData || "").trim();
            }
            if (!rawData || rawData.startsWith("Bad")) {
                throw new Error("Invalid session payload");
            }
            JSON.parse(rawData);
            sessionBuffer = Buffer.from(rawData, "utf8");
        } else if (sessionId.includes("mega.nz")) {
            try {
                let megaModule;
                try {
                    megaModule = require("megajs");
                } catch {
                    megaModule = null;
                }
                if (megaModule) {
                    const file = megaModule.File.fromURL(sessionId);
                    await file.loadAttributes();
                    sessionBuffer = await file.downloadBuffer();
                }
            } catch (error) {
                global.log.err("SESSION", "Session retrieval failed: " + error.message);
            }
        }

        if (sessionBuffer) {
            if (!fs.existsSync(authFolderPath)) {
                fs.mkdirSync(authFolderPath, { recursive: true });
            }
            fs.writeFileSync(path.join(authFolderPath, "creds.json"), sessionBuffer);
            try {
                const configData = JSON.parse(fs.readFileSync(configPath, "utf8"));
                configData.sessionID = "";
                fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), "utf8");
                global.GoatBot.config.sessionID = "";
            } catch {}
            global.log.success("SESSION", `✅ Session imported to ${authFolderPath}/creds.json`);
            return true;
        } else {
            global.log.warn("SESSION", "⚠️ Could not decode Session ID — skipping import");
        }
    } catch (error) {
        global.log.err("SESSION", "❌ Session import failed: " + error.message);
    }
    return false;
}

function checkAuthExists(authFolder) {
    if (!fs.existsSync(authFolder)) {
        return false;
    }
    return fs.readdirSync(authFolder).some(file => file.includes("creds") || file.endsWith(".json"));
}

function clearAuthFolder(authFolder) {
    try {
        if (fs.existsSync(authFolder)) {
            fs.rmSync(authFolder, { recursive: true, force: true });
            global.log.warn("LOGIN", "Auth cleared — will prompt fresh login.");
        }
    } catch {}
}

async function checkRestartNotification(client) {
    try {
        if (!fs.existsSync(restartFile)) {
            return;
        }
        const restartData = JSON.parse(fs.readFileSync(restartFile, "utf8"));
        fs.unlinkSync(restartFile);
        if (!restartData.threads || !restartData.time) {
            return;
        }
        const timeTaken = ((Date.now() - restartData.time) / 1000).toFixed(2);
        const message = `✅ Bot restarted successfully!\n⏱️ Time taken: ${timeTaken}s`;
        for (const threadId of restartData.threads) {
            try {
                await client.sendMessage({ body: message }, threadId);
            } catch {}
        }
        global.log.success("RESTART", `Notified ${restartData.threads.length} thread(s) — took${timeTaken}s`);
    } catch (error) {
        global.log.warn("RESTART", "restart.txt read error: " + error.message);
    }
}

async function startLoginFlow() {
    const config = global.GoatBot.config;
    const authFolder = path.resolve(process.cwd(), config.authFolder || "./auth");
    const baileysModule = require("./baileys.js");
    const colors = global.utils.colors;
    
    let phoneNumber = (config.phoneNumber || "").trim();
    let loginMode = (config.loginMode || "").trim().toLowerCase();

    if (checkAuthExists(authFolder)) {
        global.log.info("LOGIN", "Auth found — restoring session…");
        return await connectBaileys(baileysModule, {
            authFolder,
            phoneNumber: null,
            usePairingCode: false,
            printQR: false
        });
    }

    if (!phoneNumber) {
        console.log(colors.cyanBright("\n  Enter your WhatsApp number with country code (e.g. 8801XXXXXXXXX):"));
        phoneNumber = await askQuestion("  Number: ");
        if (!phoneNumber || !/^\d{7,}$/.test(phoneNumber)) {
            global.log.err("LOGIN", "Invalid number. Exiting.");
            process.exit(1);
        }
    }

    if (loginMode !== "pair" && loginMode !== "qr") {
        console.log(colors.cyanBright("\n  Select login mode:"));
        console.log("    " + colors.yellowBright("1") + " — Pair Code  (recommended)");
        console.log("    " + colors.yellowBright("2") + " — QR Code");
        const modeChoice = await askQuestion("  Enter 1 or 2: ");
        loginMode = modeChoice === "2" ? "qr" : "pair";
    }

    saveLoginConfig(phoneNumber, loginMode);
    const usePairingCode = loginMode === "pair";
    global.log.info("LOGIN", `Mode: ${usePairingCode ? "Pair Code" : "QR Code"} | Number: ${phoneNumber}`);
    
    return await connectBaileys(baileysModule, {
        authFolder,
        phoneNumber,
        usePairingCode,
        printQR: !usePairingCode
    });
}

function connectBaileys(baileysFn, options) {
    return new Promise((resolve, reject) => {
        global.utils.spinner.start("Connecting to WhatsApp…", { preset: "dots" });
        let isConnected = false;

        baileysFn({
            authFolder: options.authFolder,
            phoneNumber: options.phoneNumber,
            usePairingCode: options.usePairingCode,
            printQR: options.printQR,
            skipUpdateCheck: true,
            globalOptions: {
                selfListen: global.GoatBot.config.listen?.selfListen ?? false,
                listenEvents: global.GoatBot.config.listen?.listenEvents ?? true,
                autoMarkDelivery: global.GoatBot.config.listen?.autoMarkDelivery ?? false,
                autoReconnect: global.GoatBot.config.listen?.autoReconnect ?? true,
                enableTypingIndicator: false
            }
        }, (error, clientData) => {
            if (error) {
                if (isConnected) return;
                isConnected = true;
                global.utils.spinner.fail("Connection failed: " + (error.message || String(error)));
                if (/logout|logged.?out/i.test(String(error.message || error))) {
                    clearAuthFolder(options.authFolder);
                    global.log.info("LOGIN", "Restarting login flow…");
                    startLoginFlow().then(resolve).catch(reject);
                    return;
                }
                reject(error);
                return;
            }
            if (isConnected) return;
            isConnected = true;
            global.utils.spinner.succeed("Connected to WhatsApp ✓");
            
            const currentUserId = clientData.getCurrentUserID ? clientData.getCurrentUserID() : (clientData.ctx?.selfID || "");
            const formattedUserId = currentUserId.split(":")[0].split("@")[0] || currentUserId;
            global.log.success("ACCOUNT", "Connected as: " + formattedUserId);
            resolve(clientData);
        });
    });
}

module.exports = async function initBot() {
    const packageJson = require("../../package.json");
    const version = packageJson.version || "1.0.0";
    const applyGradient = (text1, text2) => global.gradient ? global.gradient(text1, text2) : text1;
    const isUpdateAvailable = await checkVersion(version);
    
    const asciiArtList = [
        [
            "__        ___    ____             _     ____   ___ _____ ",
            "\\ \\      / / \\  / ___| ___   __ _| |_  | __ ) / _ \\_   _|",
            " \\ \\ /\\ / / _ \\| |  _ / _ \\ / _` | __| |  _ \\| | | || |  ",
            "  \\ V  V / ___ \\ |_| | (_) | (_| | |_  | |_) | |_| || |  ",
            "   \\_/\\_/_/   \\_\\____|\\___/ \\__,_|\\__| |____/ \\___/ |_|  "
        ],
        [
            "█░█░█ ▄▀█ █▀▀ █▀█ ▄▀█ ▀█▀   █▄▄ █▀█ ▀█▀",
            "▀▄▀▄▀ █▀█ █▄█ █▄█ █▀█ ░█░   █▄█ █▄█ ░█░"
        ],
        ["W A G o a t - B o t @" + version],
        ["WAGoat-Bot"]
    ];

    const stdoutCols = process.stdout.columns || 80;
    const selectedArt = stdoutCols > 58 ? asciiArtList[0] : stdoutCols > 36 ? asciiArtList[1] : stdoutCols > 26 ? asciiArtList[2] : asciiArtList[3];
    
    let lineLength = process.stdout.columns || 80;
    if (lineLength > 50) lineLength = 50;

    function createDividerLine(text, fullWidth = false) {
        if (!text) {
            return Array(fullWidth ? (process.stdout.columns || 80) : lineLength).fill("─").join("");
        } else {
            text = ` ${text.trim()} `;
            const textLen = text.length;
            const remainingSpace = fullWidth ? (process.stdout.columns || 80) - textLen : lineLength - textLen;
            let paddingSize = Math.floor(remainingSpace / 2);
            if (paddingSize < 0 || isNaN(paddingSize)) paddingSize = 0;
            const padding = Array(paddingSize).fill("─").join("");
            return padding + text + padding;
        }
    }

    function printCentered(text, customLength) {
        const cols = process.stdout.columns || 80;
        const leftPadding = Math.max(0, Math.floor((cols - (customLength || text.length)) / 2));
        const rightPadding = Math.max(0, cols - leftPadding - (customLength || text.length));
        console.log(" ".repeat(leftPadding) + text + " ".repeat(rightPadding));
    }

    console.log(applyGradient(createDividerLine(null, true), ["#f5af19", "#f12711"]));
    console.log();
    for (const artLine of selectedArt) {
        const coloredArt = applyGradient(artLine, ["#FA8BFF", "#2BD2FF", "#2BFF88"]);
        printCentered(coloredArt, artLine.length);
    }

    let subtitle = `WAGoat-Bot@${version} - A simple Whatsapp Chat Bot use personal account`;
    const subtitleLines = [];
    if (subtitle.length > stdoutCols) {
        while (subtitle.length > stdoutCols) {
            let breakIndex = subtitle.slice(0, stdoutCols).lastIndexOf(" ");
            breakIndex = breakIndex == -1 ? stdoutCols : breakIndex;
            subtitleLines.push(subtitle.slice(0, breakIndex).trim());
            subtitle = subtitle.slice(breakIndex).trim();
        }
        subtitle ? subtitleLines.push(subtitle) : "";
    } else {
        subtitleLines.push(subtitle);
    }

    const createdByText = "Created by ";
    const sourceCodeText = "Source code: https://github.com/efkidgamerdev";
    const fakeWarningText = "ALL VERSIONS NOT RELEASED HERE ARE FAKE";

    for (const line of subtitleLines) {
        printCentered(applyGradient(line, ["#9F98E8", "#AFF6CF"]), line.length);
    }
    printCentered(applyGradient(createdByText, ["#9F98E8", "#AFF6CF"]), createdByText.length);
    printCentered(applyGradient(sourceCodeText, ["#9F98E8", "#AFF6CF"]), sourceCodeText.length);
    if (isUpdateAvailable) {
        printCentered(applyGradient(fakeWarningText, ["#f5af19", "#f12711"]), fakeWarningText.length);
    }

    console.log();
    const startLoggingText = "START LOGGING IN";
    console.log(applyGradient(createDividerLine(startLoggingText, true), ["#f5af19", "#f12711"]));
    console.log();

    global.log.divider("CONFIG");
    loadConfig();
    loadConfigCommands();
    watchConfigs();
    
    global.log.success("CONFIG", "Config loaded — prefix: " + (global.GoatBot.config.prefix || "!") + " | bot: " + (global.GoatBot.config.botName || "EF-Prime Bot"));
    await sleep(1000);

    global.log.divider("SESSION / CONNECT");
    if ((global.GoatBot.config.database?.type || "").toLowerCase() === "mongodb") {
        const { connectMongoDB } = require("../../database/connectDB/connectMongoDB.js");
        await connectMongoDB();
    }
    await importSession();
    const client = await startLoginFlow();
    
    global.GoatBot.api = client;
    global.GoatBot.botID = client.getCurrentUserID ? client.getCurrentUserID() : (client.ctx?.selfID || "");
    
    await checkRestartNotification(client);
    await sleep(1000);

    const loadData = require("./loadData.js");
    await loadData(client);
    await sleep(1000);

    const loadScripts = require("./loadScripts.js");
    await loadScripts(client);
    await sleep(1000);

    global.log.divider("EXPRESS + SOCKET STARTUP");
    const { startExpress, getApp, getIO } = require("./socketIo.js");
    await startExpress();
    
    const { startDashboard } = require("../../dashboard/index.js");
    await startDashboard(getApp(), getIO());
    
    require("../autoUptime.js").startAutoUptime();
    await sleep(1000);

    const adminList = global.GoatBot.config.adminBot || [];
    const { colors: colorLogger } = require("../../logger/colors.js");
    
    global.log.divider("ADMINS");
    if (adminList.length === 0) {
        console.log("  " + colorLogger.hex("#7f8fa6")("─── not configured ───"));
    } else {
        for (let i = 0; i < adminList.length; i++) {
            const adminId = adminList[i];
            const cleanAdminId = adminId.split(":")[0].split("@")[0];
            let adminName = "";
            try {
                const sock = client.sock;
                if (sock && sock.contacts) {
                    const contact = sock.contacts[cleanAdminId + "@s.whatsapp.net"] || sock.contacts[cleanAdminId + "@lid"] || sock.contacts[adminId + "@s.whatsapp.net"];
                    if (contact) {
                        adminName = contact.name || contact.notify || contact.verifiedName || "";
                    }
                }
            } catch {}

            if (!adminName) {
                try {
                    const userData = await global.GoatBot.DB.userData(adminId);
                    if (userData && userData.name && userData.name !== "Unknown") {
                        adminName = userData.name;
                    }
                } catch {}
            }
            await sleep(500);
            
            const indexDisplay = colorLogger.hex("#a29bfe")(`${i + 1}.`);
            const nameDisplay = adminName ? colorLogger.hex("#22d39a")(adminName) + " " + colorLogger.gray("(" + cleanAdminId + ")") : colorLogger.hex("#22d39a")(cleanAdminId);
            console.log("  " + indexDisplay + " " + nameDisplay);
        }
    }

    global.log.divider();
    await sleep(1500);

    const uptimeSeconds = ((Date.now() - global.GoatBot.startTime) / 1000).toFixed(2);
    const cmdCount = global.GoatBot.cmds.size;
    const eventCount = global.GoatBot.events.size;
    const prefix = global.GoatBot.config.prefix || "!";
    const botName = global.GoatBot.config.botName || "Baileys Bot";
    
    global.log.success("READY", `${botName} ready in ${uptimeSeconds}s  |  ${cmdCount} cmds  |  ${eventCount} events  |  prefix: ${prefix}`);

    const intervalTimer = setInterval(() => {}, 30000);
    intervalTimer.unref && intervalTimer.unref();
    if (intervalTimer.ref) {
        intervalTimer.ref();
    }

    const handlerEvent = require("../handler/handlerEvent.js");
    client.listen((err, eventData) => {
        if (err && err.type === "stop_listen") {
            global.log.warn("CONNECTION", "Connection closed — restarting process for a clean reconnect...");
            process.exit(2);
            return;
        }
        if (err && !(err instanceof Error)) {
            handlerEvent(client, err).catch(() => {});
            return;
        }
        if (err) {
            global.log.err("LISTEN", err.message || String(err));
            return;
        }
        handlerEvent(client, eventData).catch(handlerError => {
            global.log.err("HANDLER", handlerError.message || String(handlerError));
        });
    });
};

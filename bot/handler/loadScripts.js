const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);
const log = require("../../logger/log.js");

let spinner = { start() {}, update() {}, succeed() {}, fail() {}, stop() {} };
let colors = { yellow: (s) => s, cyan: (s) => s, green: (s) => s, red: (s) => s };

try { 
    spinner = require("../../logger/spinner.js"); 
} catch (_) {}

try { 
    colors = require("../../logger/colors.js").colors; 
} catch (_) {}

const REQUIRE_REGEX = /require\s*\(\s*["']([^"']+)["']\s*\)/g;
const installedPackages = [];

const CMDS_DIR = path.resolve(__dirname, "../../scripts/cmds");
const EVENTS_DIR = path.resolve(__dirname, "../../scripts/events");

async function autoInstallPackages(filePath) {
    const content = fs.readFileSync(filePath, "utf8");
    let matches = content.match(REQUIRE_REGEX);
    if (!matches) return;

    matches = matches
        .map(m => {
            const match = m.match(/require\s*\(\s*["']([^"']+)["']\s*\)/);
            return match ? match[1] : null;
        })
        .filter(pkg =>
            pkg &&
            !pkg.startsWith("/") &&
            !pkg.startsWith("./") &&
            !pkg.startsWith("../") &&
            !pkg.startsWith(__dirname) &&
            !["axios", "canvas", "fs", "path", "child_process", "util"].includes(pkg)
        );

    for (let packageName of matches) {
        if (packageName.startsWith("@")) {
            packageName = packageName.split("/").slice(0, 2).join("/");
        } else {
            packageName = packageName.split("/")[0];
        }

        const builtIn = ["http", "https", "crypto", "os", "events", "stream"];
        if (builtIn.includes(packageName)) continue;

        if (!installedPackages.includes(packageName)) {
            installedPackages.push(packageName);
            const modPath = path.join(process.cwd(), "node_modules", packageName);
            
            if (!fs.existsSync(modPath)) {
                log.info("PACKAGE", `Installing package ${colors.yellow(packageName)} for ${colors.yellow(path.basename(filePath))}...`);
                try {
                    await execAsync(`npm install ${packageName} --save`);
                    log.success("PACKAGE", `Installed package ${packageName} successfully`);
                } catch (err) {
                    log.err("PACKAGE", `Failed to install package ${packageName}`);
                    throw new Error(`Can't install package ${packageName}`);
                }
            }
        }
    }
}

function safeRequire(filePath) {
    try {
        delete require.cache[require.resolve(filePath)];
        return require(filePath);
    } catch (err) {
        return { __error: err };
    }
}

async function loadCommands(api) {
    const unloadList = (global.GoatBot.configCommands?.commandUnload || []).map(n => n.toLowerCase());
    const files = fs.readdirSync(CMDS_DIR).filter(f => f.endsWith(".js"));

    let loaded = 0;
    let skipped = 0;
    let failed = 0;

    spinner.start(`Loading commands (0/${files.length})…`);

    for (const file of files) {
        const lower = file.toLowerCase();
        if (unloadList.includes(lower) || unloadList.includes(lower.replace(".js", ""))) {
            spinner.update(`Skipping command: ${file}`);
            skipped++;
            continue;
        }

        const fullPath = path.join(CMDS_DIR, file);
        const mod = safeRequire(fullPath);

        if (mod && mod.__error) {
            spinner.stop();
            log.warn("CMD LOAD", `⚠ ${file} — ${mod.__error.message}`);
            if (mod.__error.stack) {
                const short = mod.__error.stack.split("\n").slice(0, 3).join(" | ");
                log.warn("CMD LOAD", `   at: ${short}`);
            }
            spinner.start(`Loading commands (${loaded}/${files.length})…`);
            failed++;
            continue;
        }

        if (!mod || !mod.config || !mod.config.name) {
            log.warn("CMD LOAD", `${file} — missing config.name, skipping.`);
            failed++;
            continue;
        }

        if (typeof mod.onLoad === "function") {
            try {
                const db = global.GoatBot.DB || {};
                await mod.onLoad({
                    api,
                    threadsData: db.threadsData || db.threads,
                    userData: db.userData || db.users || db.usersData
                });
            } catch (err) {
                log.warn("CMD LOAD", `${file} onLoad error: ${err.message}`);
            }
        }

        global.GoatBot.cmds.set(mod.config.name.toLowerCase(), mod);
        loaded++;
        spinner.update(`Loading commands (${loaded}/${files.length}) — ${mod.config.name}`);
    }

    let extra = "";
    if (skipped > 0) extra += `  |  Skipped: ${skipped}`;
    if (failed > 0) extra += `  |  Failed: ${failed}`;

    spinner.succeed(`Commands loaded: ${loaded}${extra}`);
    log.success("SCRIPTS", `Commands: ${loaded} loaded` + extra);
}

async function loadEvents(api) {
    const unloadList = (global.GoatBot.configCommands?.commandEventUnload || []).map(n => n.toLowerCase());
    const files = fs.readdirSync(EVENTS_DIR).filter(f => f.endsWith(".js"));

    let loaded = 0;
    let skipped = 0;
    let failed = 0;

    spinner.start(`Loading events (0/${files.length})…`);

    for (const file of files) {
        const lower = file.toLowerCase();
        if (unloadList.includes(lower) || unloadList.includes(lower.replace(".js", ""))) {
            spinner.update(`Skipping event: ${file}`);
            skipped++;
            continue;
        }

        const fullPath = path.join(EVENTS_DIR, file);
        const mod = safeRequire(fullPath);

        if (mod && mod.__error) {
            spinner.stop();
            log.warn("EVT LOAD", `⚠ ${file} — ${mod.__error.message}`);
            spinner.start(`Loading events (${loaded}/${files.length})…`);
            failed++;
            continue;
        }

        if (!mod || !mod.config || !mod.config.name) {
            log.warn("EVT LOAD", `${file} — missing config.name, skipping.`);
            failed++;
            continue;
        }

        if (typeof mod.onLoad === "function") {
            try {
                const db = global.GoatBot.DB || {};
                await mod.onLoad({
                    api,
                    threadsData: db.threadsData || db.threads,
                    userData: db.userData || db.users || db.usersData
                });
            } catch (err) {
                log.warn("EVT LOAD", `${file} onLoad error: ${err.message}`);
            }
        }

        global.GoatBot.events.set(mod.config.name.toLowerCase(), mod);
        loaded++;
        spinner.update(`Loading events (${loaded}/${files.length}) — ${mod.config.name}`);
    }

    let extra = "";
    if (skipped > 0) extra += `  |  Skipped: ${skipped}`;
    if (failed > 0) extra += `  |  Failed: ${failed}`;

    spinner.succeed(`Events loaded: ${loaded}${extra}`);
    log.success("SCRIPTS", `Events: ${loaded} loaded` + extra);
}

async function loadCmd(name, api) {
    const fileName = name.endsWith(".js") ? name : name + ".js";
    const fullPath = path.join(CMDS_DIR, fileName);

    if (!fs.existsSync(fullPath)) {
        throw new Error("Command file not found: " + fileName);
    }

    await autoInstallPackages(fullPath);
    const mod = safeRequire(fullPath);

    if (mod && mod.__error) throw mod.__error;
    if (!mod || !mod.config || !mod.config.name) {
        throw new Error("Invalid command structure in: " + fileName);
    }

    if (typeof mod.onLoad === "function") {
        const db = global.GoatBot.DB || {};
        await mod.onLoad({
            api,
            threadsData: db.threadsData || db.threads,
            userData: db.userData || db.users || db.usersData
        }).catch(() => {});
    }

    global.GoatBot.cmds.set(mod.config.name.toLowerCase(), mod);
    return mod;
}

function unloadCmd(name) {
    const key = name.toLowerCase().replace(".js", "");
    if (!global.GoatBot.cmds.has(key)) {
        throw new Error("Command not loaded: " + key);
    }
    global.GoatBot.cmds.delete(key);
}

async function reloadCmd(name, api) {
    unloadCmd(name);
    return loadCmd(name, api);
}

async function loadEvent(name, api) {
    const fileName = name.endsWith(".js") ? name : name + ".js";
    const fullPath = path.join(EVENTS_DIR, fileName);

    if (!fs.existsSync(fullPath)) {
        throw new Error("Event file not found: " + fileName);
    }

    await autoInstallPackages(fullPath);
    const mod = safeRequire(fullPath);

    if (mod && mod.__error) throw mod.__error;
    if (!mod || !mod.config || !mod.config.name) {
        throw new Error("Invalid event structure in: " + fileName);
    }

    if (typeof mod.onLoad === "function") {
        const db = global.GoatBot.DB || {};
        await mod.onLoad({
            api,
            threadsData: db.threadsData || db.threads,
            userData: db.userData || db.users || db.usersData
        }).catch(() => {});
    }

    global.GoatBot.events.set(mod.config.name.toLowerCase(), mod);
    return mod;
}

function unloadEvent(name) {
    const key = name.toLowerCase().replace(".js", "");
    if (!global.GoatBot.events.has(key)) {
        throw new Error("Event not loaded: " + key);
    }
    global.GoatBot.events.delete(key);
}

async function reloadEvent(name, api) {
    unloadEvent(name);
    return loadEvent(name, api);
}

async function loadScripts(api) {
    if (!global.GoatBot.cmds) global.GoatBot.cmds = new Map();
    if (!global.GoatBot.events) global.GoatBot.events = new Map();

    await loadCommands(api);
    await loadEvents(api);
}

module.exports = loadScripts;
module.exports.loadCmd = loadCmd;
module.exports.unloadCmd = unloadCmd;
module.exports.reloadCmd = reloadCmd;
module.exports.loadEvent = loadEvent;
module.exports.unloadEvent = unloadEvent;
module.exports.reloadEvent = reloadEvent;

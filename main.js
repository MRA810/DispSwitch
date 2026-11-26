const { app, BrowserWindow, ipcMain } = require("electron");
const { exec } = require("child_process");
const path = require("path");

let win;
let pollInterval = null;
let ddcBus = "4"; // Auto-detected on Linux startup

const INPUT_CODES = {
  dp: "0x0f",
  hdmi: "0x12",
};

// --- Path helpers ---

function getScriptPath(scriptName) {
  return app.isPackaged
    ? path.join(process.resourcesPath, "scripts", scriptName)
    : path.join(__dirname, "scripts", scriptName);
}

// --- DDC/CI commands (platform-aware) ---

function ddcGetCommand() {
  if (process.platform === "win32") {
    const ps = getScriptPath("ddc_helper.ps1");
    return `powershell -NoProfile -ExecutionPolicy Bypass -File "${ps}" get`;
  }
  return `ddcutil --bus ${ddcBus} getvcp 60`;
}

function ddcSetCommand(vcpValue) {
  if (process.platform === "win32") {
    const ps = getScriptPath("ddc_helper.ps1");
    return `powershell -NoProfile -ExecutionPolicy Bypass -File "${ps}" set ${vcpValue}`;
  }
  return `ddcutil --bus ${ddcBus} setvcp 60 ${vcpValue}`;
}

function parseInput(stdout) {
  if (process.platform === "win32") {
    // PowerShell script outputs the hex value like "0x0f"
    const val = stdout.trim().toLowerCase();
    if (val === "0x0f") return "dp";
    if (val === "0x11" || val === "0x12") return "hdmi";
    return null;
  }
  // Linux ddcutil: "VCP code 0x60 (Input Source): DisplayPort-1 (sl=0x0f)"
  const match = stdout.match(/sl=0x([0-9a-f]{2})/i);
  if (match) {
    const code = parseInt(match[1], 16);
    if (code === 0x0f) return "dp";
    if (code === 0x11 || code === 0x12) return "hdmi";
  }
  return null;
}

// --- Auto-detect DDC bus on Linux ---

function detectDdcBus() {
  return new Promise((resolve) => {
    exec("ddcutil detect", (error, stdout) => {
      if (error) {
        resolve("4");
        return;
      }
      // Find the first valid (non-"Invalid") display's bus
      const blocks = stdout.split(/\n(?=Display \d|Invalid display)/);
      for (const block of blocks) {
        if (/^Display \d/.test(block)) {
          const m = block.match(/I2C bus:\s+\/dev\/i2c-(\d+)/);
          if (m) {
            resolve(m[1]);
            return;
          }
        }
      }
      resolve("4");
    });
  });
}

// --- Window ---

function createWindow() {
  win = new BrowserWindow({
    width: 400,
    height: 600,
    resizable: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile("index.html");
}

// --- Input monitoring ---

function checkCurrentInput() {
  exec(ddcGetCommand(), (error, stdout) => {
    if (error) return;
    const input = parseInput(stdout);
    if (input && win && !win.isDestroyed()) {
      win.webContents.send("active-input-detected", input);
    }
  });
}

function startPolling() {
  stopPolling();
  pollInterval = setInterval(checkCurrentInput, 5000);
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

// --- IPC handlers ---

ipcMain.on("switch-input", (_event, target) => {
  const vcpValue = INPUT_CODES[target];
  if (!vcpValue) return;

  exec(ddcSetCommand(vcpValue), (error) => {
    if (error) console.error(`DDC/CI set error: ${error.message}`);
    setTimeout(checkCurrentInput, 2500);
  });
});

ipcMain.on("get-active-input", () => {
  checkCurrentInput();
});

// --- App lifecycle ---

app.whenReady().then(async () => {
  if (!app.isPackaged) {
    try {
      require("electron-reload")(__dirname);
    } catch (e) {
      console.log("Development reload disabled");
    }
  }

  // Auto-detect DDC bus on Linux
  if (process.platform === "linux") {
    ddcBus = await detectDdcBus();
    console.log(`DDC/CI using bus ${ddcBus}`);
  }

  createWindow();
  startPolling();
});

app.on("window-all-closed", () => {
  stopPolling();
  if (process.platform !== "darwin") app.quit();
});

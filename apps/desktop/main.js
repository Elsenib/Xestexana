const { app, BrowserWindow, dialog, globalShortcut } = require("electron");
const { spawn, spawnSync } = require("child_process");
const path = require("path");
const http = require("http");

let mainWindow = null;
let apiProcess = null;
let webProcess = null;

const ROOT = path.join(__dirname, "..", "..");

function startProcess(command, args, cwd) {
  const isWin = process.platform === "win32";
  const shell = isWin ? true : false;
  const cmd = isWin ? command + ".cmd" : command;
  return spawn(cmd, args, { cwd, shell, stdio: "inherit" });
}

function waitForServer(url, timeout = 60000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      http
        .get(url, (res) => {
          if (res.statusCode < 500) resolve();
          else setTimeout(check, 1000);
        })
        .on("error", () => {
          if (Date.now() - start > timeout) {
            reject(new Error("Server did not start in time: " + url));
          } else {
            setTimeout(check, 1000);
          }
        });
    };
    check();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Hospital Platform",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, "loading.html"));
  mainWindow.show();

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Register global shortcut for refresh
  globalShortcut.register('F5', () => {
    if (mainWindow) {
      mainWindow.reload();
    }
  });

  globalShortcut.register('CommandOrControl+R', () => {
    if (mainWindow) {
      mainWindow.reload();
    }
  });
}

async function startServers() {
  // Start API server
  apiProcess = startProcess("npm", ["run", "dev:api"], ROOT);

  // Start Web server in development mode for hot reload
  webProcess = startProcess("npm", ["run", "dev", "--workspace", "web", "--", "-p", "3100"], ROOT);

  try {
    // Wait for both servers
    await Promise.all([
      waitForServer("http://localhost:4000/api/health", 90000),
      waitForServer("http://localhost:3100", 90000),
    ]);
    if (mainWindow) {
      mainWindow.loadURL("http://localhost:3100");
    }
  } catch (err) {
    dialog.showErrorBox(
      "Sunucu Hatasi",
      "Uygulama sunuculari baslatılamadi.\n\nLutfen Node.js kurulu oldugundan emin olun.\n\n" + err.message
    );
    app.quit();
  }
}

app.whenReady().then(() => {
  createWindow();
  startServers();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (apiProcess) apiProcess.kill();
  if (webProcess) webProcess.kill();
  app.quit();
});

app.on("before-quit", () => {
  if (apiProcess) apiProcess.kill();
  if (webProcess) webProcess.kill();
  globalShortcut.unregisterAll();
});

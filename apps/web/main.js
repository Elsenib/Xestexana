
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
// --- AUTO UPDATE LOGIC ---
if (app.isPackaged) {
  autoUpdater.autoDownload = true;
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-available', () => {
    // İstəsən, istifadəçiyə bildiriş göndərə bilərsən
  });
  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Yeniləmə mövcuddur',
      message: 'Yeni versiya yükləndi. Proqramı yeniləmək üçün OK düyməsinə basın.',
      buttons: ['OK']
    }).then(() => {
      autoUpdater.quitAndInstall();
    });
  });
}
const path = require('path');
let serverProcess;



function waitForPortFileAndOpenWindow(retries = 20, delay = 150) {
  const fs = require('fs');
  const portFile = app.isPackaged
    ? path.join(app.getPath('userData'), 'port.txt')
    : path.join(__dirname, 'port.txt');
  if (fs.existsSync(portFile)) {
    let port = 3000;
    try {
      port = Number(fs.readFileSync(portFile, 'utf8'));
    } catch (e) {}
    const win = new BrowserWindow({
      width: 1200,
      height: 800,
      icon: path.join(__dirname, 'build', 'icon.ico'),
      webPreferences: {
        nodeIntegration: false
      }
    });

    
    win.loadURL(`http://localhost:${port}`);
  } else if (retries > 0) {
    setTimeout(() => waitForPortFileAndOpenWindow(retries - 1, delay), delay);
  } else {
    // Əgər port.txt tapılmadısa, default porta aç
    const win = new BrowserWindow({
      width: 1200,
      height: 800,
      icon: path.join(__dirname, 'build', 'icon.ico'),
      webPreferences: {
        nodeIntegration: false
      }
    });
    win.loadURL('http://localhost:3000');
  }
}

function createWindow () {
  if (app.isPackaged) {
    waitForPortFileAndOpenWindow();
  } else {
    const win = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false
      }
    });
    win.loadURL('http://localhost:3000');
  }
}


app.whenReady().then(() => {
  const isPackaged = app.isPackaged;
  if (isPackaged) {
    // Distributivdə serveri birbaşa require et
    require(path.join(__dirname, 'server.js'));
    setTimeout(createWindow, 1000);
  } else {
    // Lokal inkişafda child process kimi başlat
    const { spawn } = require('child_process');
    const serverPath = path.join(__dirname, 'server.js');
    serverProcess = spawn(process.execPath, [serverPath], {
      cwd: __dirname,
      stdio: 'ignore',
      detached: true
    });
    setTimeout(createWindow, 1000);
  }
});

app.on('window-all-closed', () => {
  if (!app.isPackaged && serverProcess) {
    try {
      process.kill(-serverProcess.pid);
    } catch (e) {}
  }
  if (process.platform !== 'darwin') app.quit();
});

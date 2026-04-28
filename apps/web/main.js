const { app, BrowserWindow } = require('electron');

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false
    }
  });

  // Burada live backend üçün frontend URL-ni yaz
  win.loadURL('https://xestexana.live'); // Əgər live serverdən istifadə etmək istəyirsənsə
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

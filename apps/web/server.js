// apps/web/server.js
// Statik distributiv üçün local HTTP server (Express)
const express = require('express');
const path = require('path');
const fs = require('fs');
// Electron distributivdə port.txt üçün userData path
function getPortFilePath() {
  // Electron varsa və distributivdirsə, onun userData qovluğunu istifadə et
  try {
    const electron = require('electron');
    if (electron.app && electron.app.isPackaged) {
      return require('path').join(electron.app.getPath('userData'), 'port.txt');
    }
  } catch (e) {}
  // Əks halda, cari qovluq
  return require('path').join(__dirname, 'port.txt');
}

const app = express();
const OUT_DIR = path.join(__dirname, 'out');

app.use(express.static(OUT_DIR));

app.get('*', (req, res) => {
  res.sendFile(path.join(OUT_DIR, 'index.html'));
});

function getPort(cb) {
  const net = require('net');
  const server = net.createServer();
  server.listen(0, () => {
    const port = server.address().port;
    server.close(() => cb(port));
  });
}

const PORT = process.env.PORT || 3000;
if (process.env.PORT) {
  app.listen(PORT, () => {
    console.log(`Local static server running: http://localhost:${PORT}`);
    fs.writeFileSync(getPortFilePath(), String(PORT));
  });
} else {
  getPort((freePort) => {
    app.listen(freePort, () => {
      console.log(`Local static server running: http://localhost:${freePort}`);
      fs.writeFileSync(getPortFilePath(), String(freePort));
    });
  });
}

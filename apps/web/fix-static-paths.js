// Bu script distributiv üçün out/index.html və _next yollarını düzəldir
// Istifadə: node fix-static-paths.js

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'out');
const INDEX_HTML = path.join(OUT_DIR, 'index.html');

function fixPaths(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  // Bütün kökdən başlayan yolları nisbətə çevir
  html = html.replace(/\/(\_next\/[^"]+)/g, './$1');
  html = html.replace(/\/(public\/[^"]+)/g, './$1');
  fs.writeFileSync(filePath, html, 'utf8');
  console.log('Yollar düzəldildi:', filePath);
}

if (fs.existsSync(INDEX_HTML)) {
  fixPaths(INDEX_HTML);
} else {
  console.error('index.html tapılmadı:', INDEX_HTML);
  process.exit(1);
}

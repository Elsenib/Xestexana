// utils/loadFont.js
export async function addDejaVuFont(doc) {
  const response = await fetch('/fonts/DejaVuSans.ttf');
  const buffer = await response.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  doc.addFileToVFS('DejaVuSans.ttf', base64);
  doc.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal');
}
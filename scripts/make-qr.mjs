// Makes public/qr.svg: a QR code to the app, shown in the "best on a phone"
// notice on computers. Run again only if the address changes:
//   node scripts/make-qr.mjs
import { writeFileSync } from 'node:fs';
import QRCode from 'qrcode';

const APP_URL = 'https://dragon-brush.web.app';
const svg = await QRCode.toString(APP_URL, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#3a2a4a', light: '#ffffff' } });
writeFileSync(new URL('../public/qr.svg', import.meta.url), svg);
console.log(`public/qr.svg -> ${APP_URL}`);

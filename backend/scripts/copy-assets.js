// Copies non-TypeScript runtime assets (fonts for PDF generation) into dist/.
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'src', 'assets');
const dest = path.join(__dirname, '..', 'dist', 'assets');
fs.cpSync(src, dest, { recursive: true });
console.log(`assets copied → ${path.relative(process.cwd(), dest)}`);

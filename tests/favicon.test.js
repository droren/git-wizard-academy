const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const faviconPath = path.join(root, 'favicon.ico');

assert.match(html, /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']favicon\.ico["']/i, 'index must declare favicon.ico');
assert(fs.existsSync(faviconPath), 'favicon.ico must exist at the site root');
const bytes = fs.readFileSync(faviconPath);
assert(bytes.length > 22, 'favicon.ico must contain icon data');
assert.strictEqual(bytes.readUInt16LE(0), 0, 'favicon.ico must use the ICO header');
assert.strictEqual(bytes.readUInt16LE(2), 1, 'favicon.ico must be an icon resource');

console.log('favicon: all tests passed');

import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');
const required = ['index.html', 'styles.css', 'app.js', 'core.js', 'demo.js', 'config.js', 'assets/maria.jpg', 'assets/manrope-cyrillic.woff2', 'assets/manrope-latin.woff2'];
for (const file of required) await stat(path.join(root, file));
async function files(dir) { return (await Promise.all((await readdir(dir, { withFileTypes: true })).map(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : path.join(dir, entry.name)))).flat(); }
let js = 0, css = 0, total = 0;
for (const file of await files(root)) { const bytes = await readFile(file); total += bytes.length; if (file.endsWith('.js')) js += gzipSync(bytes).length; if (file.endsWith('.css')) css += gzipSync(bytes).length; }
console.log(`JavaScript gzip: ${js} / 30720 байт\nCSS gzip: ${css} / 25600 байт\nВсе публичные ресурсы: ${total} байт`);
if (js > 30720 || css > 25600) process.exitCode = 1;

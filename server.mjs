import http from 'node:http';
import path from 'node:path';
import { realpath, readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };
const inside = (root, candidate) => { const rel = path.relative(root, candidate); return rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel); };

export function createServer({ root = path.join(directory, 'public') } = {}) {
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    const send = (status, message) => { res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(req.method === 'HEAD' ? undefined : message); };
    if (!['GET', 'HEAD'].includes(req.method)) { res.setHeader('Allow', 'GET, HEAD'); return send(405, 'Метод не поддерживается'); }
    let requested;
    try { requested = decodeURIComponent((req.url || '/').split('?')[0]); } catch { return send(400, 'Некорректный адрес'); }
    if (!requested.startsWith('/') || requested.includes('\\') || requested.includes('\0') || requested.split('/').some(segment => segment.startsWith('.'))) return send(403, 'Доступ закрыт');
    try {
      const resolvedRoot = await realpath(root);
      const candidate = path.resolve(resolvedRoot, `.${requested === '/' ? '/index.html' : requested}`);
      if (!inside(resolvedRoot, candidate)) return send(403, 'Доступ закрыт');
      const resolvedFile = await realpath(candidate);
      if (!inside(resolvedRoot, resolvedFile)) return send(403, 'Доступ закрыт');
      if (!(await stat(resolvedFile)).isFile()) return send(404, 'Страница не найдена');
      const bytes = await readFile(resolvedFile);
      res.writeHead(200, { 'Content-Type': types[path.extname(resolvedFile)] || 'application/octet-stream', 'Content-Length': bytes.length, 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : bytes);
    } catch (error) { send(error.code === 'ENOENT' || error.code === 'ENOTDIR' ? 404 : 500, error.code === 'ENOENT' || error.code === 'ENOTDIR' ? 'Страница не найдена' : 'Не удалось открыть файл'); }
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4173);
  const server = createServer();
  server.on('error', error => { console.error(`Не удалось запустить сайт: ${error.message}`); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Мастерская Марии: http://127.0.0.1:${port}`));
}

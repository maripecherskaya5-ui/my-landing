import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import http from 'node:http';

// These tests fail if private paths are served or HTTP method/status handling regresses.
const { createServer } = await import('../server.mjs');
async function fixture(t) {
  const temp = await mkdtemp(path.join(tmpdir(), 'maria-server-'));
  const root = path.join(temp, 'public');
  await mkdir(root);
  await writeFile(path.join(root, 'index.html'), '<h1>Мария</h1>');
  await writeFile(path.join(temp, 'research.md'), 'private-test');
  await writeFile(path.join(root, '.env'), 'hidden-test');
  const outside = path.join(temp, 'outside');
  await mkdir(outside);
  await writeFile(path.join(outside, 'note.txt'), 'outside-test');
  await symlink(outside, path.join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  const server = createServer({ root });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(temp, { recursive: true, force: true }); });
  const port = server.address().port;
  return (url, method = 'GET') => new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: url, method }, res => {
      let body = ''; res.setEncoding('utf8'); res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    }); req.on('error', reject); req.end();
  });
}
test('servesLanding', async t => {
  const request = await fixture(t);
  const res = await request('/'); assert.equal(res.status, 200); assert.match(res.body, /Мария/);
  assert.match(res.headers['content-type'], /text\/html/);
  assert.equal((await request('/', 'HEAD')).body, '');
});
test('blocksPrivatePaths', async t => {
  const request = await fixture(t);
  for (const url of ['/research.md', '/specification.md', '/.env', '/../research.md', '/..%2fresearch.md', '/linked/note.txt', '/%zz']) {
    const res = await request(url); assert.ok(res.status >= 400, url); assert.doesNotMatch(res.body, /private-test|outside-test|hidden-test/);
  }
});
test('rejectsMethods', async t => assert.equal((await (await fixture(t))('/', 'POST')).status, 405));
test('returnsNotFound', async t => assert.equal((await (await fixture(t))('/missing')).status, 404));

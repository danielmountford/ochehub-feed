/**
 * Zero-dependency static server for dist/. `node scripts/serve.mjs` then open
 * the printed address. YouTube embeds need http://, so don't open the HTML
 * file directly from disk.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};

export function serve(directory, port = Number(process.env.PORT) || 4173) {
  const server = createServer((request, response) => {
    const path = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    let file = normalize(join(directory, path));
    if (file !== directory && !file.startsWith(directory + sep)) {
      response.writeHead(403).end();
      return;
    }
    if (!existsSync(file) || statSync(file).isDirectory()) {
      file = join(directory, 'index.html');
    }
    response.writeHead(200, {
      'Content-Type': types[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    createReadStream(file).pipe(response);
  });
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is busy. Try: PORT=${port + 1} node scripts/serve.mjs`);
      process.exit(1);
    }
    throw error;
  });
  server.listen(port, () => {
    console.log(`\n  OcheHub Feed  →  http://localhost:${port}\n`);
    for (const addresses of Object.values(networkInterfaces())) {
      for (const address of addresses ?? []) {
        if (address.family === 'IPv4' && !address.internal) {
          console.log(`  On your phone (same Wi-Fi)  →  http://${address.address}:${port}`);
        }
      }
    }
    console.log('');
  });
  return server;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
  if (!existsSync(join(dist, 'index.html'))) {
    console.error('dist/ is missing. Run: npm install && npm run build');
    process.exit(1);
  }
  serve(dist);
}

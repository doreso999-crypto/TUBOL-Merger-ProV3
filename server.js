const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT) || 5173;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
};

function safePath(requestPath) {
  const decoded = decodeURIComponent(requestPath.split('?')[0]);
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const full = path.resolve(ROOT, relative);
  if (full !== ROOT && !full.startsWith(`${ROOT}${path.sep}`)) return null;
  return full;
}

function sendFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500, {
        'Content-Type': 'text/plain; charset=utf-8',
      });
      res.end(err.code === 'ENOENT' ? 'Not found' : 'Server error');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    let output = data;

    if (ext === '.html' && path.basename(filePath).toLowerCase() === 'index.html') {
      const html = data.toString('utf8');
      const injected = html.replace(
        /<link rel=["']stylesheet["'] href=["']design\.css["']\s*\/?\s*>/i,
        '<link rel="stylesheet" href="design.css">\n  <link rel="stylesheet" href="editor-fit.css">'
      ).replace(
        /<script src=["']functions\.js["']><\/script>/i,
        '<script src="functions.js"></script>\n  <script src="drop-scope.js"></script>\n  <script src="rotate-fix.js"></script>\n  <script src="editor-fit.js"></script>'
      );
      output = Buffer.from(injected, 'utf8');
    }

    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(output);
  });
}

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || `${HOST}:${PORT}`}`);
    const filePath = safePath(url.pathname);

    if (!filePath) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    fs.stat(filePath, (statErr, stats) => {
      if (!statErr && stats.isDirectory()) {
        return sendFile(path.join(filePath, 'index.html'), res);
      }
      sendFile(filePath, res);
    });
  } catch (error) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`TUBOL Merger Pro running at http://${HOST}:${PORT}/`);
  console.log('Press Ctrl+C to stop the server.');
});

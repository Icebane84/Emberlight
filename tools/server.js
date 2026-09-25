/**
 * ============================================================================
 * PHOENIX SOVEREIGN ENGINE: ZERO-DEPENDENCY LOCAL HTTP SERVER
 * Protocol Anchor: PSGC-001 / VSRP-001 / Faraday Membrane
 * Environment: Pure Node Standard Library (Zero npm Dependencies)
 * ============================================================================
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number.parseInt(process.env.PORT || '8080', 10);
const ROOT_DIR = path.resolve(__dirname, '..');

const MIME_TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.js': 'application/javascript; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml',
	'.ico': 'image/x-icon',
	'.wav': 'audio/wav',
	'.mp3': 'audio/mpeg',
	'.wasm': 'application/wasm',
	'.stcp': 'text/plain; charset=utf-8',
	'.d.ts': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
	// Enable local CORS and Faraday security headers
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
	res.setHeader('Access-Control-Allow-Headers', '*');

	if (req.method === 'OPTIONS') {
		res.writeHead(204);
		res.end();
		return;
	}

	let reqUrl = req.url || '/';
	const queryIdx = reqUrl.indexOf('?');
	if (queryIdx !== -1) reqUrl = reqUrl.slice(0, queryIdx);

	let safePath = path.normalize(decodeURIComponent(reqUrl)).replace(/^(\.\.[/\\])+/, '');
	if (safePath === '/' || safePath === '\\') {
		safePath = '/phoenix/core_governor.html';
	}

	let filePath = path.join(ROOT_DIR, safePath);

	fs.stat(filePath, (err, stats) => {
		if (err || !stats.isFile()) {
			res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
			res.end(`404 Not Found: ${safePath}`);
			return;
		}

		const ext = path.extname(filePath).toLowerCase();
		const contentType = MIME_TYPES[ ext ] || 'application/octet-stream';

		res.writeHead(200, {
			'Content-Type': contentType,
			'Content-Length': stats.size,
			'Cache-Control': 'no-cache'
		});

		fs.createReadStream(filePath).pipe(res);
	});
});

server.listen(PORT, '127.0.0.1', () => {
	console.log(`\n============================================================`);
	console.log(`🔥 PHOENIX SOVEREIGN WORKBENCH SERVER ACTIVE`);
	console.log(`📡 URL: http://127.0.0.1:${PORT}/phoenix/core_governor.html`);
	console.log(`🎮 Game Dev Viewport: http://127.0.0.1:${PORT}/index.html`);
	console.log(`============================================================\n`);
});

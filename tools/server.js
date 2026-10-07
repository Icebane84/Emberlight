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
const { exec } = require('node:child_process');

// Parse CLI port or flag: `node tools/server.js [port] [--open]`
const args = process.argv.slice(2);
const openBrowser = args.includes('--open') || args.includes('-o');
const customPortArg = args.find(a => /^\d+$/.test(a));
const DEFAULT_PORT = customPortArg ? Number.parseInt(customPortArg, 10) : Number.parseInt(process.env.PORT || '8080', 10);
let currentPort = Number.isNaN(DEFAULT_PORT) ? 8080 : DEFAULT_PORT;

const ROOT_DIR = path.resolve(__dirname, '..');

const MIME_TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.js': 'application/javascript; charset=utf-8',
	'.mjs': 'application/javascript; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.phx': 'text/plain; charset=utf-8',
	'.syn': 'text/plain; charset=utf-8',
	'.md': 'text/markdown; charset=utf-8',
	'.csv': 'text/csv; charset=utf-8',
	'.txt': 'text/plain; charset=utf-8',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml',
	'.ico': 'image/x-icon',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.wav': 'audio/wav',
	'.mp3': 'audio/mpeg',
	'.wasm': 'application/wasm',
	'.stcp': 'text/plain; charset=utf-8',
	'.d.ts': 'text/plain; charset=utf-8',
	'.map': 'application/json; charset=utf-8',
	'.webmanifest': 'application/manifest+json; charset=utf-8'
};

const server = http.createServer((req, res) => {
	// Enable local CORS and Faraday cross-origin isolation headers (for SharedArrayBuffer & WebLLM)
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
	res.setHeader('Access-Control-Allow-Headers', '*');
	res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
	res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
	res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // Prevents COEP from blocking local subresources

	if (req.method === 'OPTIONS') {
		res.writeHead(204);
		res.end();
		return;
	}

	let reqUrl = req.url || '/';
	const queryIdx = reqUrl.indexOf('?');
	if (queryIdx !== -1) reqUrl = reqUrl.slice(0, queryIdx);

	let decodedUrl;
	try {
		decodedUrl = decodeURIComponent(reqUrl);
	} catch (_) {
		decodedUrl = reqUrl;
	}

	let safeRelPath = path.normalize(decodedUrl).replace(/^(\.\.[/\\])+/, '');
	if (safeRelPath === '/' || safeRelPath === '\\' || safeRelPath === '/phoenix' || safeRelPath === '/phoenix/') {
		safeRelPath = '/phoenix/core_governor.html';
	}

	let filePath = path.resolve(ROOT_DIR, '.' + path.sep + safeRelPath.replace(/^[/\\]+/, ''));

	// Enforce strict root jail
	if (!filePath.startsWith(ROOT_DIR)) {
		res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
		res.end('403 Forbidden: Path traversal prohibited');
		return;
	}

	fs.stat(filePath, (err, stats) => {
		if (err) {
			res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
			res.end(`404 Not Found: ${safeRelPath}`);
			return;
		}

		// If a directory is requested, attempt index.html resolution
		if (stats.isDirectory()) {
			const indexHtml = path.join(filePath, 'index.html');
			fs.stat(indexHtml, (indexErr, indexStats) => {
				if (!indexErr && indexStats.isFile()) {
					serveFile(indexHtml, indexStats, req, res);
				} else {
					res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
					res.end(`404 Not Found: ${safeRelPath}`);
				}
			});
			return;
		}

		serveFile(filePath, stats, req, res);
	});
});

function serveFile(filePath, stats, req, res) {
	const ext = path.extname(filePath).toLowerCase();
	const contentType = MIME_TYPES[ ext ] || 'application/octet-stream';

	res.writeHead(200, {
		'Content-Type': contentType,
		'Content-Length': stats.size,
		'Cache-Control': 'no-cache'
	});

	if (req.method === 'HEAD') {
		res.end();
		return;
	}

	const stream = fs.createReadStream(filePath);
	stream.on('error', () => {
		if (!res.headersSent) res.writeHead(500);
		res.end();
	});
	stream.pipe(res);
}

function launchBrowser(url) {
	const platform = process.platform;
	let cmd = '';
	if (platform === 'win32') cmd = `start "" "${url}"`;
	else if (platform === 'darwin') cmd = `open "${url}"`;
	else cmd = `xdg-open "${url}"`;

	exec(cmd, () => {});
}

server.on('error', (err) => {
	if (err.code === 'EADDRINUSE') {
		console.warn(`⚠️ [SERVER] Port ${currentPort} is currently in use.`);
		currentPort++;
		console.log(`🔄 [SERVER] Incrementing to port ${currentPort}...`);
		startServer(currentPort);
	} else {
		console.error('❌ [SERVER] Server error:', err);
		process.exit(1);
	}
});

server.on('listening', () => {
	const addr = server.address();
	const port = (typeof addr === 'object' && addr) ? addr.port : currentPort;
	const ideUrl = `http://127.0.0.1:${port}/phoenix/core_governor.html`;
	const gameUrl = `http://127.0.0.1:${port}/index.html`;

	console.log(`\n============================================================`);
	console.log(`🔥 PHOENIX SOVEREIGN WORKBENCH SERVER ACTIVE (Air-Gapped)`);
	console.log(`📡 Sovereign Web IDE:  ${ideUrl}`);
	console.log(`🎮 Game Dev Viewport:  ${gameUrl}`);
	console.log(`🔒 Faraday Isolation:  Active (Zero-Cloud / Localhost Only)`);
	console.log(`============================================================\n`);

	if (openBrowser) {
		launchBrowser(ideUrl);
	}
});

function startServer(port) {
	server.listen(port, '127.0.0.1');
}

// Start listening
startServer(currentPort);

// Graceful termination handling
process.on('SIGINT', () => {
	console.log('\n🛑 Shutting down Phoenix Workbench Server...');
	server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
	server.close(() => process.exit(0));
});

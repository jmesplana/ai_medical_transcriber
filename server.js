/**
 * Aidstack Medical AI - Server
 * Serves the application and proxies OpenMRS API requests
 */

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const OPENMRS_BASE_URL = 'https://dev3.openmrs.org/openmrs';

// MIME types for different file extensions
const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // Enable CORS for all requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Serve landing page for root path
    if (req.url === '/' || req.url === '/index.html') {
        serveFile('./landing.html', 'text/html', res);
        return;
    }

    // Serve app at /app or /src/index.html
    if (req.url === '/app' || req.url === '/src/index.html') {
        serveFile('./src/index.html', 'text/html', res);
        return;
    }

    // Serve static files from src directory
    if (req.url.startsWith('/src/') || req.url.startsWith('/js/') || req.url.startsWith('/css/')) {
        const filePath = path.join('.', req.url);
        const ext = path.extname(filePath);
        const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
        serveFile(filePath, mimeType, res);
        return;
    }

    // Serve connector files
    if (req.url.startsWith('/connectors/')) {
        const filePath = path.join('.', req.url);
        serveFile(filePath, 'application/javascript', res);
        return;
    }

    // Serve config files
    if (req.url.startsWith('/config/')) {
        const filePath = path.join('.', req.url);
        serveFile(filePath, 'application/json', res);
        return;
    }

    // Proxy OpenMRS API requests
    if (req.url.startsWith('/openmrs-proxy')) {
        const targetPath = req.url.replace('/openmrs-proxy', '');
        const targetUrl = `${OPENMRS_BASE_URL}${targetPath}`;

        console.log(`Proxying: ${req.method} ${targetUrl}`);

        const parsedUrl = url.parse(targetUrl);
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.path,
            method: req.method,
            headers: {
                ...req.headers,
                host: parsedUrl.hostname
            }
        };

        const proxyReq = https.request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, {
                ...proxyRes.headers,
                'Access-Control-Allow-Origin': '*'
            });
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
            console.error('Proxy error:', err);
            res.writeHead(500);
            res.end('Proxy error: ' + err.message);
        });

        req.pipe(proxyReq);
        return;
    }

    // 404 for other requests
    res.writeHead(404);
    res.end('Not found');
});

// Helper function to serve files
function serveFile(filePath, mimeType, res) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end(`File not found: ${filePath}`);
            } else {
                res.writeHead(500);
                res.end(`Error loading file: ${err.message}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': mimeType });
            res.end(data);
        }
    });
}

server.listen(PORT, () => {
    console.log(`\n✅ Aidstack Medical AI Server running!`);
    console.log(`🌐 Open: http://localhost:${PORT}`);
    console.log(`🔄 Proxying OpenMRS API at: ${OPENMRS_BASE_URL}`);
    console.log(`📁 Serving from: ./src`);
    console.log(`🔌 Connectors: ./connectors\n`);
});

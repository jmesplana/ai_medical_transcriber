/**
 * Simple CORS proxy for OpenMRS API
 * This allows the frontend to bypass CORS restrictions
 */

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 3000;
const OPENMRS_BASE_URL = 'https://dev3.openmrs.org/openmrs';

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

  // Serve index-v2.html for root path
  if (req.url === '/' || req.url === '/index.html') {
    const fs = require('fs');
    fs.readFile('./index-v2.html', (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading index-v2.html');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      }
    });
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

server.listen(PORT, () => {
  console.log(`\n✅ Aidstack Medical AI Server running!`);
  console.log(`🌐 Open: http://localhost:${PORT}`);
  console.log(`🔄 Proxying OpenMRS API at: ${OPENMRS_BASE_URL}\n`);
});

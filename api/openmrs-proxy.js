/**
 * Vercel Serverless Function - OpenMRS Proxy
 * Proxies requests to OpenMRS REST API to avoid CORS issues
 */

const https = require('https');
const http = require('http');

const OPENMRS_BASE_URL = 'https://dev3.openmrs.org/openmrs';

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Extract the path from the URL
    // URL will be like: /api/openmrs-proxy?path=/ws/rest/v1/patient
    const targetPath = req.query.path || req.url.replace('/api/openmrs-proxy', '');

    if (!targetPath) {
        res.status(400).json({ error: 'No path provided' });
        return;
    }

    const targetUrl = `${OPENMRS_BASE_URL}${targetPath}`;

    console.log(`Proxying: ${req.method} ${targetUrl}`);

    return new Promise((resolve, reject) => {
        const urlObj = new URL(targetUrl);
        const protocol = urlObj.protocol === 'https:' ? https : http;

        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: req.method,
            headers: {
                ...req.headers,
                host: urlObj.hostname
            }
        };

        // Remove headers that shouldn't be forwarded
        delete options.headers['host'];
        delete options.headers['connection'];

        const proxyReq = protocol.request(options, (proxyRes) => {
            // Set response headers
            res.status(proxyRes.statusCode);

            // Forward response headers
            Object.keys(proxyRes.headers).forEach(key => {
                if (key.toLowerCase() !== 'transfer-encoding') {
                    res.setHeader(key, proxyRes.headers[key]);
                }
            });

            // Override CORS headers
            res.setHeader('Access-Control-Allow-Origin', '*');

            // Pipe the response
            proxyRes.pipe(res);

            proxyRes.on('end', () => {
                resolve();
            });
        });

        proxyReq.on('error', (err) => {
            console.error('Proxy error:', err);
            res.status(500).json({ error: 'Proxy error: ' + err.message });
            reject(err);
        });

        // Forward the request body if present
        if (req.method === 'POST' || req.method === 'PUT') {
            if (req.body) {
                const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
                proxyReq.write(bodyStr);
            }
        }

        proxyReq.end();
    });
};

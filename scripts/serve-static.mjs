import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, relative, resolve, sep } from 'node:path';

const root = resolve(process.cwd());
const port = Number(process.argv[2] || process.env.PORT || 4173);

const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.csv': 'text/csv; charset=utf-8',
    '.gif': 'image/gif',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp'
};

const sendText = (response, status, message) => {
    response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(message);
};

const server = createServer(async (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) {
        response.setHeader('Allow', 'GET, HEAD');
        sendText(response, 405, 'Method Not Allowed');
        return;
    }

    let requestPath;
    try {
        requestPath = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname);
    } catch {
        sendText(response, 400, 'Bad Request');
        return;
    }

    const filePath = resolve(root, `.${requestPath}`);
    const relativePath = relative(root, filePath);
    if (relativePath.startsWith('..') || relativePath.includes(`..${sep}`)) {
        sendText(response, 403, 'Forbidden');
        return;
    }

    let resolvedPath = filePath;
    try {
        const fileStats = await stat(resolvedPath);
        if (fileStats.isDirectory()) resolvedPath = resolve(resolvedPath, 'index.html');
    } catch {
        sendText(response, 404, 'Not Found');
        return;
    }

    try {
        const fileStats = await stat(resolvedPath);
        if (!fileStats.isFile()) {
            sendText(response, 404, 'Not Found');
            return;
        }
        response.writeHead(200, {
            'Content-Length': fileStats.size,
            'Content-Type': contentTypes[extname(resolvedPath).toLowerCase()] || 'application/octet-stream'
        });
        if (request.method === 'HEAD') response.end();
        else createReadStream(resolvedPath).pipe(response);
    } catch {
        sendText(response, 404, 'Not Found');
    }
});

server.listen(port, '127.0.0.1', () => {
    console.log(`Static server listening at http://127.0.0.1:${port}`);
});

// js/export-bridge-server.js
/**
 * Local HTTP bridge for Real Repository Export Mode.
 * Browser clients POST a payload here; the bridge runs the Node exporter and serves a zip download.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { exportClean, exportFullHistory, exportWithWorkflow } = require('./export-repo.js');

function sendJson(res, statusCode, payload) {
    const body = JSON.stringify(payload, null, 2);
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(body);
}

function sendText(res, statusCode, text, contentType) {
    const body = String(text || '');
    res.writeHead(statusCode, {
        'Content-Type': contentType || 'text/plain; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(body);
}

function readRequestBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
            try {
                const raw = Buffer.concat(chunks).toString('utf8');
                resolve(raw ? JSON.parse(raw) : {});
            } catch (err) {
                reject(err);
            }
        });
        req.on('error', reject);
    });
}

function normalizePayload(payload) {
    const mode = String(payload && payload.mode || 'clean');
    const gameState = payload && payload.gameState ? payload.gameState : {};
    const fileSystem = payload && payload.fileSystem ? payload.fileSystem : null;
    const config = payload && payload.config ? payload.config : {};

    const gitState = Object.assign({}, gameState.gitState || {});
    gitState.config = gitState.config || {};
    gitState.config.global = Object.assign({}, config, gitState.config.global || {});
    if (gameState.gitState && gameState.gitState.config && gameState.gitState.config.local) {
        gitState.config.local = Object.assign({}, gameState.gitState.config.local);
    }

    return {
        mode,
        gameState,
        fileSystem,
        gitState,
        config
    };
}

function createBridgeServer(options) {
    const port = Number(options && options.port) || 31555;
    const host = options && options.host ? String(options.host) : '127.0.0.1';
    const exportsDir = options && options.exportsDir
        ? path.resolve(String(options.exportsDir))
        : path.join(os.tmpdir(), 'gwa-export-bridge');
    const exportsByToken = new Map();

    fs.mkdirSync(exportsDir, { recursive: true });

    const handler = createBridgeRequestHandler({ host, port, exportsDir, exportsByToken });
    const server = http.createServer(handler);

    return {
        server,
        port,
        host,
        exportsDir,
        handler,
        listen() {
            return new Promise((resolve, reject) => {
                server.once('error', reject);
                server.listen(port, host, () => {
                    server.off('error', reject);
                    resolve({ host, port });
                });
            });
        },
        close() {
            return new Promise((resolve) => server.close(() => resolve()));
        }
    };
}

function createBridgeRequestHandler(context) {
    const host = context.host || '127.0.0.1';
    const port = context.port || 31555;
    const exportsDir = context.exportsDir;
    const exportsByToken = context.exportsByToken || new Map();

    return async function (req, res) {
        const urlHost = req.headers.host || `${host}:${port}`;
        const url = new URL(req.url, `http://${urlHost}`);
        const method = req.method || 'GET';

        if (method === 'OPTIONS') {
            res.writeHead(204, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            });
            res.end();
            return;
        }

        if (method === 'GET' && url.pathname === '/health') {
            sendJson(res, 200, { ok: true, port });
            return;
        }

        if (method === 'POST' && url.pathname === '/export') {
            try {
                const payload = normalizePayload(await readRequestBody(req));
                const runner = payload.mode === 'workflow'
                    ? exportWithWorkflow
                    : payload.mode === 'full'
                        ? exportFullHistory
                        : exportClean;

                const result = runner({
                    gitState: payload.gitState,
                    fsSnapshot: payload.fileSystem,
                    config: payload.config
                }, { mode: payload.mode });

                const token = crypto.randomBytes(12).toString('hex');
                const zipName = path.basename(result.archivePath);
                const targetPath = path.join(exportsDir, token + '-' + zipName);
                fs.copyFileSync(result.archivePath, targetPath);
                exportsByToken.set(token, targetPath);

                sendJson(res, 200, {
                    ok: true,
                    mode: payload.mode,
                    archiveName: zipName,
                    downloadUrl: `/download/${token}`,
                    repoDir: result.repoDir
                });
            } catch (err) {
                sendJson(res, 500, {
                    ok: false,
                    error: err && err.message ? err.message : String(err)
                });
            }
            return;
        }

        if (method === 'GET' && url.pathname.startsWith('/download/')) {
            const token = url.pathname.split('/')[2] || '';
            const filePath = exportsByToken.get(token);
            if (!filePath || !fs.existsSync(filePath)) {
                sendText(res, 404, 'export not found');
                return;
            }

            const name = path.basename(filePath);
            res.writeHead(200, {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${name}"`,
                'Content-Length': fs.statSync(filePath).size,
                'Access-Control-Allow-Origin': '*'
            });
            fs.createReadStream(filePath).pipe(res);
            return;
        }

        sendText(res, 404, 'not found');
    };
}

module.exports = { createBridgeServer, createBridgeRequestHandler };

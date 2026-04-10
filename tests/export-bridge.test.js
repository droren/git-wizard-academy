const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { PassThrough } = require('stream');
const { createBridgeRequestHandler } = require('../js/export-bridge-server.js');

function makeState() {
  return {
    mode: 'full',
    gitState: {
      branches: ['main'],
      currentBranch: 'main',
      headRef: 'refs/heads/main',
      head: 'abc',
      refs: { main: 'abc' },
      commits: [{
        sha: 'abc',
        shortSha: 'abc1234',
        message: 'Initial commit',
        authorName: 'Dennis Hjort',
        authorEmail: 'hjort.dennis@gmail.com',
        timestamp: '2026-04-10T10:00:00.000Z',
        branch: 'main',
        parents: [],
        snapshot: {
          'README.md': '# Bridge Test\n'
        }
      }],
      commitBySha: {
        abc: {
          sha: 'abc',
          shortSha: 'abc1234',
          message: 'Initial commit',
          authorName: 'Dennis Hjort',
          authorEmail: 'hjort.dennis@gmail.com',
          timestamp: '2026-04-10T10:00:00.000Z',
          branch: 'main',
          parents: [],
          snapshot: {
            'README.md': '# Bridge Test\n'
          }
        }
      },
      config: {
        global: {
          'user.name': 'Dennis Hjort',
          'user.email': 'hjort.dennis@gmail.com'
        },
        local: {}
      }
    },
    fileSystem: {
      files: {
        'README.md': '# Bridge Test\n'
      }
    },
    config: {
      'user.name': 'Dennis Hjort',
      'user.email': 'hjort.dennis@gmail.com'
    }
  };
}

async function run() {
  const exportsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gwa-bridge-test-'));
  const handler = createBridgeRequestHandler({
    host: '127.0.0.1',
    port: 31555,
    exportsDir,
    exportsByToken: new Map()
  });

  async function invoke(method, pathname, body) {
    const headers = body ? { 'content-type': 'application/json', host: '127.0.0.1:31555' } : { host: '127.0.0.1:31555' };
    let statusCode = 0;
    const resHeaders = {};
    const responseStream = new PassThrough();
    let responseBuffer = Buffer.alloc(0);
    responseStream.on('data', (chunk) => {
      responseBuffer = Buffer.concat([responseBuffer, chunk]);
    });
    const res = Object.assign(responseStream, {
      writeHead(status, headersObj) {
        statusCode = status;
        Object.assign(resHeaders, headersObj || {});
      },
      setHeader(name, value) {
        resHeaders[name.toLowerCase()] = value;
      }
    });
    const req = {
      method,
      url: pathname,
      headers,
      on(event, cb) {
        if (event === 'data' && body) cb(Buffer.from(JSON.stringify(body)));
        if (event === 'end') cb();
        if (event === 'error') return;
      }
    };
    const finished = new Promise((resolve) => responseStream.on('finish', resolve));
    await handler(req, res);
    await finished;
    return { status: statusCode, body: responseBuffer.toString('utf8'), headers: resHeaders, raw: responseBuffer };
  }

  const health = await invoke('GET', '/health');
  assert.strictEqual(health.status, 200, 'health endpoint should return OK');
  assert.strictEqual(JSON.parse(health.body).ok, true, 'health endpoint should report ok');

  const exportRes = await invoke('POST', '/export', makeState());
  assert.strictEqual(exportRes.status, 200, 'export endpoint should succeed');
  const exportJson = JSON.parse(exportRes.body);
  assert(exportJson.downloadUrl, 'export response should contain download url');

  const token = String(exportJson.downloadUrl).split('/').pop();
  const fileRes = await invoke('GET', '/download/' + token);
  assert.strictEqual(fileRes.status, 200, 'download endpoint should return the archive');
  assert(fileRes.raw.length > 0, 'downloaded archive should not be empty');

  console.log('export-bridge: all tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

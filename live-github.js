#!/usr/bin/env node
// live-github.js
/**
 * Starts the local Live GitHub Mode bridge.
 */

const { createLiveGitHubServer } = require('./js/live-github-server.js');

async function main() {
    const port = Number(process.env.GWA_LIVE_GITHUB_PORT) || 31556;
    const host = process.env.GWA_LIVE_GITHUB_HOST || '127.0.0.1';
    const server = createLiveGitHubServer({ port, host });
    await server.listen();
    console.log('Live GitHub bridge listening on http://' + host + ':' + port);
}

main().catch((err) => {
    console.error(err && err.stack ? err.stack : String(err));
    process.exit(1);
});

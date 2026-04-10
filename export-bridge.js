#!/usr/bin/env node
// export-bridge.js
const { createBridgeServer } = require('./js/export-bridge-server.js');

async function main() {
    const portArgIndex = process.argv.findIndex((arg) => arg === '--port');
    const port = portArgIndex !== -1 && process.argv[portArgIndex + 1]
        ? Number(process.argv[portArgIndex + 1])
        : 31555;

    const bridge = createBridgeServer({ port });
    await bridge.listen();
    console.log(`Git Wizard Academy export bridge listening on http://127.0.0.1:${port}`);
    console.log('Use the Export Repo button in the browser, or POST to /export with the game payload.');

    process.on('SIGINT', async () => {
        await bridge.close();
        process.exit(0);
    });
}

main().catch((err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
});

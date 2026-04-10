// js/test-bridge.js
/**
 * Cross-origin safe integration test bridge.
 * Allows tests/integration.html to drive the app via postMessage.
 */

(function () {
    function sendToParent(payload) {
        if (!window.parent || window.parent === window) return;
        window.parent.postMessage(payload, '*');
    }

    function ready() {
        return !!(window.ui && window.gameEngine && window.gameState);
    }

    function serializeState() {
        return {
            currentLevel: window.gameState.currentLevel,
            currentObjectives: window.gameState.currentObjectives,
            completedLevels: window.gameState.completedLevels,
            flags: window.gameState.flags,
            commits: window.gameState.commits,
            merges: window.gameState.merges,
            branches: window.gameState.branches
        };
    }

    function respond(source, id, ok, result, error) {
        if (!source) return;
        source.postMessage({ type: 'GWA_TEST_RESPONSE', id, ok, result, error }, '*');
    }

    async function handleCommand(cmd, args) {
        if (!ready()) throw new Error('app not ready');

        if (cmd === 'resetGame') {
            window.gameEngine.resetGame(true);
            return { state: serializeState() };
        }
        if (cmd === 'resetLevel') {
            window.gameEngine.resetLevel(true);
            return { state: serializeState() };
        }
        if (cmd === 'loadLevel') {
            const level = Number(args && args.level);
            window.gameEngine.loadLevel(level);
            return { state: serializeState() };
        }
        if (cmd === 'exec') {
            const line = String((args && args.command) || '');
            const maybePromise = window.ui.processCommand(line);
            if (maybePromise && typeof maybePromise.then === 'function') {
                await maybePromise;
            }
            return { state: serializeState() };
        }
        if (cmd === 'checkObjectives') {
            window.gameEngine.checkObjectives();
            return { state: serializeState() };
        }
        if (cmd === 'getState') {
            return { state: serializeState() };
        }

        throw new Error('unknown command: ' + cmd);
    }

    window.addEventListener('message', async function (event) {
        const data = event.data || {};
        if (data.type !== 'GWA_TEST_COMMAND') return;

        try {
            const result = await handleCommand(data.command, data.args || {});
            respond(event.source, data.id, true, result, null);
        } catch (err) {
            respond(event.source, data.id, false, null, err && err.message ? err.message : String(err));
        }
    });

    // Notify harness when game is ready.
    const timer = setInterval(function () {
        if (!ready()) return;
        clearInterval(timer);
        sendToParent({ type: 'GWA_TEST_READY' });
    }, 100);
})();

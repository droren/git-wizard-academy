const assert = require('assert');
const { loadAll, fire } = require('./boot-smoke.test.js');

async function run() {
  const win = loadAll();
  fire(document, 'DOMContentLoaded');

  for (const level of [8, 9]) {
    win.gameEngine.loadLevel(level);
    assert.deepStrictEqual(
      Object.keys(win.gameState.gitState.remotes),
      [],
      `level ${level + 1} should leave origin/upstream for the learner to configure`
    );
    const origin = await win.gitCommands.remote(['add', 'origin', 'https://example.com/learner/repo.git']);
    const upstream = await win.gitCommands.remote(['add', 'upstream', 'https://example.com/academy/repo.git']);
    assert.strictEqual(origin.success, true, `level ${level + 1} should allow git remote add origin`);
    assert.strictEqual(upstream.success, true, `level ${level + 1} should allow git remote add upstream`);
  }

  console.log('capstone-level-setup: all tests passed');
}

run();

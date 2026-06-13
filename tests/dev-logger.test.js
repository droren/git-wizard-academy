const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function run() {
  global.window = {
    gameState: {
      currentLevel: 2,
      flags: { identityConfirmed: true }
    }
  };
  const source = fs.readFileSync(require.resolve('../js/dev-logger.js'), 'utf8');
  vm.runInThisContext(source, { filename: 'dev-logger.js' });

  window.DevLogger.log('git.commit', { message: 'feat: add debug logger' });
  assert.strictEqual(window.DevLogger.logs.length, 1, 'logger should record events');
  assert.strictEqual(window.DevLogger.logs[0].event, 'git.commit', 'event should be captured');
  assert.strictEqual(window.DevLogger.logs[0].state.currentLevel, 2, 'state snapshot should be captured');

  const exported = JSON.parse(window.DevLogger.export());
  assert.strictEqual(exported.length, 1, 'export should serialize logs');
  assert.strictEqual(exported[0].data.message, 'feat: add debug logger', 'export should include data');

  window.DevLogger.clear();
  assert.strictEqual(window.DevLogger.logs.length, 0, 'clear should reset logs');

  console.log('dev-logger: all tests passed');
}

run();

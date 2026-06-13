const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function run() {
  const spawnCalls = [];
  const effectCalls = [];
  global.window = {
    characterSystem: {
      spawn(type, opts) {
        spawnCalls.push({ type, opts });
      }
    },
    Effects: {
      spark(opts) {
        effectCalls.push({ type: 'spark', opts });
      },
      pulse(opts) {
        effectCalls.push({ type: 'pulse', opts });
      }
    },
    ui: {
      showHintToast() {}
    }
  };
  global.document = { body: { appendChild() {} }, createElement() { return {}; }, getElementById() { return null; } };
  const originalRandom = Math.random;
  Math.random = () => 0.1;

  const source = fs.readFileSync(require.resolve('../js/ambient-engine.js'), 'utf8');
  vm.runInThisContext(source, { filename: 'ambient-engine.js' });

  window.AmbientEngine.tick();
  assert(spawnCalls.length >= 1, 'ambient engine should spawn a character');
  assert(effectCalls.length >= 1, 'ambient engine should spawn effects too');

  Math.random = originalRandom;
  console.log('ambient-engine: all tests passed');
}

run();

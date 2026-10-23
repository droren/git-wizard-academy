const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function run() {
  const elements = {
    nanoTextarea: { value: 'const mode = "merged"; console.log(mode + " timeline");' },
    nanoFilename: { textContent: 'stale-or-missing-name' },
    nanoOverlay: { classList: { remove() {} } },
    terminalInput: { focus() {} }
  };
  const writes = [];
  const context = {
    window: {
      gameState: { nanoFile: 'app.js', flags: {} },
      fileSystemModule: {
        createFile(name, content) { writes.push({ name, content }); }
      },
      gameEngine: { addXP() {} }
    },
    document: {
      getElementById(id) { return elements[id] || null; },
      addEventListener() {}
    },
    setTimeout(callback) { callback(); },
    clearTimeout() {},
    console
  };

  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'ui.js'), 'utf8');
  vm.runInNewContext(source, context, { filename: 'js/ui.js' });

  context.window.ui.saveNano();

  assert.deepStrictEqual(writes, [{
    name: 'app.js',
    content: 'const mode = "merged"; console.log(mode + " timeline");'
  }], 'nano must persist to the filename selected by the nano command, not a stale DOM label');
  assert.strictEqual(context.window.gameState.nanoFile, null, 'nano state should clear after saving');
  console.log('nano-save: all tests passed');
}

run();

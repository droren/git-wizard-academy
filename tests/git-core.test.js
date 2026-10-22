const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

function loadCore(repoModel) {
  const context = { window: { repoModel: repoModel || {} }, JSON, String, Object, Array, Set };
  vm.createContext(context);
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'git-core.js'), 'utf8');
  vm.runInContext(source, context, { filename: 'js/git-core.js' });
  return context.window.gitCore;
}

function run() {
  const core = loadCore();
  assert(core, 'git-core must expose a browser module');
  assert.strictEqual(core.hashContent('abc'), core.hashContent('abc'), 'hashing must be deterministic');
  assert.strictEqual(core.toSha('commit seed').length, 40, 'generated SHA must be full length');

  const original = { nested: { status: 'clean' }, files: ['README.md'] };
  const clone = core.deepClone(original);
  clone.nested.status = 'dirty';
  clone.files.push('app.js');
  assert.deepStrictEqual(original, { nested: { status: 'clean' }, files: ['README.md'] }, 'deepClone must isolate nested state');

  const delayedContext = { window: {}, JSON, String, Object, Array, Set };
  vm.createContext(delayedContext);
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'git-core.js'), 'utf8');
  vm.runInContext(source, delayedContext, { filename: 'js/git-core.js' });
  delayedContext.window.repoModel = { hashContent: () => 'model-hash', toSha: () => 'model-sha' };
  assert.strictEqual(delayedContext.window.gitCore.hashContent('later'), 'model-hash', 'core must resolve repoModel lazily');
  assert.strictEqual(delayedContext.window.gitCore.toSha('later'), 'model-sha', 'SHA generation must resolve repoModel lazily');

  console.log('git-core: all tests passed');
}

run();

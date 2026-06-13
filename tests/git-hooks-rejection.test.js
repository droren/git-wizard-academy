const assert = require('assert');
const { createHarness } = require('./git-commands.fixtures.js');

function run() {
  const h = createHarness({ files: { 'code.js': 'const value = 1;\n' } });

  h.git.init([]);
  h.git.add(['code.js']);
  h.git.commit(['-m', 'feat: initial code file']);

  h.fileSystemModule.writeFile('.git/hooks/pre-commit', '#!/bin/sh\n# lint\n');
  h.fileSystemModule.writeFile('code.js', 'console.log("debug"); // TODO remove\n');
  h.git.add(['code.js']);

  let res = h.git.commit(['-m', 'feat: try commit with lint violations']);
  assert.strictEqual(res.success, false, 'pre-commit hook should block dirty staged content');
  assert.match(res.message, /pre-commit hook failed/, 'pre-commit rejection message should be explicit');
  assert.strictEqual(h.window.gameState.flags.preCommitHookBlocked, true, 'pre-commit blocked flag should be set');

  h.fileSystemModule.writeFile('code.js', 'export const clean = true;\n');
  h.git.add(['code.js']);
  h.fileSystemModule.writeFile('.git/hooks/commit-msg', '#!/bin/sh\n# enforce conventional\nconventional\n');

  res = h.git.commit(['-m', 'update code']);
  assert.strictEqual(res.success, false, 'commit-msg hook should reject non-conventional message');
  assert.match(res.message, /commit-msg hook rejected/, 'commit-msg rejection should be surfaced');
  assert.strictEqual(h.window.gameState.flags.commitMsgHookBlocked, true, 'commit-msg blocked flag should be set');

  res = h.git.commit(['-m', 'feat: accept conventional message']);
  assert.strictEqual(res.success, true, 'valid conventional message should pass commit-msg hook');

  console.log('git-hooks-rejection: all tests passed');
}

run();

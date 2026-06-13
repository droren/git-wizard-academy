const assert = require('assert');
const { createHarness } = require('./git-commands.fixtures.js');

function run() {
  const h = createHarness({ files: { 'notes.txt': 'v1\n' } });

  let res = h.git.init([]);
  assert.strictEqual(res.success, true, 'git init should succeed');

  res = h.git.add(['notes.txt']);
  assert.strictEqual(res.success, true, 'initial add should succeed');
  res = h.git.commit(['-m', 'feat: initial notes file']);
  assert.strictEqual(res.success, true, 'initial commit should succeed');
  const firstSha = h.window.gameState.gitState.refs.main;

  h.fileSystemModule.writeFile('notes.txt', 'v2\n');
  h.git.add(['notes.txt']);
  res = h.git.commit(['-m', 'feat: update notes text']);
  assert.strictEqual(res.success, true, 'second commit should succeed');
  const secondSha = h.window.gameState.gitState.refs.main;
  assert.notStrictEqual(secondSha, firstSha, 'head should advance after second commit');

  const state = h.window.gameState.gitState;
  state.headRef = 'HEAD';
  state.head = secondSha;

  h.fileSystemModule.writeFile('notes.txt', 'detached edit\n');
  h.git.add(['notes.txt']);
  res = h.git.commit(['-m', 'feat: detached head commit recovery test']);
  assert.strictEqual(res.success, true, 'commit should still work in detached head simulation');

  res = h.git.reflog([]);
  assert.strictEqual(res.success, true, 'reflog should succeed');
  assert.match(res.message, /HEAD@\{0\}/, 'reflog should expose newest HEAD entry');

  res = h.git.reset(['--hard', 'HEAD~1']);
  assert.strictEqual(res.success, true, 'hard reset should recover previous commit');
  assert.strictEqual(h.window.gameState.flags.recoveredCommit, true, 'recovery flag should be set after reset to older commit');
  assert.strictEqual(h.fileSystemModule.readFile('notes.txt').content, 'v2\n', 'working tree should match recovered commit snapshot');

  console.log('git-detached-head: all tests passed');
}

run();

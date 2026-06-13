const assert = require('assert');
const { createHarness } = require('./git-commands.fixtures.js');

function run() {
  const h = createHarness({ files: { 'app.txt': 'base\n' } });

  h.git.init([]);
  h.git.add(['app.txt']);
  h.git.commit(['-m', 'feat: seed app file']);

  let res = h.git.checkout(['-b', 'feature']);
  assert.strictEqual(res.success, true, 'feature branch should be created');
  h.fileSystemModule.writeFile('app.txt', 'feature branch change\n');
  h.git.add(['app.txt']);
  h.git.commit(['-m', 'feat: feature branch update']);

  res = h.git.checkout(['main']);
  assert.strictEqual(res.success, true, 'checkout back to main should succeed');
  h.fileSystemModule.writeFile('app.txt', 'main branch change\n');
  h.git.add(['app.txt']);
  h.git.commit(['-m', 'feat: main branch update']);

  res = h.git.merge(['feature']);
  assert.strictEqual(res.success, false, 'merge should report conflict');
  assert.match(res.message, /CONFLICT/, 'conflict message should mention conflict');
  assert.strictEqual(h.window.gameState.gitState.mergeInProgress, true, 'merge should remain in progress');

  const conflictedContent = h.fileSystemModule.readFile('app.txt').content;
  assert.match(conflictedContent, /<<<<<<< main/, 'conflict markers should contain current branch header');
  assert.match(conflictedContent, /=======/, 'conflict markers should contain separator');
  assert.match(conflictedContent, />>>>>>> feature/, 'conflict markers should contain source branch footer');

  res = h.git.add(['app.txt']);
  assert.strictEqual(res.success, true, 'adding conflicted file should still stage file');

  res = h.git.commit(['-m', 'feat: complete conflicted merge']);
  assert.strictEqual(res.success, false, 'commit should fail while unresolved conflict markers exist');

  h.fileSystemModule.writeFile('app.txt', 'resolved content\n');
  res = h.git.add(['app.txt']);
  assert.strictEqual(res.success, true, 'resolved file should stage');
  assert.strictEqual(h.window.gameState.gitState.conflictFiles.length, 0, 'all conflicts should be cleared once markers are removed and file is added');

  res = h.git.commit(['-m', 'feat: complete merge after conflict resolution']);
  assert.strictEqual(res.success, true, 'merge completion commit should succeed');

  const state = h.window.gameState.gitState;
  const headSha = state.refs[state.currentBranch];
  const headCommit = state.commitBySha[headSha];
  assert.strictEqual(state.mergeInProgress, false, 'merge state should be cleared after merge commit');
  assert.strictEqual(headCommit.parents.length, 2, 'merge commit should retain two parents');
  assert.strictEqual(h.window.gameState.flags.mergeCompleted, true, 'merge completion flag should be set');

  console.log('git-merge-conflict-lifecycle: all tests passed');
}

run();

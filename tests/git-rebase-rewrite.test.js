const assert = require('assert');
const { createHarness } = require('./git-commands.fixtures.js');

function parentChain(state, startSha) {
  const chain = [];
  let ptr = startSha;
  while (ptr) {
    const commit = state.commitBySha[ptr];
    if (!commit) break;
    chain.push(commit);
    ptr = commit.parents[0] || null;
  }
  return chain;
}

function run() {
  const h = createHarness({ files: { 'history.txt': 'base\n' } });

  h.git.init([]);
  h.git.add(['history.txt']);
  h.git.commit(['-m', 'feat: base commit for rebase']);

  h.git.checkout(['-b', 'feature']);
  h.fileSystemModule.writeFile('history.txt', 'base\nfeature-1\n');
  h.git.add(['history.txt']);
  h.git.commit(['-m', 'feat: feature commit one']);

  h.fileSystemModule.writeFile('history.txt', 'base\nfeature-1\nfeature-2\n');
  h.git.add(['history.txt']);
  h.git.commit(['-m', 'feat: feature commit two']);

  const stateBefore = h.window.gameState.gitState;
  const oldFeatureHead = stateBefore.refs.feature;
  const oldFeatureChain = parentChain(stateBefore, oldFeatureHead).slice(0, 2).map((c) => c.sha);

  h.git.checkout(['main']);
  h.fileSystemModule.writeFile('main-only.txt', 'main-change\n');
  h.git.add(['main-only.txt']);
  h.git.commit(['-m', 'feat: main branch diverges']);
  const mainHead = h.window.gameState.gitState.refs.main;

  h.git.checkout(['feature']);
  const rebase = h.git.rebase(['main']);
  assert.strictEqual(rebase.success, true, 'rebase should complete successfully');

  const stateAfter = h.window.gameState.gitState;
  const newFeatureHead = stateAfter.refs.feature;
  const newFeatureChain = parentChain(stateAfter, newFeatureHead).slice(0, 3);

  assert.notStrictEqual(newFeatureHead, oldFeatureHead, 'feature head sha should be rewritten after rebase');
  assert.strictEqual(newFeatureChain[2].sha, mainHead, 'rebased chain should now be based on main head');
  assert.strictEqual(newFeatureChain[0].message, 'feat: feature commit two', 'new head should preserve latest replayed commit message');
  assert.strictEqual(newFeatureChain[1].message, 'feat: feature commit one', 'second rebased commit should preserve original message');

  const rewrittenFeatureShas = newFeatureChain.slice(0, 2).map((c) => c.sha);
  oldFeatureChain.forEach((oldSha) => {
    assert(!rewrittenFeatureShas.includes(oldSha), 'rebased commits should have new shas');
  });

  const finalContent = h.fileSystemModule.readFile('history.txt').content;
  assert.strictEqual(finalContent, 'base\nfeature-1\nfeature-2\n', 'rebased working tree should preserve replayed feature file history');
  assert.strictEqual(h.fileSystemModule.readFile('main-only.txt').content, 'main-change\n', 'rebased branch should include upstream files');

  console.log('git-rebase-rewrite: all tests passed');
}

run();

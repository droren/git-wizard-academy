const assert = require('assert');
const fs = require('fs');
const path = require('path');

function makeLocalStorage() {
  const store = {};
  return {
    getItem(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
    setItem(key, value) { store[key] = String(value); },
    removeItem(key) { delete store[key]; }
  };
}

function makeFs() {
  const files = {
    '.git/config': { content: '[core]\n\trepositoryformatversion = 0', modified: Date.now() }
  };
  return {
    exists(p) { return !!files[p]; },
    readFile(p) { return files[p] || null; },
    writeFile(p, content) { files[p] = { content: String(content), modified: Date.now() }; },
    createFile(p, content) { files[p] = { content: String(content || ''), modified: Date.now() }; },
    createDirectory() {},
    listDirectory() { return []; }
  };
}

function loadRuntime() {
  const windowObj = {
    gameState: { gitState: {}, flags: {} },
    fileSystemModule: makeFs(),
    configStore: { load: () => ({}), save: () => true },
    repoModel: {},
    localStorage: makeLocalStorage(),
    document: { getElementById: () => null, addEventListener: () => {}, querySelectorAll: () => [] },
    lessons: []
  };

  global.window = windowObj;
  global.localStorage = windowObj.localStorage;
  global.document = windowObj.document;

  const gitSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'git-commands.js'), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function('window', 'localStorage', 'document', `${gitSrc}\nreturn window.gitCommands;`)(windowObj, windowObj.localStorage, windowObj.document);

  const gameSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'game-engine.js'), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function('window', 'document', 'localStorage', `${gameSrc}\nreturn window.gameEngine;`)(windowObj, windowObj.document, windowObj.localStorage);

  return windowObj;
}

function seedState(windowObj) {
  const a = 'a'.repeat(40);
  const b = 'b'.repeat(40);
  const c = 'c'.repeat(40);
  const d = 'd'.repeat(40);
  const commits = {
    [a]: { sha: a, parents: [], tree: {}, snapshot: { 'README.md': 'base' } },
    [b]: { sha: b, parents: [a], tree: {}, snapshot: { 'README.md': 'feature update' } },
    [c]: { sha: c, parents: [a], tree: {}, snapshot: { 'README.md': 'remote diverged' } },
    [d]: { sha: d, parents: [b], tree: {}, snapshot: { 'README.md': 'CI_FAIL present' } }
  };

  windowObj.gameState.gitState = {
    branches: ['main', 'feature'],
    currentBranch: 'feature',
    refs: { main: a, feature: b },
    headRef: 'refs/heads/feature',
    head: b,
    commits: [commits[a], commits[b], commits[c], commits[d]],
    commitBySha: commits,
    index: {},
    staged: [],
    trackedFiles: {},
    mergeInProgress: false,
    conflictFiles: [],
    remotes: {
      origin: {
        name: 'origin',
        fetchUrl: 'https://example.com/origin.git',
        pushUrl: 'https://example.com/origin.git',
        branches: { main: a, feature: a }
      },
      upstream: {
        name: 'upstream',
        fetchUrl: 'https://example.com/upstream.git',
        pushUrl: 'https://example.com/upstream.git',
        branches: { main: c }
      }
    },
    remoteRefs: { 'refs/remotes/origin/main': a, 'refs/remotes/origin/feature': a },
    tracking: {
      main: { remote: 'origin', merge: 'refs/heads/main' },
      feature: { remote: 'origin', merge: 'refs/heads/feature' }
    },
    pullRequests: []
  };
}

async function run() {
  const w = loadRuntime();
  seedState(w);

  let result = await w.gitCommands.remote(['-v']);
  assert(result.message.includes('origin  https://example.com/origin.git (fetch)'), 'remote -v should show configured origin');

  result = await w.gitCommands.remote(['add', 'mirror', 'https://example.com/mirror.git']);
  assert(result.success, 'remote add should succeed');

  result = await w.gitCommands.remote(['set-url', 'mirror', 'https://example.com/mirror-2.git']);
  assert(result.success, 'remote set-url should succeed');
  result = await w.gitCommands.remote(['-v']);
  assert(result.message.includes('mirror  https://example.com/mirror-2.git (fetch)'), 'remote set-url should update fetch/push URL');

  w.gameState.gitState.remotes.origin.branches.feature = 'b'.repeat(40);
  result = await w.gitCommands.fetch(['origin']);
  assert(result.success, 'fetch should succeed');
  assert.strictEqual(w.gameState.gitState.remoteRefs['refs/remotes/origin/feature'], 'b'.repeat(40), 'fetch should update remote refs');

  // Fast-forward push (origin/feature from a -> b)
  w.gameState.gitState.refs.feature = 'b'.repeat(40);
  w.gameState.gitState.remotes.origin.branches.feature = 'a'.repeat(40);
  result = await w.gitCommands.push(['origin', 'feature']);
  assert(result.success, 'push should fast-forward remote branch');
  assert.strictEqual(w.gameState.gitState.remotes.origin.branches.feature, 'b'.repeat(40), 'remote branch should move to local head');

  // Non-fast-forward push should fail (remote feature at c diverged from local b)
  w.gameState.gitState.remotes.origin.branches.feature = 'c'.repeat(40);
  result = await w.gitCommands.push(['origin', 'feature']);
  assert(!result.success, 'push should reject non-fast-forward updates');
  assert(/non-fast-forward/.test(result.message), 'push should report non-fast-forward');

  // Pull should fast-forward feature from b -> d when origin/feature contains descendant
  w.gameState.gitState.commitBySha['d'.repeat(40)] = {
    sha: 'd'.repeat(40),
    parents: ['b'.repeat(40)],
    tree: {},
    snapshot: { 'README.md': 'CI_FAIL present' }
  };
  w.gameState.gitState.refs.feature = 'b'.repeat(40);
  w.gameState.gitState.remotes.origin.branches.feature = 'd'.repeat(40);
  result = await w.gitCommands.pull(['origin', 'feature']);
  assert(result.success, 'pull should succeed');
  assert.strictEqual(w.gameState.gitState.refs.feature, 'd'.repeat(40), 'pull should fast-forward local branch');

  // Simulated PR workflow should block merge when checks fail
  w.gameState.gitState.currentBranch = 'feature';
  w.gameState.gitState.refs.feature = 'd'.repeat(40);
  await w.gameEngine.createLiveGitHubPr();
  const reviewResult = await w.gameEngine.runLiveGitHubReviewBot();
  assert(reviewResult.simulated, 'review should run in simulated mode');
  assert.strictEqual(reviewResult.result.merged, false, 'merge must be blocked when CI checks fail');

  console.log('remote-simulation: all tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

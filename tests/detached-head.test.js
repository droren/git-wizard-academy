const assert = require('assert');
const fs = require('fs');
const path = require('path');

function makeStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    }
  };
}

function loadScript(filePath, scope) {
  const src = fs.readFileSync(filePath, 'utf8');
  // eslint-disable-next-line no-new-func
  const fn = new Function('window', 'localStorage', 'document', `${src}\nreturn window;`);
  return fn(scope.window, scope.localStorage, scope.document);
}

function bootGitCommands() {
  const windowObj = {
    gameState: {
      commits: 0,
      merges: 0,
      branches: 1,
      flags: {}
    }
  };
  const scope = {
    window: windowObj,
    localStorage: makeStorage(),
    document: {
      getElementById() {
        return null;
      }
    }
  };

  loadScript(path.join(__dirname, '..', 'js', 'file-system.js'), scope);
  loadScript(path.join(__dirname, '..', 'js', 'repo-model.js'), scope);
  loadScript(path.join(__dirname, '..', 'js', 'git-commands.js'), scope);

  return windowObj;
}

function run() {
  const windowObj = bootGitCommands();
  const git = windowObj.gitCommands;
  const fsModule = windowObj.fileSystemModule;

  assert.strictEqual(git.init([]).success, true, 'git init should succeed');
  git.config(['user.name', 'Test User']);
  git.config(['user.email', 'test@example.com']);

  fsModule.writeFile('note.txt', 'base\n');
  git.add(['note.txt']);
  const firstCommit = git.commit(['-m', 'feat: initial base commit']);
  assert.strictEqual(firstCommit.success, true, 'initial commit should succeed');
  const firstSha = windowObj.gameState.gitState.head;

  fsModule.writeFile('note.txt', 'main line\n');
  git.add(['note.txt']);
  const secondCommit = git.commit(['-m', 'feat: advance main branch']);
  assert.strictEqual(secondCommit.success, true, 'second commit should succeed');
  const secondSha = windowObj.gameState.gitState.refs.main;

  const coSha = git.checkout([firstSha.slice(0, 7)]);
  assert.strictEqual(coSha.success, true, 'checkout <sha> should succeed');
  assert.strictEqual(windowObj.gameState.gitState.headDetached, true, 'checkout <sha> should detach HEAD');
  assert.strictEqual(windowObj.gameState.gitState.detachedHeadSha, firstSha, 'detached HEAD should point to requested commit');
  const oneline = git.log(['--oneline']).message;
  assert(/HEAD/.test(oneline), 'git log decoration should show detached HEAD');

  fsModule.writeFile('note.txt', 'detached work\n');
  git.add(['note.txt']);
  const detachedCommit = git.commit(['-m', 'feat: detached experiment commit']);
  assert.strictEqual(detachedCommit.success, true, 'commit while detached should succeed');
  const orphanSha = windowObj.gameState.gitState.detachedHeadSha;
  assert.notStrictEqual(orphanSha, firstSha, 'detached commit should advance detached pointer');
  assert.strictEqual(windowObj.gameState.gitState.refs.main, secondSha, 'detached commit must not move refs/heads/main');

  const resetDetached = git.reset(['--soft', 'HEAD~1']);
  assert.strictEqual(resetDetached.success, true, 'reset while detached should succeed');
  assert.strictEqual(windowObj.gameState.gitState.detachedHeadSha, firstSha, 'detached reset should move detached pointer');
  assert.strictEqual(windowObj.gameState.gitState.refs.main, secondSha, 'detached reset must not move refs/heads/main');

  const backToMain = git.checkout(['main']);
  assert.strictEqual(backToMain.success, true, 'checkout main should succeed');
  assert.strictEqual(windowObj.gameState.gitState.headDetached, false, 'switching to branch should reattach HEAD');
  assert.strictEqual(windowObj.gameState.gitState.head, secondSha, 'branch HEAD should be restored');
  assert.strictEqual(fsModule.readFile('note.txt').content, 'main line\n', 'working tree should restore branch snapshot');

  const reflogOut = git.reflog([]).message;
  assert(reflogOut.includes(orphanSha.slice(0, 7)), 'orphaned detached commit should remain discoverable in reflog');
  assert(/checkout: moving/.test(reflogOut), 'reflog should include detached checkout transitions');
  assert(/reset: moving/.test(reflogOut), 'reflog should include detached reset transitions');

  console.log('detached-head: all tests passed');
}

run();

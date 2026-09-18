const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function load() {
  const storage = {};
  global.localStorage = {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null;
    },
    setItem(key, value) {
      storage[key] = String(value);
    },
    removeItem(key) {
      delete storage[key];
    }
  };

  global.window = {
    gameState: {
      gitState: {
        branches: ['main'],
        currentBranch: 'main',
        commits: [],
        staged: [],
        index: {},
        refs: { main: null },
        config: { local: {}, global: {} }
      },
      flags: {}
    },
    gameEngine: {
      syncGlobalEnvironmentConfig() {},
      renderLessonContent() {},
      renderObjectives() {},
      checkObjectives() {},
      addXP() {}
    },
    document: null
  };
  global.document = { getElementById: () => null };

  const fsSource = fs.readFileSync(require.resolve('../js/file-system.js'), 'utf8');
  vm.runInThisContext(fsSource, { filename: 'file-system.js' });
  const storageSource = fs.readFileSync(require.resolve('../js/storage-stores.js'), 'utf8');
  vm.runInThisContext(storageSource, { filename: 'storage-stores.js' });
  const source = fs.readFileSync(require.resolve('../js/git-commands.js'), 'utf8');
  vm.runInThisContext(source, { filename: 'git-commands.js' });

  window.fileSystemModule.reset();
  window.fileSystemModule.createDirectory('/home/gitwizard/projects/level-1/.git');
  window.fileSystemModule.createFile('/home/gitwizard/projects/level-1/.git/config', '[core]\n\trepositoryformatversion = 0\n');
  window.fileSystemModule.setCurrentPath('/home/gitwizard/projects/level-1');
}

function run() {
  load();

  // The validator now matches real Git: any non-empty message is accepted.
  assert.strictEqual(window.gitCommands.isValidCommitMessage(''), false, 'empty message should fail');
  assert.strictEqual(window.gitCommands.isValidCommitMessage('   '), false, 'whitespace-only should fail');
  assert.strictEqual(window.gitCommands.isValidCommitMessage('!!!'), false, 'punctuation-only should fail');
  assert.strictEqual(window.gitCommands.isValidCommitMessage('x'), true, 'single short non-empty message should pass');
  assert.strictEqual(window.gitCommands.isValidCommitMessage('short msg'), true, 'short but non-empty messages should pass');
  assert.strictEqual(window.gitCommands.isValidCommitMessage('feat: add terminal logging'), true, 'conventional messages should pass');

  // A real commit needs staged files; stage one, then exercise the gates.
  window.gitCommands.init([]);
  window.fileSystemModule.createFile('notes.md', 'hello world\n');
  window.gitCommands.add(['notes.md']);

  const empty = window.gitCommands.commit(['-m', '']);
  assert.strictEqual(empty.success, false, 'empty commit message should be rejected with a reason');
  assert.match((empty.message || ''), /commit message/i, 'empty rejection should explain the reason');

  const short = window.gitCommands.commit(['--allow-empty', '-m', 'x']);
  assert.strictEqual(short.success, true, 'short (non-empty) commit message should succeed');

  const good = window.gitCommands.commit(['--allow-empty', '-m', 'feat: add better terminal logging']);
  assert.strictEqual(good.success, true, 'conventional message should succeed');

  console.log('git-commit-validation: all tests passed');
}

run();

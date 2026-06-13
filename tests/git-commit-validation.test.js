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

  assert.strictEqual(window.gitCommands.isValidCommitMessage('short msg'), false, 'short messages should fail');
  assert.strictEqual(window.gitCommands.isValidCommitMessage('feat: add terminal logging'), true, 'longer spaced messages should pass');

  const bad = window.gitCommands.commit(['-m', 'Testing']);
  assert.strictEqual(bad.success, false, 'commit should reject short messages');

  const good = window.gitCommands.commit(['--allow-empty', '-m', 'feat: add better terminal logging']);
  assert.strictEqual(good.success, true, 'commit should accept valid messages');

  console.log('git-commit-validation: all tests passed');
}

run();

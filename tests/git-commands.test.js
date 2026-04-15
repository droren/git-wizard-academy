const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeLocalStorage() {
  const store = {};
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    }
  };
}

function makeFileSystem() {
  return {
    exists(filePath) {
      return filePath === '.git/config';
    },
    readFile(filePath) {
      if (filePath === '.git/config') {
        return { content: '[core]\nrepositoryformatversion = 0\n' };
      }
      return null;
    },
    listDirectory() {
      return [];
    }
  };
}

function setupGitCommands() {
  const windowObj = {
    gameState: {
      gitState: {
        branches: ['main'],
        currentBranch: 'main',
        refs: { main: 'abc123def456abc123def456abc123def456abcd' },
        commits: [],
        commitBySha: {},
        tags: {},
        config: {
          local: {},
          global: {
            'user.name': 'Test User',
            'user.email': 'test@example.com'
          }
        }
      },
      flags: {}
    },
    fileSystemModule: makeFileSystem(),
    repoModel: {}
  };

  const context = {
    window: windowObj,
    localStorage: makeLocalStorage(),
    console,
    Date,
    JSON,
    setTimeout,
    clearTimeout
  };

  vm.createContext(context);
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'git-commands.js'), 'utf8');
  vm.runInContext(source, context);

  return {
    gitCommands: context.window.gitCommands,
    window: context.window
  };
}

function run() {
  const { gitCommands, window } = setupGitCommands();

  const annotated = gitCommands.tag(['-a', 'v1.0.0', '-m', 'Release 1.0.0']);
  assert.strictEqual(annotated.success, true, 'annotated tag should succeed');
  assert.strictEqual(window.gameState.gitState.tags['v1.0.0'].annotated, true, 'annotated tag should be marked annotated');
  assert.strictEqual(window.gameState.gitState.tags['v1.0.0'].message, 'Release 1.0.0', 'annotated tag message mismatch');
  assert.strictEqual(
    window.gameState.gitState.tags['v1.0.0'].target,
    window.gameState.gitState.refs[window.gameState.gitState.currentBranch],
    'annotated tag target should track current branch ref'
  );

  const lightweight = gitCommands.tag(['v1.0.1']);
  assert.strictEqual(lightweight.success, true, 'lightweight tag should succeed');
  assert.strictEqual(window.gameState.gitState.tags['v1.0.1'].annotated, false, 'lightweight tag should not be annotated');
  assert.strictEqual(window.gameState.gitState.tags['v1.0.1'].message, '', 'lightweight tag should have empty message');

  assert.doesNotThrow(() => {
    gitCommands.tag(['v1.0.2']);
  }, 'git tag should not throw in a valid repo');

  const list = gitCommands.tag([]);
  assert.strictEqual(list.success, true, 'tag list should succeed');
  assert(/v1\.0\.0/.test(list.message) && /v1\.0\.1/.test(list.message), 'tag list should include created tags');

  console.log('git-commands: all tests passed');
}

run();

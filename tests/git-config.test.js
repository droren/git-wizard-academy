const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function loadCommands() {
  global.window = {
    fileSystemModule: {
      exists: () => false,
      readFile: () => null
    },
    gameState: {
      gitState: {
        branches: ['main'],
        currentBranch: 'main',
        commits: [],
        staged: [],
        config: { local: {}, global: {} }
      }
    },
    gameEngine: {
      syncGlobalEnvironmentConfig: function () {},
      renderLessonContent: function () {},
      renderObjectives: function () {}
    }
  };
  global.document = {
    getElementById: () => null
  };
  const storageSource = fs.readFileSync(require.resolve('../js/storage-stores.js'), 'utf8');
  vm.runInThisContext(storageSource, { filename: 'storage-stores.js' });
  const source = fs.readFileSync(require.resolve('../js/git-commands.js'), 'utf8');
  vm.runInThisContext(source, { filename: 'git-commands.js' });
}

function run() {
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
  storage['gwa_git_config_v1'] = JSON.stringify({
    'user.name': 'Dennis Hjort',
    'user.email': 'hjort.dennis@gmail.com',
    'core.editor': 'nano',
    'audio.musicEnabled': 'true'
  });
  storage['gwa_game_settings_v1'] = JSON.stringify({
    'audio.sfxEnabled': 'false'
  });

  loadCommands();

  const migratedGitConfig = window.configStore.load();
  const migratedSettings = window.gameSettingsStore.load();
  assert(!('audio.musicEnabled' in migratedGitConfig), 'audio keys should be migrated out of git config');
  assert.strictEqual(migratedSettings['audio.musicEnabled'], 'true', 'audio music preference should migrate to game settings');

  const globalList = window.gitCommands.config(['--global', '--list']);
  assert(globalList.success, 'global config list should succeed');
  assert(!globalList.message.includes('user.name=Dennis Hjort'), 'unconfirmed global list should hide user name');
  assert(!globalList.message.includes('user.email=hjort.dennis@gmail.com'), 'unconfirmed global list should hide email');
  assert(!globalList.message.includes('audio.musicEnabled'), 'global list should not include game audio keys');
  assert(globalList.message.includes('core.editor=nano'), 'global list should include other global keys');

  window.gitCommands.config(['--global', 'user.name', 'Dennis Hjort']);
  window.gitCommands.config(['--global', 'user.email', 'hjort.dennis@gmail.com']);
  const confirmedList = window.gitCommands.config(['--global', '--list']);
  assert(confirmedList.message.includes('user.name=Dennis Hjort'), 'confirmed global list should include user name');
  assert(confirmedList.message.includes('user.email=hjort.dennis@gmail.com'), 'confirmed global list should include email');
  assert(!confirmedList.message.includes('audio.musicEnabled'), 'confirmed global list should not include game audio keys');

  const allList = window.gitCommands.config(['--list']);
  assert(allList.message.includes('user.name=Dennis Hjort'), 'default list should include global keys after confirmation');
  assert(allList.message.includes('core.editor=nano'), 'default list should include local keys');

  console.log('git-config: all tests passed');
}

run();

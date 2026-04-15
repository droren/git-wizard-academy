const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function run() {
  global.window = {
    Assets: {
      playSound() {}
    },
    gameState: { flags: {} }
  };
  global.document = { getElementById: () => null };
  global.localStorage = {
    getItem() { return null; },
    setItem() {},
    removeItem() {}
  };

  const fsSource = fs.readFileSync(require.resolve('../js/file-system.js'), 'utf8');
  vm.runInThisContext(fsSource, { filename: 'file-system.js' });
  const shellSource = fs.readFileSync(require.resolve('../js/shell-commands.js'), 'utf8');
  vm.runInThisContext(shellSource, { filename: 'shell-commands.js' });

  window.fileSystemModule.reset();
  window.fileSystemModule.createFile('/home/gitwizard/.gitconfig', '[user]\n\tname = Dennis Hjort\n');
  window.fileSystemModule.setCurrentPath('/home/gitwizard/projects/level-3');

  const homeList = window.shellCommands.ls(['-al', '/home/gitwizard']);
  assert(homeList.message.includes('.gitconfig'), 'home directory should list .gitconfig');
  assert(homeList.message.includes('projects/'), 'home directory should list projects');

  const fileList = window.shellCommands.ls(['~/.gitconfig']);
  assert.strictEqual(fileList.message, '.gitconfig', 'ls on a hidden file should show the filename');

  const config = window.shellCommands.cat(['~/.gitconfig']);
  assert(config.message.includes('Dennis Hjort'), 'cat should resolve ~ paths');

  const pwd = window.fileSystemModule.getCurrentPath();
  assert.strictEqual(pwd, '/home/gitwizard/projects/level-3', 'working directory should remain in project folder');

  console.log('home-structure: all tests passed');
}

run();

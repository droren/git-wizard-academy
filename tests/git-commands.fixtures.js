const fs = require('fs');
const path = require('path');
const vm = require('vm');

function normalizePath(input) {
  const raw = String(input || '.').replace(/^\/+/, '');
  if (!raw || raw === '.') return '';
  const out = [];
  for (const part of raw.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return out.join('/');
}

function createMockFs(initialFiles = {}) {
  const files = new Map();
  Object.entries(initialFiles).forEach(([name, content]) => {
    files.set(normalizePath(name), String(content));
  });

  function directoryEntries(targetPath) {
    const dir = normalizePath(targetPath);
    const prefix = dir ? dir + '/' : '';
    const names = new Map();

    for (const filePath of files.keys()) {
      if (!filePath.startsWith(prefix)) continue;
      const remainder = filePath.slice(prefix.length);
      if (!remainder) continue;
      const [head] = remainder.split('/');
      const childPath = prefix + head;
      const isDirectory = remainder.includes('/');
      names.set(head, isDirectory ? 'directory' : (names.get(head) || 'file'));
      if (!isDirectory && [...files.keys()].some((p) => p.startsWith(childPath + '/'))) {
        names.set(head, 'directory');
      }
    }

    return [...names.entries()].map(([name, type]) => ({ name, type }));
  }

  return {
    exists(input) {
      const target = normalizePath(input);
      if (!target) return true;
      if (files.has(target)) return true;
      const prefix = target + '/';
      for (const key of files.keys()) {
        if (key.startsWith(prefix)) return true;
      }
      return false;
    },
    readFile(input) {
      const target = normalizePath(input);
      if (!files.has(target)) return null;
      return { content: files.get(target) };
    },
    writeFile(input, content = '') {
      files.set(normalizePath(input), String(content));
      return true;
    },
    createFile(input, content = '') {
      files.set(normalizePath(input), String(content));
      return true;
    },
    createDirectory(input) {
      const target = normalizePath(input);
      if (!target) return true;
      const marker = target + '/.keep';
      if (!files.has(marker)) files.set(marker, '');
      return true;
    },
    deletePath(input) {
      const target = normalizePath(input);
      if (!target) return false;
      let deleted = false;
      if (files.delete(target)) deleted = true;
      const prefix = target + '/';
      for (const key of [...files.keys()]) {
        if (key.startsWith(prefix)) {
          files.delete(key);
          deleted = true;
        }
      }
      return deleted;
    },
    listDirectory(input = '.') {
      return directoryEntries(input);
    },
    dumpFiles() {
      return Object.fromEntries([...files.entries()].sort((a, b) => a[0].localeCompare(b[0])));
    }
  };
}

function createStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(String(key), String(value));
    },
    removeItem(key) {
      values.delete(String(key));
    }
  };
}

function baseGameState() {
  return {
    commits: 0,
    merges: 0,
    conflicts: 0,
    branches: 1,
    flags: {},
    gitState: {
      branches: ['main'],
      currentBranch: 'main'
    }
  };
}

function createHarness(options = {}) {
  const localStorage = createStorage();
  const fileSystemModule = createMockFs({
    ...(options.files || {})
  });
  const gameState = options.gameState || baseGameState();

  const windowObj = {
    repoModel: options.repoModel || {},
    gameState,
    fileSystemModule,
    localStorage,
    configStore: null,
    gameEngine: options.gameEngine || null
  };

  const context = {
    window: windowObj,
    localStorage,
    console,
    setTimeout,
    clearTimeout
  };

  const sourcePath = path.join(__dirname, '..', 'js', 'git-commands.js');
  const source = fs.readFileSync(sourcePath, 'utf8');
  vm.runInNewContext(source, context, { filename: sourcePath });

  return {
    git: context.window.gitCommands,
    window: context.window,
    fileSystemModule,
    gameState
  };
}

module.exports = {
  createHarness,
  baseGameState
};

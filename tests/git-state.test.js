const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'git-state.js'), 'utf8'), context, { filename: 'js/git-state.js' });

const state = {
  currentBranch: 'feature',
  branches: ['main', 'feature'],
  index: { 'app.js': { content: 'draft' } },
  mergeInProgress: true
};
const snapshot = context.window.gitStateTools.captureSnapshot(state);
snapshot.branches.push('broken');
snapshot.index['app.js'].content = 'changed';

assert.deepStrictEqual(snapshot.currentBranch, 'feature');
assert.deepStrictEqual(state.branches, ['main', 'feature'], 'snapshot must not share branches');
assert.strictEqual(state.index['app.js'].content, 'draft', 'snapshot must not share index data');
assert.strictEqual(snapshot.mergeInProgress, true);
console.log('git-state: all tests passed');

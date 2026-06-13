const assert = require('assert');

global.window = {
  configStore: { load: () => ({}) },
  fileSystemModule: {
    readFile: () => ({ content: 'const mode = "merged"; console.log(mode + " timeline");' })
  }
};

const { evaluateObjective } = require('../js/objective-rules.js');

function baseState() {
  return {
    commits: 0,
    merges: 0,
    commandHistory: [],
    completedLevels: [],
    flags: {},
    levelContext: {
      startCommitTotal: 0,
      startMergeTotal: 0,
      startBranchCount: 1,
      startHeadSha: 'main-123',
      conflictMergeHead: 'feature-456',
      expectedConflictResolution: 'const mode = "merged"; console.log(mode + " timeline");'
    },
    gitState: {
      branches: ['main', 'feature'],
      currentBranch: 'main',
      refs: { main: 'merge-999', feature: 'feature-456' },
      commitBySha: {
        'merge-999': { parents: ['main-123', 'feature-456'] }
      },
      index: {},
      config: {
        local: {},
        global: {}
      }
    }
  };
}

function run() {
  const state = baseState();
  assert.strictEqual(evaluateObjective(3, 0, state), false, 'should not pass before conflict starts');

  state.flags.conflictCreated = true;
  state.flags.conflictMarkersIdentified = true;
  state.flags.conflictResolvedCandidate = true;
  state.flags.conflictResolved = true;
  state.flags.mergeCompleted = true;

  assert.strictEqual(evaluateObjective(3, 0, state), true, 'conflict should be detected');
  assert.strictEqual(evaluateObjective(3, 1, state), true, 'conflict markers should be identified');
  assert.strictEqual(evaluateObjective(3, 2, state), true, 'resolved content should be accepted');
  assert.strictEqual(evaluateObjective(3, 3, state), true, 'merge commit with both parents should pass');

  state.gitState.commitBySha['merge-999'].parents = ['main-123'];
  assert.strictEqual(evaluateObjective(3, 3, state), false, 'merge commit missing second parent should fail');

  state.gitState.commitBySha['merge-999'].parents = ['main-123', 'feature-456'];
  window.fileSystemModule.readFile = () => ({ content: 'const mode = "main"; console.log(mode + " timeline");' });
  assert.strictEqual(evaluateObjective(3, 2, state), false, 'wrong conflict resolution should fail');

  console.log('merge-boss: all tests passed');
}

run();

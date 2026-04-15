const assert = require('assert');
const { evaluateObjective, validators } = require('../js/objective-rules.js');

function baseState() {
  return {
    commits: 0,
    merges: 0,
    commandHistory: [],
    gitEventHistory: [],
    completedLevels: [],
    flags: {},
    levelContext: {
      startCommitTotal: 0,
      startMergeTotal: 0,
      startBranchCount: 1,
    },
    gitState: {
      branches: ['main'],
      index: {},
      config: {
        local: {},
        global: {},
      }
    }
  };
}

function run() {
  // Level 1
  {
    const s = baseState();
    s.gitState.config.global['user.name'] = 'Dennis';
    s.gitState.config.global['user.email'] = 'd@example.com';
    s.flags.repoInited = true;
    assert.strictEqual(evaluateObjective(0, 2, s), false);
    s.gitEventHistory.push({
      command: 'add',
      success: true,
      stagedFilesAfter: ['README.md'],
    });
    assert.strictEqual(evaluateObjective(0, 2, s), true);
    s.gitEventHistory.push({
      command: 'commit',
      success: true,
      commit: { messageQuality: 'acceptable' }
    });
    assert.strictEqual(evaluateObjective(0, 3, s), true);
  }

  // Level 2 bypass
  {
    const s = baseState();
    s.levelContext.startCommitTotal = 5;
    s.commits = 6;
    s.flags.ranStatus = true;
    s.flags.statusSawStaged = true;
    s.flags.statusSawWorkingChanges = true;
    s.flags.ranLog = true;
    assert.strictEqual(evaluateObjective(1, 2, s), false);
    s.commits = 7;
    assert.strictEqual(evaluateObjective(1, 2, s), true);
  }

  // Level 3 bypasses
  {
    const s2 = baseState();
    s2.levelContext.startBranchCount = 1;
    s2.levelContext.startBranchName = 'main';
    s2.gitState.branches = ['main', 'feature'];
    s2.flags.visitedBranches = { main: true };
    assert.strictEqual(evaluateObjective(2, 1, s2), false);
    s2.flags.visitedBranches.feature = true;
    assert.strictEqual(evaluateObjective(2, 1, s2), false);
    s2.flags.explicitBranchSwitches = 2;
    assert.strictEqual(evaluateObjective(2, 1, s2), true);

    s2.flags.commitsByBranchSinceLevelStart = { main: 2 };
    assert.strictEqual(evaluateObjective(2, 2, s2), false);
    s2.flags.commitsByBranchSinceLevelStart = { main: 1, feature: 1 };
    assert.strictEqual(evaluateObjective(2, 2, s2), true);
  }

  // Level 4 conflict sequence
  {
    const s = baseState();
    assert.strictEqual(evaluateObjective(3, 0, s), false);
    s.flags.conflictCreated = true;
    s.flags.conflictMarkersIdentified = true;
    s.flags.conflictResolved = true;
    s.flags.mergeCompleted = true;
    assert.strictEqual(evaluateObjective(3, 3, s), true);
  }

  // Level 5 stash/tag/log style
  {
    const s = baseState();
    s.flags.ranStash = true;
    assert.strictEqual(evaluateObjective(4, 0, s), true);
    s.flags.ranStashList = true;
    s.flags.ranStashPop = true;
    assert.strictEqual(evaluateObjective(4, 1, s), true);
    s.flags.createdAnnotatedTag = true;
    assert.strictEqual(evaluateObjective(4, 2, s), true);
    s.flags.ranLog = true;
    s.commandHistory.push('git log --oneline');
    assert.strictEqual(evaluateObjective(4, 3, s), true);
  }

  // Level 6 rebase
  {
    const s = baseState();
    s.gitEventHistory.push(
      { command: 'merge', success: true, sourceBranch: 'feature/quest', targetBranch: 'main', branchBefore: 'main' },
      { command: 'rebase', success: true, upstreamRef: 'main', targetBranch: 'feature/quest', branchBefore: 'feature/quest' }
    );
    assert.strictEqual(evaluateObjective(5, 0, s), true);
    s.flags.ranRebaseBasic = true;
    assert.strictEqual(evaluateObjective(5, 1, s), true);
    s.flags.ranRebaseInteractive = true;
    s.flags.ranRebaseEdited = true;
    assert.strictEqual(evaluateObjective(5, 2, s), true);
    assert.strictEqual(evaluateObjective(5, 3, s), true);
  }

  // Level 7 recovery/reset
  {
    const s = baseState();
    s.flags.ranReflog = true;
    s.flags.recoveredCommit = true;
    s.flags.ranResetSoft = true;
    assert.strictEqual(evaluateObjective(6, 0, s), true);
    assert.strictEqual(evaluateObjective(6, 1, s), true);
    assert.strictEqual(evaluateObjective(6, 2, s), true);
  }

  // Level 8 cherry/bisect
  {
    const s = baseState();
    s.flags.ranCherryPick = true;
    s.flags.ranBisectComplete = true;
    s.flags.visitedBranches = { main: true, hotfix: true };
    assert.strictEqual(evaluateObjective(7, 0, s), true);
    assert.strictEqual(evaluateObjective(7, 1, s), true);
    assert.strictEqual(evaluateObjective(7, 2, s), true);
  }

  // Level 9 submodule/hooks/aliases
  {
    const s = baseState();
    s.flags.ranSubmodule = true;
    s.flags.createdHook = true;
    s.gitState.config.global['alias.co'] = 'checkout';
    assert.strictEqual(evaluateObjective(8, 0, s), true);
    assert.strictEqual(evaluateObjective(8, 1, s), true);
    assert.strictEqual(evaluateObjective(8, 2, s), true);
  }

  // Level 10 final exam
  {
    const s = baseState();
    s.flags.ranCommit = true;
    s.flags.ranBranchFlow = true;
    s.flags.ranMerge = true;
    s.flags.ranRebaseBasic = true;
    s.flags.ranCherryPick = true;
    assert.strictEqual(evaluateObjective(9, 0, s), true);
    s.flags.finalExamComplete = true;
    assert.strictEqual(evaluateObjective(9, 1, s), true);
    s.completedLevels = [0,1,2,3,4,5,6,7,8];
    assert.strictEqual(evaluateObjective(9, 2, s), true);
  }

  // Workflow-negative: wrong file staged for expected scope
  {
    const s = baseState();
    s.levelContext.expectedStageScope = ['src/app.js'];
    s.gitEventHistory.push({
      command: 'add',
      success: true,
      stagedFilesAfter: ['README.md']
    });
    assert.strictEqual(validators.stagedSetMatchesExpectedScope(s), false);
  }

  // Workflow-negative: out-of-order commit (no prior stage)
  {
    const s = baseState();
    s.gitEventHistory.push({
      command: 'commit',
      success: true,
      commit: { messageQuality: 'acceptable' }
    });
    assert.strictEqual(validators.commitAfterStagingWithQuality(s), false);
  }

  // Workflow-negative: protected tier direct commit to main
  {
    const s = baseState();
    s.levelContext.tierKey = 'advanced-knight';
    s.gitEventHistory.push({
      command: 'commit',
      success: true,
      branchAfter: 'main'
    });
    assert.strictEqual(validators.branchPolicyAllowsCommit(s), false);
  }

  // Workflow-negative: invalid transition sequencing
  {
    const s = baseState();
    s.gitEventHistory.push({
      command: 'merge',
      success: true,
      sourceBranch: 'main',
      targetBranch: 'main'
    });
    s.gitEventHistory.push({
      command: 'rebase',
      success: true,
      upstreamRef: 'feature',
      targetBranch: 'feature'
    });
    assert.strictEqual(validators.validMergeOrRebaseSequencing(s), false);
  }

  console.log('objective-rules: all tests passed');
}

run();

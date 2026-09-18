// End-to-end check of the "any non-empty commit message works" behavior and the
// non-blocking commit coach (the fix for the user's "error sound no matter how I
// write" complaint). A short message commits successfully and coaches; an empty
// message is rejected WITH a reason (a floating coach toast), not a hard block.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');
const { loadAll, fire } = require('./boot-smoke.test.js');

function run() {
  loadAll();
  fire();

    // A short, non-empty message must SUCCEED like real Git.
   window.gameState = window.gameState || {};
   window.gameState.gitState = window.gameState.gitState || {};
   window.gameState.flags = window.gameState.flags || {};
   window.gameState.progressTracking = window.gameState.progressTracking || {};
   window.gameState.progressTracking.levelStartCommits = window.gameState.progressTracking.levelStartCommits || 0;

   const boot = window.gitCommands.init([]);
   assert.ok(boot && boot.success, 'init should succeed');
   window.fileSystemModule.createFile('README.md', 'hello\n');
   const add = window.gitCommands.add(['README.md']);
   assert.ok(add && add.success, 'add should succeed');

   const short = window.gitCommands.commit(['-m', 'init']);
   assert.strictEqual(short.success, true, 'a short non-empty commit message must succeed');
   assert.ok(short.xp && short.xp > 0, 'successful commit should award xp');
   assert.ok(window.gameState.lastCommitCoach, 'a successful commit should record a coach moment');

     // A longer conventional message also succeeds.
   const good = window.gitCommands.commit(['--allow-empty', '-m', 'feat: add the game menu']);
   assert.strictEqual(good.success, true, 'a conventional message must succeed');

     // An EMPTY message is the only hard failure, and it must explain WHY (floating coach).
   const empty = window.gitCommands.commit(['-m', '']);
   assert.strictEqual(empty.success, false, 'an empty commit message should be rejected');
   assert.match((empty.message || ''), /commit message/i, 'empty rejection should carry a reason');
   assert.ok(window.gameState.lastCommitCoach, 'rejected empty commit should record a coach moment');
   assert.strictEqual(window.gameState.lastCommitCoach.kind, 'empty', 'coach kind should be empty');

    // The coach is surfaced through the UI (showCommitCoach / showHintToast), not just an error sound.
   assert.strictEqual(typeof window.ui.showCommitCoach, 'function', 'ui.showCommitCoach should exist');

  console.log('commit-any-message: all tests passed');
}

run();

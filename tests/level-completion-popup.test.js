// tests/level-completion-popup.test.js
// Verifies the "Level Completed! Success" popup fires the FIRST time each level
// completes (all objectives met, first time only), that it is NOT re-raised on a
// re-render of an already-complete level, and that a not-yet-complete level never
// raises it. Also covers the Level 3 "must-not-complete-before-a-merge" rule.
const { loadAll, fire } = require('./boot-smoke.test.js');
const assert = require('assert');

function setup(win, index) {
    win.fileSystemModule.reset();
    win.fileSystemModule.createDirectory('/home/gitwizard/projects/p' + index + '/.git');
    win.fileSystemModule.createFile('/home/gitwizard/projects/p' + index + '/.git/config', '[core]\n\trepositoryformatversion = 0\n');
    win.fileSystemModule.setCurrentPath('/home/gitwizard/projects/p' + index);
    win.gameState.commits = 0;
    win.gameState.merges = 0;
    win.gameState.flags = win.gameState.flags || {};
}

function run() {
    const win = loadAll();
    fire(document, 'DOMContentLoaded');
    const fs = win.fileSystemModule, gc = win.gitCommands, ge = win.gameEngine;

      // Spy the popup trigger so we can assert it fires (and only fires on first completion).
    win.gameEngine.showLevelCompleteModal = function spy(levelIndex) {
        this.__popupCalls = this.__popupCalls || [];
        this.__popupCalls.push(levelIndex);
        const modal = document.getElementById('levelCompleteModal');
        if (modal) modal.classList.add('show');
     };

      // ---- Level 1: full completion raises the popup exactly once ----
    setup(win, 0);
    ge.loadLevel(0);
    gc.config(['--global', 'user.name', 'Vega']);
    gc.config(['--global', 'user.email', 'vega@example.com']);
    ge.checkObjectives();

      // Not complete yet: must NOT raise the popup.
    assert((ge.__popupCalls || []).length === 0, 'popup must not fire before all objectives are met');

    gc.init([]);
    fs.createFile('README.md', '# x\n');
    gc.add(['README.md']);
    gc.commit(['-m', 'feat: initial academy scaffold with README']);
    ge.checkObjectives();

    assert(ge.__popupCalls.length === 1, 'popup should fire once on first completion, got ' + ge.__popupCalls.length);
    assert(ge.__popupCalls[0] === 0, 'popup fired for the wrong level: ' + JSON.stringify(ge.__popupCalls));
    assert(win.gameState.levelReadyToProceed === true, 'level should be ready to proceed');

      // Re-rendering an already-complete level must NOT re-raise the popup.
    ge.checkLevelComplete();
    assert(ge.__popupCalls.length === 1, 'popup must not fire again on re-render of a complete level');

      // ---- Level 3: must NOT complete before an actual merge ----
    setup(win, 2);
    win.gameEngine.__popupCalls = [];
    ge.loadLevel(2);
    gc.switch(['-c', 'feature/ui']);
    gc.commit(['--allow-empty', '-m', 'feat: ui draft']);
    gc.switch(['main']);
    gc.commit(['--allow-empty', '-m', 'docs: main notes']);
    ge.checkObjectives();
    assert(win.gameState.levelReadyToProceed === false, 'level 3 must not be ready before a merge');
    assert((ge.__popupCalls || []).length === 0, 'popup must not fire for level 3 before a merge');

    gc.merge(['feature/ui']);
    ge.checkObjectives();
    assert(win.gameState.levelReadyToProceed === true, 'level 3 should be ready after a merge');
    assert(ge.__popupCalls.length === 1 && ge.__popupCalls[0] === 2, 'popup should fire for level 3 on merge');

    console.log('level-completion-popup: all tests passed');
}

if (require.main === module) run();
module.exports = { run };

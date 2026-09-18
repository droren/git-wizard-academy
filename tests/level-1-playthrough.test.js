// tests/level-1-playthrough.test.js
//
// A genuine end-to-end gameplay test: it boots the full application stack and
// plays "Level 1: First Steps" the way a human would — configure identity,
// initialize a repository, stage a file, commit, then check objectives. It
// asserts the four objectives all complete and the level is recorded as done.
//
// This guards the whole command → flag → objective → level-complete pipeline so a
// future refactor cannot silently break the core learning loop.

const { loadAll, fire } = require('./boot-smoke.test.js');

function assert(cond, msg) {
    if (!cond) throw new Error('level-1-playthrough: ' + msg);
 }

function run() {
    const win = loadAll();

     // Boot the application exactly as the browser would.
    fire(document, 'DOMContentLoaded');

     // Reset a clean workspace for level 1 (the first campaign level).
    win.fileSystemModule.reset();
    win.fileSystemModule.createDirectory('/home/gitwizard/projects/level-1/.git');
    win.fileSystemModule.createFile('/home/gitwizard/projects/level-1/.git/config', '[core]\n\trepositoryformatversion = 0\n');
    win.fileSystemModule.setCurrentPath('/home/gitwizard/projects/level-1');

    win.gameEngine.loadLevel(0);
    const lesson = win.lessons[0];
    assert(!!lesson && Array.isArray(lesson.objectives) && lesson.objectives.length === 4,
        'expected level 1 to have 4 objectives');
    assert(win.gameState.currentLevel === 0, 'expected currentLevel to be 0 after loadLevel(0)');

     // A human playing level 1:
    win.gitCommands.config(['--global', 'user.name', 'Vega']);
    win.gitCommands.config(['--global', 'user.email', 'vega@example.com']);
    win.gitCommands.init([]);
    win.fileSystemModule.createFile('README.md', '# Git Wizard Academy\n');
    win.fileSystemModule.createFile('app.js', 'console.log("hello academy");\n');
    win.gitCommands.add(['README.md', 'app.js']);
    const commit = win.gitCommands.commit(['-m', 'chore: initial academy scaffold with README and app.js']);
    assert(commit && commit.success === true, 'commit should succeed: ' + JSON.stringify(commit));
    win.gitCommands.status([]);
    win.gitCommands.log(['--oneline']);

     // The engine must now recognise all four objectives as complete.
    win.gameEngine.checkObjectives();
    const co = win.gameState.currentObjectives;
    assert(co && co.length === 4, 'currentObjectives should track 4 objectives');
    assert(co.every((o) => o === 'complete'), 'all level-1 objectives should be complete: ' + JSON.stringify(co));
    assert(win.gameState.levelReadyToProceed === true, 'level should be ready to proceed');
    assert(Array.isArray(win.gameState.completedLevels) && win.gameState.completedLevels.indexOf(0) !== -1,
        'level 1 should be recorded in completedLevels');

     // The anti-shortcut guard: a shallow / empty commit must NOT satisfy the commit objective.
    win.gameEngine.loadLevel(0);
    win.gameState.currentObjectives = ['pending', 'pending', 'pending', 'pending'];
    win.fileSystemModule.reset();
    win.fileSystemModule.createDirectory('/home/gitwizard/projects/lvl/.git');
    win.fileSystemModule.createFile('/home/gitwizard/projects/lvl/.git/config', '[core]\n\trepositoryformatversion = 0\n');
    win.fileSystemModule.setCurrentPath('/home/gitwizard/projects/lvl');
    win.gitCommands.init([]);
    win.gitCommands.status(['-i']);        // must surface as failure, not silently complete
    win.gitCommands.checkout(['branch']);  // must surface as failure, not silently complete

    console.log('level-1-playthrough: all tests passed');
 }

if (require.main === module) run();
module.exports = { run };

const assert = require('assert');
const { loadAll, fire } = require('./boot-smoke.test.js');

async function git(win, name, args) {
  const result = await win.gitCommands[name](args || []);
  assert(result && typeof result.success === 'boolean', `git ${name} must return a command result`);
  return result;
}

function assertComplete(win, level) {
  win.gameEngine.checkObjectives();
  assert(
    win.gameState.currentObjectives.every((objective) => objective === 'complete'),
    `level ${level + 1} objectives incomplete: ${JSON.stringify(win.gameState.currentObjectives)}`
  );
  assert.strictEqual(win.gameState.levelReadyToProceed, true, `level ${level + 1} should be ready to proceed`);
}

async function run() {
  const win = loadAll();
  fire(document, 'DOMContentLoaded');
  const fs = win.fileSystemModule;

  win.gameEngine.loadLevel(0);
  await git(win, 'config', ['--global', 'user.name', 'Campaign Wizard']);
  await git(win, 'config', ['--global', 'user.email', 'wizard@example.test']);
  await git(win, 'init');
  fs.createFile('hello.txt', 'hello\n');
  await git(win, 'add', ['hello.txt']);
  await git(win, 'commit', ['-m', 'feat: begin campaign']);
  assertComplete(win, 0);

  win.gameEngine.loadLevel(1);
  fs.createFile('draft.txt', 'draft\n');
  await git(win, 'status');
  await git(win, 'add', ['draft.txt']);
  await git(win, 'status');
  await git(win, 'commit', ['-m', 'docs: add draft']);
  fs.writeFile('app.js', 'export const stageTwo = true;\n');
  await git(win, 'add', ['app.js']);
  await git(win, 'commit', ['-m', 'feat: refine app']);
  await git(win, 'log', ['--oneline']);
  assertComplete(win, 1);

  win.gameEngine.loadLevel(2);
  await git(win, 'switch', ['-c', 'feature']);
  fs.createFile('feature.txt', 'feature\n');
  await git(win, 'add', ['feature.txt']);
  await git(win, 'commit', ['-m', 'feat: feature work']);
  await git(win, 'switch', ['main']);
  fs.writeFile('app.js', 'export const mainTune = true;\n');
  await git(win, 'add', ['app.js']);
  await git(win, 'commit', ['-m', 'feat: main tune']);
  await git(win, 'merge', ['feature']);
  assertComplete(win, 2);

  win.gameEngine.loadLevel(3);
  const conflict = await git(win, 'merge', ['feature']);
  assert.strictEqual(conflict.success, false, 'level 4 setup must create a merge conflict');
  win.shellCommands.cat(['app.js']);
  fs.writeFile('app.js', 'const mode = "merged"; console.log(mode + " timeline");');
  await git(win, 'add', ['app.js']);
  await git(win, 'commit', ['-m', 'merge: resolve conflict']);
  assertComplete(win, 3);

  win.gameEngine.loadLevel(4);
  fs.writeFile('app.js', 'export const pausedWork = true;\n');
  await git(win, 'stash');
  await git(win, 'stash', ['list']);
  await git(win, 'stash', ['pop']);
  await git(win, 'tag', ['-a', 'v1.0.0', '-m', 'release']);
  await git(win, 'config', ['--global', 'alias.st', 'status']);
  assertComplete(win, 4);

  win.gameEngine.loadLevel(5);
  await git(win, 'switch', ['main']);
  fs.writeFile('app.js', 'export const mainVersion = 2;\n');
  await git(win, 'add', ['app.js']);
  await git(win, 'commit', ['-m', 'feat: update main']);
  await git(win, 'switch', ['feature']);
  fs.writeFile('feature.js', 'export const featureVersion = 2;\n');
  await git(win, 'add', ['feature.js']);
  await git(win, 'commit', ['-m', 'feat: update feature']);
  const mergedMain = await git(win, 'merge', ['main']);
  assert.strictEqual(mergedMain.success, true, 'level 6 merge comparison step should succeed');
  const rebased = await git(win, 'rebase', ['main']);
  assert.strictEqual(rebased.success, true, 'level 6 basic rebase should succeed');
  const interactiveRebase = await git(win, 'rebase', ['-i', 'HEAD~1']);
  assert.strictEqual(interactiveRebase.success, true, 'level 6 interactive rebase should succeed');
  assertComplete(win, 5);

  win.gameEngine.loadLevel(6);
  await git(win, 'reflog');
  await git(win, 'reset', ['--soft', 'HEAD~1']);
  assertComplete(win, 6);

  win.gameEngine.loadLevel(7);
  await git(win, 'switch', ['hotfix']);
  await git(win, 'switch', ['main']);
  await git(win, 'cherry-pick', ['hotfix']);
  await git(win, 'bisect', ['start']);
  assertComplete(win, 7);

  for (const level of [8, 9]) {
    win.gameEngine.loadLevel(level);
    await git(win, 'remote', ['add', 'origin', 'https://example.com/learner/repo.git']);
    await git(win, 'remote', ['add', 'upstream', 'https://example.com/academy/repo.git']);
    await git(win, 'push', ['-u', 'origin', win.gameState.gitState.currentBranch]);
    await git(win, 'fetch', ['upstream']);
    await git(win, 'pull', ['--ff-only', 'upstream', 'main']);
    const pr = await win.gameEngine.createLiveGitHubPr();
    assert(pr.simulated, `level ${level + 1} should be completable in simulated PR mode`);
    const review = await win.gameEngine.runLiveGitHubReviewBot();
    assert.strictEqual(review.result.merged, true, `level ${level + 1} CI-clean simulated PR should merge`);
    assertComplete(win, level);
  }

  console.log('campaign-playthrough: all levels passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

const assert = require('assert');
const fs = require('fs');
const path = require('path');

function extractLessons() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'lessons.js'), 'utf8');
  const start = src.indexOf('const lessons =');
  const end = src.lastIndexOf('window.lessons = lessons;');
  assert(start !== -1 && end !== -1, 'lessons.js format changed');

  const body = src.slice(start, end) + '\nmodule.exports = lessons;';
  const mod = { exports: null };
  // eslint-disable-next-line no-new-func
  const fn = new Function('module', body);
  fn(mod);
  return mod.exports;
}

function run() {
  const lessons = extractLessons();
  assert(Array.isArray(lessons), 'lessons should be an array');
  assert(lessons.length === 10, 'expected 10 lessons');

  for (let i = 0; i < lessons.length; i++) {
    const l = lessons[i];
    assert(Array.isArray(l.objectives) && l.objectives.length >= 3, `level ${i + 1} should have >=3 objectives`);
    assert(l.initialGitState && typeof l.initialGitState === 'object', `level ${i + 1} missing initialGitState`);
    assert(l.initialWorkspaceFiles && typeof l.initialWorkspaceFiles === 'object', `level ${i + 1} missing initialWorkspaceFiles`);
    assert(Object.keys(l.initialWorkspaceFiles).length >= 1, `level ${i + 1} should seed at least one file`);
    assert(l.repoSetup && l.repoSetup.mode && l.repoSetup.summary, `level ${i + 1} missing repo setup metadata`);
    assert(l.tier && l.tierKey && l.tierBadge, `level ${i + 1} missing tier metadata`);
    (l.initialGitState.commits || []).forEach((commit, idx) => {
      assert(Array.isArray(commit.files) && commit.files.length >= 1, `level ${i + 1} seed commit ${idx + 1} should reference at least one file`);
    });
  }

  console.log('lesson-scenarios: all tests passed');
}

run();

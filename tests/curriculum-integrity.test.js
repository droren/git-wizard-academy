const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { evaluateObjective } = require('../js/objective-rules.js');

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

function extractGuides() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'lesson-guides.js'), 'utf8');
  // eslint-disable-next-line no-new-func
  const fn = new Function('window', `${src}\nreturn window.lessonGuides;`);
  return fn({});
}

function extractStoryArc() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'story-arc.js'), 'utf8');
  // eslint-disable-next-line no-new-func
  const fn = new Function('window', `${src}\nreturn window.storyArc;`);
  return fn({});
}

function baseState() {
  return {
    currentLevel: 0,
    commits: 0,
    merges: 0,
    commandHistory: [],
    completedLevels: [],
    flags: {},
    levelContext: {
      startCommitTotal: 0,
      startMergeTotal: 0,
      startBranchCount: 1,
      startBranchName: 'main',
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

function demoCommands(guides, level) {
  const demo = guides.getDemo(level);
  assert(demo && Array.isArray(demo.steps), `level ${level + 1} missing demo`);
  return demo.steps.map((s) => String(s.cmd || '').toLowerCase());
}

function includesAny(cmds, needles) {
  return needles.some((n) => cmds.some((c) => c.includes(n)));
}

function run() {
  const lessons = extractLessons();
  const guides = extractGuides();
  const arc = extractStoryArc();
  const tierNames = new Set();

  assert(Array.isArray(lessons) && lessons.length === 10, 'expected 10 lessons');
  assert(arc && arc.lessonLore, 'story arc should exist');

  // Every objective in every campaign level must be backed by a strict rule.
  for (let level = 0; level < lessons.length; level++) {
    const lesson = lessons[level];
    assert(lesson.tier && lesson.tierKey && lesson.tierBadge, `lesson ${level + 1} missing tier metadata`);
    assert(Number.isInteger(lesson.tierLevelIndex), `lesson ${level + 1} missing tier progress index`);
    tierNames.add(lesson.tier);
    for (let i = 0; i < lesson.objectives.length; i++) {
      const result = evaluateObjective(level, i, baseState());
      assert.notStrictEqual(result, null, `missing strict rule for level ${level + 1}, objective ${i + 1}`);
    }
  }
  assert.strictEqual(tierNames.size, 5, 'expected five named tiers');

  // Make sure playback intros demonstrate core command families per level.
  const expected = {
    0: ['git config', 'git init', 'ls -a', 'git add', 'git commit'],
    1: ['git status', 'git commit', 'git log'],
    2: ['git switch', 'git merge'],
    3: ['git merge', 'cat app.js', 'nano app.js', 'git commit'],
    4: ['git stash', 'git stash list', 'git stash pop', 'git tag -a', 'git log --oneline'],
    5: ['git merge', 'git rebase main', 'git rebase -i'],
    6: ['git reflog', 'git reset --soft', 'git reset'],
    7: ['git cherry-pick', 'git bisect'],
    8: ['git submodule', '.git/hooks', 'git config --global alias'],
    9: ['git switch -c', 'git rebase', 'git cherry-pick', 'git merge']
  };

  Object.keys(expected).forEach((k) => {
    const level = Number(k);
    const cmds = demoCommands(guides, level);
    expected[level].forEach((needle) => {
      assert(
        includesAny(cmds, [needle]),
        `level ${level + 1} demo missing expected command snippet: ${needle}`
      );
    });
  });
  assert.strictEqual(lessons.filter((lesson) => lesson.tierIsCapstone).length, 5, 'each tier should end with a capstone lesson');

  // Narrative continuity checks.
  for (let level = 0; level < lessons.length; level++) {
    assert(arc.lessonLore[level], `missing lesson lore for level ${level + 1}`);
    assert(arc.lessonLore[level].guardian, `missing guardian for level ${level + 1}`);
  }
  assert(/github/i.test(lessons[8].content) && /gitlab/i.test(lessons[8].content) && /gitea/i.test(lessons[8].content), 'level 9 content should conceptually introduce hosted repository platforms');
  assert(/pull requests/i.test(lessons[9].content) && /gitlab/i.test(lessons[9].content), 'level 10 content should explicitly tease the follow-up course');

  // Regression check for "status-only completes level 5" loophole.
  {
    const s = baseState();
    s.currentLevel = 4;
    s.commandHistory.push('git status');
    assert.strictEqual(evaluateObjective(4, 0, s), false);
    assert.strictEqual(evaluateObjective(4, 1, s), false);
    assert.strictEqual(evaluateObjective(4, 2, s), false);
    assert.strictEqual(evaluateObjective(4, 3, s), false);
  }

  console.log('curriculum-integrity: all tests passed');
}

run();

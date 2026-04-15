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

function lessonText(lesson) {
  return [lesson.title, lesson.description, ...(lesson.objectives || []), lesson.content || '']
    .join(' ')
    .toLowerCase();
}

function includesAll(text, tokens) {
  return tokens.every((token) => text.includes(token));
}

function run() {
  const lessons = extractLessons();
  const tierNames = new Set();

  assert(Array.isArray(lessons) && lessons.length === 10, 'expected 10 lessons');

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

  assert.deepStrictEqual(
    Array.from(tierNames).sort(),
    ['Git Wizard', 'Good-to-Know', 'Grand Git Wizard', 'Must-Know', 'Template Knight'],
    'tier naming must match the curriculum contract'
  );

  const tierTopicRequirements = {
    'Must-Know': ['config', 'init', 'stage', 'commit', 'status', 'log --oneline'],
    'Good-to-Know': ['branch', 'switch', 'merge', 'conflict'],
    'Template Knight': ['stash', 'tag', 'alias', 'rebase -i'],
    'Git Wizard': ['reflog', 'reset', 'cherry-pick', 'bisect'],
    'Grand Git Wizard': ['origin', 'upstream', 'push', 'fetch', 'pull', 'pull request', 'review', 'ci', 'checks pass', 'merge']
  };

  Object.entries(tierTopicRequirements).forEach(([tier, tokens]) => {
    const tierLessons = lessons.filter((l) => l.tier === tier);
    assert.strictEqual(tierLessons.length, 2, `${tier} should span two levels`);

    const merged = tierLessons.map(lessonText).join(' ');
    assert(
      includesAll(merged, tokens),
      `${tier} is missing required topic coverage: ${tokens.filter((t) => !merged.includes(t)).join(', ')}`
    );

    const capstone = tierLessons.find((l) => l.tierIsCapstone);
    assert(capstone, `${tier} should have a capstone level`);
    const capstoneText = lessonText(capstone);
    assert(/capstone/.test(capstoneText), `${tier} capstone must be explicitly named as capstone`);
  });

  // Remote collaboration is mandatory in Grand Git Wizard capstone.
  const grandCapstone = lessons.find((l) => l.tier === 'Grand Git Wizard' && l.tierIsCapstone);
  const grandCapstoneText = lessonText(grandCapstone);
  ['origin', 'upstream', 'push', 'fetch', 'pull', 'pull request', 'review', 'ci', 'checks pass', 'merge only after checks pass'].forEach((token) => {
    assert(grandCapstoneText.includes(token), `Grand Git Wizard capstone missing required remote flow token: ${token}`);
  });

  console.log('curriculum-integrity: all tests passed');
}

run();

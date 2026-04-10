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
  const tierNames = new Set(lessons.map((lesson) => lesson.tier));

  assert.strictEqual(lessons.length, 10, 'expected 10 lessons');
  assert.deepStrictEqual(
    Array.from(tierNames),
    ['Git Knight', 'Advanced Knight', 'Template Knight', 'Git Wizard', 'Grand Git Wizard'],
    'expected five named tiers'
  );

  lessons.forEach((lesson, index) => {
    assert(lesson.tier && lesson.tierKey && lesson.tierBadge, `lesson ${index + 1} missing tier metadata`);
    assert(Number.isInteger(lesson.tierLevelIndex), `lesson ${index + 1} missing tier index`);
  });

  const capstones = lessons.filter((lesson) => lesson.tierIsCapstone);
  assert.strictEqual(capstones.length, 5, 'each tier should have a capstone lesson');

  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert(/downloadCertificateBtn/.test(html), 'certificate download button missing');
  assert(/tierNote/.test(html), 'tier note missing from objectives panel');

  const storeSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'storage-stores.js'), 'utf8');
  assert(/gwa_certificate_state_v1/.test(storeSrc), 'certificate store key missing');
  assert(/window\.certificateStore/.test(storeSrc), 'certificate store export missing');

  const engineSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'game-engine.js'), 'utf8');
  assert(/issueCertificate/.test(engineSrc), 'certificate issuing helper missing');
  assert(/renderCertificateButton/.test(engineSrc), 'certificate button helper missing');

  console.log('tier-certificates: all tests passed');
}

run();

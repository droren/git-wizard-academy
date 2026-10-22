const assert = require('assert');
const fs = require('fs');
const path = require('path');

function loadLessons() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'lessons.js'), 'utf8');
  const start = source.indexOf('const lessons =');
  const end = source.lastIndexOf('window.lessons = lessons;');
  const module = { exports: null };
  new Function('module', source.slice(start, end) + '\nmodule.exports = lessons;')(module);
  return module.exports;
}

function run() {
  const lessons = loadLessons();
  const simulatedCiFailure = /CI_FAIL|TODO|FIXME|console\.log\(/i;
  [8, 9].forEach((index) => {
    const files = lessons[index].initialWorkspaceFiles || {};
    const failures = Object.entries(files)
      .filter(([, content]) => simulatedCiFailure.test(String(content)))
      .map(([name]) => name);
    assert.deepStrictEqual(
      failures,
      [],
      `level ${index + 1} seed files must begin CI-clean so the taught PR flow is completable; failing: ${failures.join(', ')}`
    );
  });
  console.log('capstone-seed-ci: all tests passed');
}

run();

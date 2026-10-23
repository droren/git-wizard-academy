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
  [8, 9].forEach((index) => {
    assert.deepStrictEqual(
      lessons[index].initialRemotes,
      {},
      `level ${index + 1} must start without configured remotes so learners can perform the advertised origin/upstream setup`
    );
  });
  console.log('capstone-remote-setup: all tests passed');
}

run();

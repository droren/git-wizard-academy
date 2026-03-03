const assert = require('assert');
const fs = require('fs');
const path = require('path');

function extractStoryArc() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'story-arc.js'), 'utf8');
  const match = src.match(/const lessonLore = \{([\s\S]*?)\};/);
  assert(match, 'lessonLore not found');
  const body = 'module.exports = {' + match[1] + '};';
  const mod = { exports: null };
  // eslint-disable-next-line no-new-func
  const fn = new Function('module', body);
  fn(mod);
  return mod.exports;
}

function run() {
  const lore = extractStoryArc();
  for (let i = 0; i < 10; i++) {
    assert(lore[i], `missing story lore for level ${i + 1}`);
    assert(lore[i].title && lore[i].mission && lore[i].stakes, `incomplete story lore for level ${i + 1}`);
  }
  console.log('story-arc: all tests passed');
}

run();

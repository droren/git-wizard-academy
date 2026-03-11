const assert = require('assert');
const fs = require('fs');
const path = require('path');

function extractStoryArc() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'story-arc.js'), 'utf8');
  // eslint-disable-next-line no-new-func
  const fn = new Function('window', `${src}\nreturn window.storyArc;`);
  return fn({});
}

function run() {
  const arc = extractStoryArc();
  const lore = arc.lessonLore;
  assert(arc.mentor && arc.mentor.name && arc.mentor.avatar, 'mentor metadata missing');
  assert(arc.prologue && Array.isArray(arc.prologue.crawlLines) && arc.prologue.crawlLines.length >= 4, 'prologue crawl missing');
  for (let i = 0; i < 10; i++) {
    assert(lore[i], `missing story lore for level ${i + 1}`);
    assert(lore[i].title && lore[i].mission && lore[i].stakes, `incomplete story lore for level ${i + 1}`);
    assert(lore[i].guardian && lore[i].guardian.name && lore[i].guardian.avatar, `missing guardian for level ${i + 1}`);
    assert(lore[i].briefing && lore[i].transition && lore[i].teaser, `missing narrative beats for level ${i + 1}`);
    assert(Array.isArray(lore[i].cadence) && lore[i].cadence.length >= 3, `missing cadence guidance for level ${i + 1}`);
    assert(lore[i].bonus, `missing bonus teaching note for level ${i + 1}`);
  }
  assert(/github/i.test(lore[8].teaser) && /gitlab/i.test(lore[8].teaser) && /gitea/i.test(lore[8].teaser), 'level 9 teaser should name repository platforms');
  assert(/next course unlocked/i.test(lore[9].teaser), 'level 10 should explicitly tease the next course');
  console.log('story-arc: all tests passed');
}

run();

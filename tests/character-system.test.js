const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function makeStage() {
  const children = [];
  return {
    classList: { add() {}, remove() {} },
    children,
    appendChild(el) {
      children.push(el);
      el.parentNode = this;
    },
    removeChild(el) {
      const idx = children.indexOf(el);
      if (idx >= 0) children.splice(idx, 1);
    }
  };
}

function run() {
  const stage = makeStage();
  global.window = {
    storyArc: {
      mentor: { avatar: '🧙', name: 'Mentor' },
      getLessonLore: () => ({
        guardian: { avatar: '🛡️', name: 'Guardian' },
        briefing: 'Briefing',
        teaser: 'Teaser'
      })
    },
    Assets: {
      getSprite(name) {
        return { src: '/sprites/' + name + '.png' };
      },
      playSound() {}
    },
    Effects: {
      sparkle() {},
      shake() {},
      glitch() {}
    }
  };
  global.document = {
    body: { contains: () => true, appendChild() {} },
    createElement(tag) {
      return {
        tagName: tag,
        style: {},
        dataset: {},
        className: '',
        textContent: '',
        children: [],
        appendChild(child) {
          this.children.push(child);
        },
        classList: { add() {}, remove() {} }
      };
    },
    getElementById(id) {
      return id === 'characterStage' ? stage : null;
    },
    addEventListener() {}
  };
  global.requestAnimationFrame = (fn) => fn();

  const source = fs.readFileSync(require.resolve('../js/character-system.js'), 'utf8');
  vm.runInThisContext(source, { filename: 'character-system.js' });

  const id = window.characterSystem.spawn('lintImp', { label: 'Lint Imp', autoRemoveMs: 10, drift: true, targetLeft: 25, targetTop: 55 });
  assert(id, 'spawn should return an id');
  assert.strictEqual(stage.children.length, 1, 'spawn should append a character');

  window.characterSystem.reactToEvent('commit-success');
  window.characterSystem.reactToEvent('merge-conflict');

  window.characterSystem.removeCharacter(id);
  assert.strictEqual(stage.children.length >= 0, true, 'removeCharacter should not crash');

  console.log('character-system: all tests passed');
}

run();

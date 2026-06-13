const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

class MockAudio {
  constructor() {
    this.src = '';
    this.loop = false;
    this.volume = 1;
    this.preload = '';
    this.playCalls = 0;
    this.paused = false;
  }

  play() {
    this.playCalls += 1;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }

  cloneNode() {
    const clone = new MockAudio();
    clone.src = this.src;
    clone.loop = this.loop;
    clone.volume = this.volume;
    return clone;
  }
}

class MockImage {
  constructor() {
    this.src = '';
    this.decoding = '';
    this.loading = '';
  }
}

function run() {
  const savedConfig = { 'user.name': 'Dennis Hjort', 'user.email': 'hjort.dennis@gmail.com' };
  const savedSettings = {};
  global.window = {
    configStore: {
      load: () => Object.assign({}, savedConfig),
      save: (cfg) => {
        Object.keys(savedConfig).forEach((key) => delete savedConfig[key]);
        Object.assign(savedConfig, cfg || {});
      }
    },
    gameSettingsStore: {
      load: () => Object.assign({}, savedSettings),
      save: (cfg) => {
        Object.keys(savedSettings).forEach((key) => delete savedSettings[key]);
        Object.assign(savedSettings, cfg || {});
      }
    }
  };
  global.localStorage = {
    getItem() { return null; },
    setItem() {},
    removeItem() {}
  };
  global.Audio = MockAudio;
  global.Image = MockImage;

  const source = fs.readFileSync(require.resolve('../js/asset-loader.js'), 'utf8');
  vm.runInThisContext(source, { filename: 'asset-loader.js' });

  assert(window.Assets, 'Assets API should exist');
  assert.strictEqual(typeof window.Assets.getSound, 'function');
  assert.strictEqual(typeof window.Assets.playSound, 'function');
  assert.strictEqual(typeof window.Assets.playMusic, 'function');
  assert.strictEqual(typeof window.Assets.getMusicCatalog, 'function');
  assert.strictEqual(typeof window.Assets.getMusicInfo, 'function');
  assert.strictEqual(typeof window.Assets.setMusicEnabled, 'function');
  assert.strictEqual(typeof window.Assets.setSfxEnabled, 'function');
  assert.strictEqual(typeof window.Assets.setSelectedMusic, 'function');

  const sound = window.Assets.getSound('success');
  assert(sound instanceof MockAudio, 'sound should be a mock audio element');
  assert(sound.src.includes('success1.ogg'), 'sound src should point to local Kenney asset');

  const sprite = window.Assets.getSprite('gitknight');
  assert(sprite instanceof MockImage, 'sprite should be a mock image element');
  assert(sprite.src.includes('gitknight.png'), 'sprite src should point to local Kenney asset');

  const played = window.Assets.playSound('success');
  assert(played instanceof MockAudio, 'playSound should return a playable audio clone');
  assert.strictEqual(played.playCalls, 1, 'playSound should invoke play on the clone');

  const catalog = window.Assets.getMusicCatalog();
  assert(Array.isArray(catalog), 'music catalog should be an array');
  assert(catalog.length >= 10, 'music catalog should include all Pixabay tracks');
  const chosen = catalog.find((track) => track.key === 'moodmode_retro_game_music');
  assert(chosen, 'catalog should include the default background track');
  assert(chosen.artist && chosen.title, 'track metadata should include artist and title');
  assert(catalog.some((track) => /pixabay/i.test(track.source)), 'tracks should retain source attribution');

  const info = window.Assets.getMusicInfo(chosen.key);
  assert(info && info.label.includes(chosen.title), 'track info should expose a readable label');

  window.Assets.setSfxEnabled(true);
  window.Assets.setMusicEnabled(true);
  const gameSettings = window.gameSettingsStore.load();
  assert(!('user.name' in gameSettings), 'game settings must not leak git config keys');
  assert(!('user.email' in gameSettings), 'game settings must not leak git config keys');

  const selectedKey = window.Assets.setSelectedMusic(chosen.key);
  assert.strictEqual(selectedKey, chosen.key, 'selected music should persist');

  const music = window.Assets.playMusic();
  assert(music instanceof MockAudio, 'playMusic should return a music audio object');
  assert.strictEqual(music.loop, true, 'music should loop');
  assert(music.src.includes(chosen.file.split('/').pop()), 'music should point to the chosen track');

  const clearedKey = window.Assets.setSelectedMusic('');
  assert.strictEqual(clearedKey, '', 'clearing the selected music should persist no music');
  const clearedPlay = window.Assets.playMusic();
  assert.strictEqual(clearedPlay, null, 'playMusic should stop when no track is selected');

  window.Assets.setSfxEnabled(false);
  const disabled = window.Assets.playSound('success');
  assert.strictEqual(disabled, null, 'sound should be suppressed when SFX is disabled');

  window.Assets.setMusicEnabled(false);
  const musicDisabled = window.Assets.playMusic();
  assert.strictEqual(musicDisabled, null, 'music should be suppressed when music is disabled');

  const gitConfig = window.configStore.load();
  assert.strictEqual(gitConfig['user.name'], 'Dennis Hjort', 'git config should remain in git config store');
  assert.strictEqual(gitConfig['user.email'], 'hjort.dennis@gmail.com', 'git config should remain in git config store');

  console.log('asset-loader: all tests passed');
}

run();

// js/asset-loader.js
/**
 * Local asset loader for Kenney audio and sprites.
 * Lazy loads and caches assets without external dependencies.
 */

(function () {
    const BASE = 'assets/';
    const DEFAULT_SETTINGS = {
        musicEnabled: true,
        sfxEnabled: true,
        sfxVolume: 0.85,
        musicVolume: 0.28,
        selectedMusic: 'moodmode_retro_game_music'
    };

    const MUSIC_SOURCE = 'Pixabay 8-bit search';
    const MUSIC_CATALOG = [
        {
            key: 'ags_project_8_bit',
            file: 'audio/music/pixabay.com_music_search_8-bit/ags_project-8-bit-219384.mp3',
            artist: 'ags_project',
            title: '8-Bit'
        },
        {
            key: 'i_love_my_8_bit_game_console',
            file: 'audio/music/pixabay.com_music_search_8-bit/djartmusic-i-love-my-8-bit-game-console-301272.mp3',
            artist: 'djartmusic',
            title: 'I Love My 8-Bit Game Console'
        },
        {
            key: '8_bit_dungeon',
            file: 'audio/music/pixabay.com_music_search_8-bit/kaden_cook-8-bit-dungeon-251388.mp3',
            artist: 'kaden_cook',
            title: '8-Bit Dungeon'
        },
        {
            key: 'a_night_full_of_stars',
            file: 'audio/music/pixabay.com_music_search_8-bit/montogoronto-a-night-full-of-stars-peaceful-electronic-8-bitpiano-track-321551.mp3',
            artist: 'montogoronto',
            title: 'A Night Full of Stars'
        },
        {
            key: '8_bit_game',
            file: 'audio/music/pixabay.com_music_search_8-bit/moodmode-8-bit-game-158815.mp3',
            artist: 'moodmode',
            title: '8-Bit Game'
        },
        {
            key: 'moodmode_retro_game_music',
            file: 'audio/music/pixabay.com_music_search_8-bit/moodmode-8-bit-retro-game-music-233964.mp3',
            artist: 'moodmode',
            title: '8-Bit Retro Game Music'
        },
        {
            key: 'game_8_bit_on',
            file: 'audio/music/pixabay.com_music_search_8-bit/moodmode-game-8-bit-on-278083.mp3',
            artist: 'moodmode',
            title: 'Game 8-Bit On'
        },
        {
            key: 'pixel_party',
            file: 'audio/music/pixabay.com_music_search_8-bit/nocopyrightsound633-8-bit-music-no-copyright-background-instrumental-pixel-party-322342.mp3',
            artist: 'nocopyrightsound633',
            title: 'Pixel Party'
        },
        {
            key: 'arcade_beat',
            file: 'audio/music/pixabay.com_music_search_8-bit/nocopyrightsound633-arcade-beat-323176.mp3',
            artist: 'nocopyrightsound633',
            title: 'Arcade Beat'
        },
        {
            key: 'retro_funk',
            file: 'audio/music/pixabay.com_music_search_8-bit/slow-2020-06-18_-_8_Bit_Retro_Funk_-_www.FesliyanStudios.com_David_Renda.mp3',
            artist: 'David Renda / Fesliyan Studios',
            title: '8-Bit Retro Funk'
        }
    ].map(function (track) {
        return Object.assign({
            source: MUSIC_SOURCE,
            credit: track.artist + ' - ' + track.title
        }, track);
    });

    const manifest = {
        sounds: {
            click: 'audio/sfx/click1.ogg',
            rollover: 'audio/sfx/rollover1.ogg',
            switch: 'audio/sfx/switch1.ogg',
            error: 'audio/sfx/error1.ogg',
            success: 'audio/sfx/success1.ogg',
            alarm: 'audio/sfx/alarm1.ogg',
            alarm2: 'audio/sfx/alarm2.ogg',
            jump: 'audio/sfx/actions/jump.ogg',
            pickup: 'audio/sfx/actions/pickup.ogg',
            stepWood: 'audio/sfx/actions/step-wood.ogg',
            bash: 'audio/sfx/actions/bash.ogg',
            push: 'audio/sfx/actions/push.ogg',
            swish: 'audio/sfx/actions/swish.ogg',
            write: 'audio/sfx/actions/write.ogg',
            throw: 'audio/sfx/actions/throw.ogg',
            lift: 'audio/sfx/actions/lift.ogg',
            burn: 'audio/sfx/actions/burn.ogg'
        },
        music: MUSIC_CATALOG.reduce(function (acc, track) {
            acc[track.key] = track.file;
            return acc;
        }, {
            retro: 'audio/music/casino-preview.ogg',
            sax: 'audio/music/voiceover-preview.ogg',
            boss: 'audio/music/voiceover-preview.ogg'
        }),
        sprites: {
            gitknight: 'sprites/characters/gitknight.png',
            gitknightLift: 'sprites/characters/gitknight-lift.png',
            gitknightPlace: 'sprites/characters/gitknight-place.png',
            mergegoblin: 'sprites/characters/mergegoblin.png',
            lintimp: 'sprites/characters/lintimp.png',
            cidragon: 'sprites/characters/cidragon.png',
            award: 'sprites/ui/award.png',
            shield: 'sprites/ui/shield.png',
            crownA: 'sprites/ui/crown_a.png',
            crownB: 'sprites/ui/crown_b.png',
            fire: 'sprites/effects/fire.png',
            exploding: 'sprites/effects/exploding.png',
            skull: 'sprites/effects/skull.png',
            roguelikeSheet: 'sprites/effects/roguelikeSheet_transparent.png'
        }
    };

    const musicByKey = MUSIC_CATALOG.reduce(function (acc, track) {
        acc[track.key] = track;
        return acc;
    }, {});

    const aliases = {
        victory: 'success',
        win: 'success',
        alarm: 'alarm',
        error: 'error',
        glitch: 'alarm',
        click: 'click',
        pop: 'click',
        boing: 'jump',
        switch: 'switch',
        step: 'stepWood',
        footstep: 'stepWood',
        rollover: 'rollover',
        pickup: 'pickup',
        collect: 'pickup',
        jump: 'jump',
        bash: 'bash',
        hit: 'bash',
        push: 'push',
        swish: 'swish',
        throw: 'throw',
        lift: 'lift',
        write: 'write',
        burn: 'burn',
        boss: 'boss',
        retroLoop: 'retro',
        saxLoop: 'sax',
        defaultMusic: DEFAULT_SETTINGS.selectedMusic
    };

    const cache = {
        sounds: {},
        sprites: {},
        music: {}
    };

    let activeMusic = null;
    let activeMusicKey = null;

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function getStore() {
        if (window.gameSettingsStore && window.gameSettingsStore.load) return window.gameSettingsStore;
        return window.configStore && window.configStore.load ? window.configStore : null;
    }

    function readSettings() {
        const store = getStore();
        const cfg = store ? (store.load() || {}) : {};
        const legacyEnabled = cfg['audio.enabled'] !== undefined ? String(cfg['audio.enabled']) !== 'false' : null;
        const hasSelectedMusic = Object.prototype.hasOwnProperty.call(cfg, 'audio.selectedMusic');
        let selectedMusic = DEFAULT_SETTINGS.selectedMusic;
        if (hasSelectedMusic) {
            selectedMusic = cfg['audio.selectedMusic'] && manifest.music[cfg['audio.selectedMusic']]
                ? cfg['audio.selectedMusic']
                : '';
        }
        return {
            musicEnabled: cfg['audio.musicEnabled'] !== undefined
                ? String(cfg['audio.musicEnabled']) !== 'false'
                : (legacyEnabled !== null ? legacyEnabled : DEFAULT_SETTINGS.musicEnabled),
            sfxEnabled: cfg['audio.sfxEnabled'] !== undefined
                ? String(cfg['audio.sfxEnabled']) !== 'false'
                : (legacyEnabled !== null ? legacyEnabled : DEFAULT_SETTINGS.sfxEnabled),
            sfxVolume: clamp(parseFloat(cfg['audio.sfxVolume']) || DEFAULT_SETTINGS.sfxVolume, 0, 1),
            musicVolume: clamp(parseFloat(cfg['audio.musicVolume']) || DEFAULT_SETTINGS.musicVolume, 0, 1),
            selectedMusic: selectedMusic
        };
    }

    function saveSettings(next) {
        const store = getStore();
        if (!store) return next;
        const cfg = store.load() || {};
        cfg['audio.enabled'] = (next.musicEnabled && next.sfxEnabled) ? 'true' : 'false';
        cfg['audio.musicEnabled'] = next.musicEnabled ? 'true' : 'false';
        cfg['audio.sfxEnabled'] = next.sfxEnabled ? 'true' : 'false';
        cfg['audio.sfxVolume'] = String(clamp(next.sfxVolume, 0, 1));
        cfg['audio.musicVolume'] = String(clamp(next.musicVolume, 0, 1));
        cfg['audio.selectedMusic'] = next.selectedMusic && manifest.music[next.selectedMusic] ? next.selectedMusic : '';
        store.save(cfg);
        return next;
    }

    function resolveName(type, name) {
        const key = aliases[name] || name;
        return manifest[type][key] ? key : null;
    }

    function resolveMusicKey(name) {
        if (!name) {
            const settings = readSettings();
            return manifest.music[settings.selectedMusic] ? settings.selectedMusic : null;
        }
        const resolved = resolveName('music', name);
        if (resolved) return resolved;
        return manifest.music[name] ? name : null;
    }

    function audioElement(src) {
        const el = new Audio();
        el.preload = 'auto';
        el.src = src;
        return el;
    }

    function imageElement(src) {
        const img = new Image();
        img.decoding = 'async';
        img.loading = 'eager';
        img.src = src;
        return img;
    }

    function preloadAsset(type, name) {
        const manifestName = resolveName(type, name);
        if (!manifestName) return Promise.resolve(null);

        if (type === 'sounds') {
            return Promise.resolve(getSound(manifestName));
        }
        if (type === 'music') {
            return Promise.resolve(getMusic(manifestName));
        }
        if (type === 'sprites') {
            return Promise.resolve(getSprite(manifestName));
        }
        return Promise.resolve(null);
    }

    function ensureLoaded(list, type) {
        if (!Array.isArray(list) || !list.length) return Promise.resolve([]);
        return Promise.all(list.map((name) => preloadAsset(type, name)));
    }

    function getSound(name) {
        const resolved = resolveName('sounds', name);
        if (!resolved) return null;
        if (!cache.sounds[resolved]) {
            cache.sounds[resolved] = audioElement(BASE + manifest.sounds[resolved]);
        }
        return cache.sounds[resolved];
    }

    function getMusic(name) {
        const resolved = resolveMusicKey(name);
        if (!resolved) return null;
        if (!cache.music[resolved]) {
            const audio = audioElement(BASE + manifest.music[resolved]);
            audio.loop = true;
            cache.music[resolved] = audio;
        }
        return cache.music[resolved];
    }

    function getSprite(name) {
        const resolved = resolveName('sprites', name);
        if (!resolved) return null;
        if (!cache.sprites[resolved]) {
            cache.sprites[resolved] = imageElement(BASE + manifest.sprites[resolved]);
        }
        return cache.sprites[resolved];
    }

    function clonePlayable(template) {
        if (!template) return null;
        if (typeof template.cloneNode === 'function') {
            const clone = template.cloneNode(true);
            clone.currentTime = 0;
            return clone;
        }
        return audioElement(template.src);
    }

    function playSound(name, options) {
        const settings = readSettings();
        const resolved = resolveName('sounds', name);
        if (!settings.sfxEnabled || !resolved) return null;

        const template = getSound(resolved);
        const audio = clonePlayable(template);
        if (!audio) return null;

        audio.loop = false;
        audio.volume = options && typeof options.volume === 'number'
            ? clamp(options.volume, 0, 1)
            : settings.sfxVolume;
        try {
            const maybe = audio.play();
            if (maybe && typeof maybe.catch === 'function') maybe.catch(function () {});
        } catch (e) {
            // Ignore browser autoplay constraints.
        }
        return audio;
    }

    function stopMusic() {
        if (!activeMusic) return;
        try {
            activeMusic.pause();
        } catch (e) {}
        activeMusic = null;
        activeMusicKey = null;
    }

    function playMusic(name, options) {
        const settings = readSettings();
        const resolved = resolveMusicKey(name);
        const force = !!(options && options.force);
        if ((!settings.musicEnabled && !force) || !resolved) {
            stopMusic();
            return null;
        }

        const template = getMusic(resolved);
        if (!template) return null;
        if (activeMusic && activeMusic.src === template.src) {
            activeMusic.volume = options && typeof options.volume === 'number'
                ? clamp(options.volume, 0, 1)
                : settings.musicVolume;
            activeMusicKey = resolved;
            return activeMusic;
        }

        stopMusic();
        activeMusic = clonePlayable(template) || template;
        activeMusic.loop = true;
        activeMusic.volume = options && typeof options.volume === 'number'
            ? clamp(options.volume, 0, 1)
            : settings.musicVolume;
        activeMusicKey = resolved;

        try {
            const maybe = activeMusic.play();
            if (maybe && typeof maybe.catch === 'function') maybe.catch(function () {});
        } catch (e) {}
        return activeMusic;
    }

    function setEnabled(enabled) {
        const settings = saveSettings(Object.assign(readSettings(), {
            musicEnabled: !!enabled,
            sfxEnabled: !!enabled
        }));
        if (!settings.musicEnabled) stopMusic();
        return settings.musicEnabled && settings.sfxEnabled;
    }

    function isEnabled() {
        const settings = readSettings();
        return settings.musicEnabled || settings.sfxEnabled;
    }

    function setVolumes(next) {
        const current = readSettings();
        const settings = saveSettings({
            musicEnabled: current.musicEnabled,
            sfxEnabled: current.sfxEnabled,
            sfxVolume: next && typeof next.sfxVolume === 'number' ? next.sfxVolume : current.sfxVolume,
            musicVolume: next && typeof next.musicVolume === 'number' ? next.musicVolume : current.musicVolume,
            selectedMusic: current.selectedMusic
        });
        if (activeMusic) {
            activeMusic.volume = settings.musicVolume;
        }
        return settings;
    }

    function setMusicEnabled(enabled) {
        const settings = saveSettings(Object.assign(readSettings(), { musicEnabled: !!enabled }));
        if (!settings.musicEnabled) {
            stopMusic();
        } else {
            playMusic();
        }
        return settings.musicEnabled;
    }

    function setSfxEnabled(enabled) {
        const settings = saveSettings(Object.assign(readSettings(), { sfxEnabled: !!enabled }));
        return settings.sfxEnabled;
    }

    function setSelectedMusic(name) {
        const current = readSettings();
        const resolved = name ? resolveMusicKey(name) : '';
        const next = saveSettings(Object.assign({}, current, {
            selectedMusic: resolved || ''
        }));
        if (next.musicEnabled) {
            if (resolved) {
                playMusic(resolved);
            } else {
                stopMusic();
            }
        }
        return next.selectedMusic;
    }

    function getMusicCatalog() {
        return MUSIC_CATALOG.map(function (track) {
            return Object.assign({}, track, {
                src: BASE + manifest.music[track.key],
                label: track.title + ' — ' + track.artist
            });
        });
    }

    function getMusicInfo(name) {
        const resolved = resolveMusicKey(name);
        if (!resolved) return null;
        const track = musicByKey[resolved];
        if (!track) return null;
        return Object.assign({}, track, {
            src: BASE + manifest.music[resolved],
            label: track.title + ' — ' + track.artist
        });
    }

    function preload(spec) {
        if (!spec) return Promise.resolve([]);
        if (Array.isArray(spec)) {
            const sounds = [];
            const music = [];
            const sprites = [];
            spec.forEach(function (name) {
                if (resolveName('sounds', name)) sounds.push(name);
                else if (resolveName('music', name)) music.push(name);
                else if (resolveName('sprites', name)) sprites.push(name);
            });
            return Promise.all([
                ensureLoaded(sounds, 'sounds'),
                ensureLoaded(music, 'music'),
                ensureLoaded(sprites, 'sprites')
            ]);
        }

        const tasks = [];
        if (Array.isArray(spec.sounds)) tasks.push(ensureLoaded(spec.sounds, 'sounds'));
        if (Array.isArray(spec.music)) tasks.push(ensureLoaded(spec.music, 'music'));
        if (Array.isArray(spec.sprites)) tasks.push(ensureLoaded(spec.sprites, 'sprites'));
        return Promise.all(tasks);
    }

    function preloadLevel(levelIndex) {
        const level = window.lessons && window.lessons[levelIndex];
        if (!level) return Promise.resolve([]);

        const names = ['click', 'switch', 'success', 'error'];
        const bossSprite = level.boss && level.boss.sprite ? level.boss.sprite : null;
        if (bossSprite) names.push(bossSprite);
        if (level.conflictScenario) {
            names.push('mergegoblin', 'alarm', 'alarm2', 'gitknight');
        }
        const selectedMusic = readSettings().selectedMusic;
        if (selectedMusic) names.push(selectedMusic);
        return preload(names);
    }

    function getManifest() {
        return JSON.parse(JSON.stringify(Object.assign({}, manifest, {
            musicCatalog: MUSIC_CATALOG
        })));
    }

    const api = {
        getSound,
        getSprite,
        getMusic,
        getMusicCatalog,
        getMusicInfo,
        playSound,
        playMusic,
        stopMusic,
        preload,
        preloadLevel,
        setEnabled,
        setMusicEnabled,
        setSfxEnabled,
        setSelectedMusic,
        isEnabled,
        setVolumes,
        getSettings: readSettings,
        getActiveMusicKey: function () { return activeMusicKey; },
        getManifest
    };

    window.Assets = api;
    window.AssetLoader = api;
})();

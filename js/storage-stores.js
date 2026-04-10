// js/storage-stores.js
/**
 * Persistent storage modules for config, repository state, and lesson/game progress.
 * Backward compatible with legacy keys.
 */

(function () {
    const KEYS = {
        config: 'gwa_git_config_v1',
        repo: 'gwa_repo_state_v1',
        lesson: 'gwa_lesson_state_v1',
        certificates: 'gwa_certificate_state_v1',
        legacyGame: 'gwa_gameState'
    };

    function safeParse(raw, fallback) {
        try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    const configStore = {
        load: function () {
            return safeParse(localStorage.getItem(KEYS.config) || '{}', {});
        },
        save: function (config) {
            localStorage.setItem(KEYS.config, JSON.stringify(config || {}));
            return true;
        },
        get: function (key) {
            const cfg = this.load();
            return key in cfg ? cfg[key] : '';
        },
        set: function (key, value) {
            const cfg = this.load();
            cfg[key] = String(value);
            this.save(cfg);
            return true;
        }
    };

    const repoStore = {
        load: function () {
            return safeParse(localStorage.getItem(KEYS.repo) || '{}', {});
        },
        save: function (repoState) {
            localStorage.setItem(KEYS.repo, JSON.stringify(repoState || {}));
            return true;
        },
        clear: function () {
            localStorage.removeItem(KEYS.repo);
        }
    };

    const lessonStore = {
        load: function () {
            const current = safeParse(localStorage.getItem(KEYS.lesson) || '{}', {});
            if (Object.keys(current).length) return current;
            // Migrate from old key once.
            const legacy = safeParse(localStorage.getItem(KEYS.legacyGame) || '{}', {});
            return legacy;
        },
        save: function (state) {
            localStorage.setItem(KEYS.lesson, JSON.stringify(state || {}));
            // Keep legacy key in sync for compatibility with older builds.
            localStorage.setItem(KEYS.legacyGame, JSON.stringify(state || {}));
            return true;
        },
        clear: function () {
            localStorage.removeItem(KEYS.lesson);
            localStorage.removeItem(KEYS.legacyGame);
        }
    };

    const certificateStore = {
        load: function () {
            return safeParse(localStorage.getItem(KEYS.certificates) || '[]', []);
        },
        save: function (certificates) {
            localStorage.setItem(KEYS.certificates, JSON.stringify(Array.isArray(certificates) ? certificates : []));
            return true;
        },
        clear: function () {
            localStorage.removeItem(KEYS.certificates);
        }
    };

    window.storageStores = { KEYS };
    window.configStore = configStore;
    window.repoStore = repoStore;
    window.lessonStore = lessonStore;
    window.certificateStore = certificateStore;
    window._cloneState = clone;
})();

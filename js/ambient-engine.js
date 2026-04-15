// js/ambient-engine.js
/**
 * Passive game feel layer that keeps the world moving.
 */

(function () {
    function activeCharacters() {
        if (!window.characterSystem || !window.characterSystem.characters) return 0;
        return window.characterSystem.characters.length || 0;
    }

    function introVisible() {
        return !!(window.ui && typeof window.ui.isIntroVisible === 'function' && window.ui.isIntroVisible());
    }

    function spawnKnightNudge() {
        if (!window.characterSystem || typeof window.characterSystem.spawn !== 'function') return;
        const id = window.characterSystem.spawn('gitKnight', {
            ambient: true,
            anchor: 'objectives',
            x: 22,
            y: 84,
            autoRemoveMs: 2400,
            speed: 48,
            hideLabel: true
        });
        if (window.characterSystem.reactToEvent) {
            // no-op, keep API touch light
        }
        return id;
    }

    function spawnLintPeek() {
        if (!window.characterSystem || typeof window.characterSystem.spawn !== 'function') return;
        const id = window.characterSystem.spawn('lintImp', {
            ambient: true,
            anchor: 'terminal',
            x: 36,
            y: 76,
            autoRemoveMs: 2100,
            speed: 56,
            hideLabel: true
        });
        if (window.Effects && Math.random() < 0.3) window.Effects.glitch(120);
        return id;
    }

    function spawnGoblinPush() {
        if (!window.characterSystem || typeof window.characterSystem.spawn !== 'function') return;
        const id = window.characterSystem.spawn('mergeGoblin', {
            ambient: true,
            anchor: 'lesson',
            x: 48,
            y: 74,
            autoRemoveMs: 1800,
            speed: 60,
            hideLabel: true
        });
        if (window.Effects && window.Effects.shake && Math.random() < 0.45) window.Effects.shake(90);
        return id;
    }

    const AmbientEngine = {
        _interval: null,
        _monitorInterval: null,
        _lastProgressAt: Date.now(),

        markProgress: function () {
            this._lastProgressAt = Date.now();
        },

        tick: function () {
            if (introVisible()) return;
            if (activeCharacters() > 2) return;

            const r = Math.random();
            if (r < 0.26) spawnLintPeek();
            else if (r < 0.42) spawnGoblinPush();
            else if (r < 0.64) spawnKnightNudge();
            else if (window.Effects && typeof window.Effects.spark === 'function' && Math.random() < 0.4) {
                window.Effects.spark({ left: 18 + Math.random() * 64, top: 22 + Math.random() * 48, lifeMs: 650, scale: 0.52 });
            }
        },

        start: function () {
            if (this._interval) return;
            const self = this;
            this._interval = setInterval(function () {
                self.tick();
            }, 5200);

            this._monitorInterval = setInterval(function () {
                const idleMs = Date.now() - self._lastProgressAt;
                if (idleMs > 14000) {
                    if (!introVisible() && window.characterSystem && typeof window.characterSystem.spawn === 'function') {
                        window.characterSystem.spawn('gitKnight', {
                            ambient: true,
                            anchor: 'objectives',
                            x: 14,
                            y: 74,
                            autoRemoveMs: 2400,
                            speed: 44,
                            hideLabel: true
                        });
                    }
                    if (window.ui && typeof window.ui.showHintToast === 'function') {
                        window.ui.showHintToast('Need a nudge? Re-read the current objectives or replay the intro.');
                    }
                    self._lastProgressAt = Date.now();
                }
            }, 2000);
        },

        stop: function () {
            if (this._interval) clearInterval(this._interval);
            if (this._monitorInterval) clearInterval(this._monitorInterval);
            this._interval = null;
            this._monitorInterval = null;
        }
    };

    window.AmbientEngine = AmbientEngine;
})();

// js/effects.js
/**
 * Lightweight visual effects for shakes, glitches, and sparks.
 */

(function () {
    const state = {
        layer: null,
        timers: {}
    };

    function ensureLayer() {
        if (state.layer && document.body.contains(state.layer)) return state.layer;
        state.layer = document.getElementById('effectsLayer');
        if (!state.layer) {
            state.layer = document.createElement('div');
            state.layer.id = 'effectsLayer';
            state.layer.className = 'effects-layer';
            document.body.appendChild(state.layer);
        }
        return state.layer;
    }

    function spawn(type, opts) {
        const layer = ensureLayer();
        const el = document.createElement('div');
        el.className = 'effect effect-' + type;
        el.style.left = String(opts && typeof opts.left === 'number' ? opts.left : (15 + Math.random() * 70)) + '%';
        el.style.top = String(opts && typeof opts.top === 'number' ? opts.top : (15 + Math.random() * 65)) + '%';
        el.style.transform = 'translate(-50%, -50%) scale(' + String(opts && opts.scale ? opts.scale : 1) + ')';
        el.textContent = (opts && opts.label) || (type === 'spark' ? '✨' : type === 'pulse' ? '💫' : '✦');
        layer.appendChild(el);
        requestAnimationFrame(function () {
            el.classList.add('show');
        });
        const lifeMs = opts && opts.lifeMs ? opts.lifeMs : 800;
        const id = setTimeout(function () {
            if (el && el.parentNode) el.parentNode.removeChild(el);
        }, lifeMs);
        state.timers[id] = id;
        return el;
    }

    function shake(duration) {
        duration = duration || 200;
        document.body.classList.add('shake');
        setTimeout(function () {
            document.body.classList.remove('shake');
        }, duration);
    }

    function glitch(duration) {
        duration = duration || 420;
        document.body.classList.add('glitch');
        setTimeout(function () {
            document.body.classList.remove('glitch');
        }, duration);
    }

    const Effects = {
        ensureLayer: ensureLayer,
        spawn: spawn,
        spark: function (opts) { return spawn('spark', opts); },
        sparkle: function (opts) { return spawn('spark', opts); },
        pulse: function (opts) { return spawn('pulse', opts); },
        shake: shake,
        glitch: glitch
    };

    window.Effects = Effects;
})();

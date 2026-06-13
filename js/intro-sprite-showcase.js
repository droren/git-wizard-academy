(function () {
    const PROCESSION_SETTLE_MS = 700;

    const CEREMONY_CAST = [
        'adventurer', 'female', 'alienBlue', 'alienGreen', 'alienPink',
        'zombie', 'slime', 'snail', 'fly', 'bee', 'frog', 'spider', 'mouse'
    ];

    const SPRITES = {
        adventurer: makeSprite('academy', 'adventurer', 34, 44),
        female: makeSprite('academy', 'female', 34, 44),
        zombie: makeSprite('academy', 'zombie', 34, 44),
        alienBlue: makeSprite('aliens', 'alienBlue', 34, 44),
        alienGreen: makeSprite('aliens', 'alienGreen', 34, 44),
        alienPink: makeSprite('aliens', 'alienPink', 34, 44),
        slime: makeCritter('slime', 28, 20, ['slime', 'slime_walk']),
        snail: makeCritter('snail', 28, 20, ['snail', 'snail_walk']),
        fly: makeFlyingCritter('fly', 24, 20, ['fly', 'fly_fly']),
        bee: makeFlyingCritter('bee', 24, 20, ['bee', 'bee_fly']),
        frog: makeCritter('frog', 28, 24, ['frog', 'frog_leap']),
        spider: makeCritter('spider', 28, 20, ['spider', 'spider_walk1', 'spider_walk2']),
        mouse: makeCritter('mouse', 26, 18, ['mouse', 'mouse_walk'])
    };

    const state = {
        overlay: null,
        stage: null,
        actors: [],
        phase: 'idle',
        active: false,
        paused: false,
        lastTime: 0,
        elapsed: 0,
        phaseElapsed: 0,
        phaseStartedAt: 0,
        rafId: 0,
        sideTargets: [],
        crawlRect: null,
        stageW: 0,
        stageH: 0,
        readyPromise: null,
        visibilityBound: false,
        processionReadyFired: false,
        walkingSoundAt: 0
    };

    function makeSprite(group, name, w, h) {
        return {
            size: { w: w, h: h },
            frames: {
                idle: ['assets/sprites/intro/' + group + '/' + name + '_stand.png'],
                walk: ['assets/sprites/intro/' + group + '/' + name + '_walk1.png', 'assets/sprites/intro/' + group + '/' + name + '_walk2.png'],
                jump: ['assets/sprites/intro/' + group + '/' + name + '_jump.png'],
                hurt: ['assets/sprites/intro/' + group + '/' + name + '_hurt.png']
            }
        };
    }

    function makeCritter(name, w, h, baseFrames) {
        return {
            size: { w: w, h: h },
            frames: {
                idle: ['assets/sprites/intro/critters/' + baseFrames[0] + '.png'],
                walk: baseFrames.map(function (frame) { return 'assets/sprites/intro/critters/' + frame + '.png'; }),
                jump: ['assets/sprites/intro/critters/' + baseFrames[baseFrames.length - 1] + '.png'],
                hurt: ['assets/sprites/intro/critters/' + baseFrames[0] + '.png']
            }
        };
    }

    function makeFlyingCritter(name, w, h, baseFrames) {
        const sprite = makeCritter(name, w, h, baseFrames);
        sprite.flying = true;
        return sprite;
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function rand(min, max) {
        return min + Math.random() * (max - min);
    }

    function ensureDom() {
        state.overlay = document.getElementById('introOverlay');
        state.stage = document.getElementById('introSpriteStage');
        return !!(state.overlay && state.stage);
    }

    function overlayRect() {
        const rect = state.overlay.getBoundingClientRect();
        state.stageW = rect.width || window.innerWidth || 1280;
        state.stageH = rect.height || window.innerHeight || 720;
        return rect;
    }

    function localRect(el) {
        if (!el || !el.getBoundingClientRect || !state.overlay) return null;
        const overlay = overlayRect();
        const rect = el.getBoundingClientRect();
        return {
            left: rect.left - overlay.left,
            right: rect.right - overlay.left,
            top: rect.top - overlay.top,
            bottom: rect.bottom - overlay.top,
            width: rect.width,
            height: rect.height
        };
    }

    function playSound(name) {
        if (window.Assets && window.Assets.playSound) window.Assets.playSound(name);
    }

    function prefersReducedMotion() {
        return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function clearNodeList(list) {
        list.forEach(function (item) {
            if (item.element && item.element.parentNode) item.element.parentNode.removeChild(item.element);
        });
        list.length = 0;
    }

    function buildCeremonyLayout() {
        const crawl = localRect(document.querySelector('.intro-crawl-frame'));
        const logo = localRect(document.querySelector('.intro-logo-block'));
        state.crawlRect = crawl;
        const leftX = crawl ? crawl.left - 92 : state.stageW * 0.18;
        const rightX = crawl ? crawl.right + 58 : state.stageW * 0.76;
        const topY = logo ? logo.bottom + 10 : state.stageH * 0.22;
        state.sideTargets = CEREMONY_CAST.map(function (name, index) {
            const isLeft = index % 2 === 0;
            const columnIndex = Math.floor(index / 2);
            const y = topY + columnIndex * (prefersReducedMotion() ? 38 : 34);
            return {
                type: name,
                side: isLeft ? 'left' : 'right',
                x: isLeft ? leftX : rightX,
                y: y
            };
        });
    }

    function createActor(spec, index) {
        const sprite = SPRITES[spec.type];
        const el = document.createElement('div');
        el.className = 'intro-sprite-actor';
        el.setAttribute('aria-label', spec.type);
        const startX = spec.side === 'left' ? -60 - index * 18 : state.stageW + 30 + index * 18;
        const actor = {
            type: spec.type,
            sprite: sprite,
            element: el,
            width: sprite.size.w,
            height: sprite.size.h,
            x: startX,
            y: spec.y,
            targetX: spec.x,
            targetY: spec.y,
            direction: spec.side === 'left' ? 1 : -1,
            state: 'walk',
            frameIndex: 0,
            frameTimer: 0,
            bobPhase: rand(0, Math.PI * 2)
        };
        state.stage.appendChild(el);
        state.actors.push(actor);
        return actor;
    }

    function setupCeremony() {
        clearNodeList(state.actors);
        buildCeremonyLayout();
        state.sideTargets.forEach(function (spec, index) {
            createActor(spec, index);
        });
    }

    function pickFrame(actor) {
        const pool = actor.sprite.frames[actor.state] || actor.sprite.frames.walk || actor.sprite.frames.idle;
        return pool[actor.frameIndex % pool.length];
    }

    function actorArrived(actor) {
        return Math.abs(actor.x - actor.targetX) < 6;
    }

    function allArrived() {
        return state.actors.every(actorArrived);
    }

    function setPhase(nextPhase) {
        if (state.phase === nextPhase) return;
        state.phase = nextPhase;
        state.phaseStartedAt = state.elapsed;
        state.phaseElapsed = 0;
    }

    function dispatchIntroEvent(name) {
        document.dispatchEvent(new CustomEvent(name));
    }

    function processionBehavior(actor, dt) {
        const step = 76 * dt * 0.001;
        if (!actorArrived(actor)) {
            const dir = actor.targetX > actor.x ? 1 : -1;
            actor.direction = dir;
            actor.x += dir * Math.min(Math.abs(actor.targetX - actor.x), step);
            actor.state = 'walk';
            return;
        }

        actor.state = 'idle';
        actor.y = actor.targetY;
    }

    function updateActor(actor, dt) {
        actor.frameTimer += dt;
        if (actor.frameTimer > (prefersReducedMotion() ? 220 : 140)) {
            actor.frameTimer = 0;
            actor.frameIndex = (actor.frameIndex + 1) % 2;
        }

        if (state.phase === 'procession') processionBehavior(actor, dt);
        else {
            actor.state = 'idle';
            actor.x = actor.targetX;
            actor.y = actor.targetY;
        }

        const frame = pickFrame(actor);
        actor.element.style.width = actor.width + 'px';
        actor.element.style.height = actor.height + 'px';
        actor.element.style.backgroundImage = 'url("' + frame + '")';
        actor.element.style.transform = 'translate(' + actor.x.toFixed(1) + 'px,' + actor.y.toFixed(1) + 'px) scaleX(' + actor.direction + ')';
        actor.element.style.opacity = '1';
    }

    function updatePhase() {
        state.phaseElapsed = state.elapsed - state.phaseStartedAt;
        if (state.phase === 'procession') {
            if (allArrived() && state.phaseElapsed >= PROCESSION_SETTLE_MS) {
                setPhase('idle');
                if (!state.processionReadyFired) {
                    state.processionReadyFired = true;
                    dispatchIntroEvent('gwa:intro-procession-ready');
                }
            }
        }
    }

    function tick(now) {
        if (!state.active) return;
        if (state.paused || document.hidden) {
            state.lastTime = now;
            state.rafId = requestAnimationFrame(tick);
            return;
        }
        if (!state.lastTime) state.lastTime = now;
        const dt = Math.min(40, now - state.lastTime || 16);
        state.lastTime = now;
        state.elapsed += dt;
        updatePhase();

        state.actors.forEach(function (actor) {
            updateActor(actor, dt);
        });
        if (state.phase === 'procession' && !prefersReducedMotion() && !allArrived()) {
            if (!state.walkingSoundAt || (state.elapsed - state.walkingSoundAt) >= 240) {
                state.walkingSoundAt = state.elapsed;
                playSound('stepWood');
            }
        }
        state.rafId = requestAnimationFrame(tick);
    }

    function stop() {
        state.active = false;
        state.paused = false;
        state.walkingSoundAt = 0;
        if (state.rafId) cancelAnimationFrame(state.rafId);
        state.rafId = 0;
        clearNodeList(state.actors);
    }

    function musicCue() {
        return null;
    }

    function allSpriteUrls() {
        const urls = [];
        Object.keys(SPRITES).forEach(function (key) {
            const sprite = SPRITES[key];
            Object.keys(sprite.frames).forEach(function (frameName) {
                sprite.frames[frameName].forEach(function (url) {
                    if (urls.indexOf(url) === -1) urls.push(url);
                });
            });
        });
        return urls;
    }

    function preloadShowcaseAssets() {
        if (state.readyPromise) return state.readyPromise;
        const urls = allSpriteUrls();
        state.readyPromise = Promise.all(urls.map(function (url) {
            return new Promise(function (resolve) {
                const img = new Image();
                img.decoding = 'async';
                img.onload = resolve;
                img.onerror = resolve;
                img.src = url;
            });
        }));
        return state.readyPromise;
    }

    function bindVisibility() {
        if (state.visibilityBound) return;
        state.visibilityBound = true;
        document.addEventListener('visibilitychange', function () {
            state.paused = document.hidden;
        });
    }

    window.IntroSpriteShowcase = {
        getMusicCue: musicCue,

        prime: preloadShowcaseAssets,

        start: function () {
            if (!ensureDom()) return;
            bindVisibility();
            preloadShowcaseAssets().then(function () {
                if (!ensureDom()) return;
                stop();
                state.active = true;
                state.paused = document.hidden;
                state.lastTime = 0;
                state.elapsed = 0;
                state.phaseElapsed = 0;
                state.phaseStartedAt = 0;
                state.phase = 'procession';
                state.processionReadyFired = false;
                state.walkingSoundAt = 0;
                setupCeremony();
                state.rafId = requestAnimationFrame(tick);
            });
        },

        stop: stop
    };
})();

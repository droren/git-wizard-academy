(function () {
    const PRELUDE_MS = 4600;
    const CRAWL_MS = 36000;
    const CHEER_MS = 2200;
    const FADE_MS = 900;
    const TOTAL_MS = PRELUDE_MS + CRAWL_MS + CHEER_MS + FADE_MS;

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

    const PROP_SPRITES = {
        torch: { src: 'assets/sprites/intro/props/torch.png', w: 22, h: 34 },
        coinGold: { src: 'assets/sprites/intro/props/coinGold.png', w: 18, h: 18 },
        gemBlue: { src: 'assets/sprites/intro/props/gemBlue.png', w: 18, h: 18 },
        keyBlue: { src: 'assets/sprites/intro/props/keyBlue.png', w: 20, h: 18 },
        bomb: { src: 'assets/sprites/intro/props/bomb.png', w: 20, h: 20 },
        fireball: { src: 'assets/sprites/intro/props/fireball.png', w: 20, h: 20 },
        swordSilver: { src: 'assets/sprites/intro/props/swordSilver.png', w: 12, h: 34 },
        shieldSilver: { src: 'assets/sprites/intro/props/shieldSilver.png', w: 24, h: 28 },
        extraCrate: { src: 'assets/sprites/intro/props/extra_crate.png', w: 28, h: 28 },
        pen: { src: 'assets/sprites/intro/props/drawing_pen.png', w: 20, h: 20 },
        pencil: { src: 'assets/sprites/intro/props/drawing_pencil.png', w: 20, h: 20 }
    };

    const state = {
        overlay: null,
        stage: null,
        info: null,
        actors: [],
        props: [],
        phase: 'idle',
        active: false,
        lastTime: 0,
        elapsed: 0,
        rafId: 0,
        lastScrollCueAt: 0,
        lastCheerCueAt: 0,
        sideTargets: [],
        crawlRect: null,
        stageW: 0,
        stageH: 0
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
        state.info = document.getElementById('introSpriteSummary');
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
            const y = topY + columnIndex * 34;
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
        const el = document.createElement('button');
        el.type = 'button';
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
            bobPhase: rand(0, Math.PI * 2),
            jitterAt: rand(900, 3400),
            tripped: false,
            sleepy: Math.random() < 0.2,
            bored: Math.random() < 0.16,
            lookAtUntil: 0,
            shuffleUntil: 0,
            nudgeX: 0,
            role: spec.side,
            phaseHint: 'march',
            nextStepAt: rand(80, 220)
        };
        el.addEventListener('click', function () {
            actor.state = 'jump';
            actor.phaseHint = 'poked';
            actor.bounceUntil = state.elapsed + 450;
            playSound('swish');
        });
        state.stage.appendChild(el);
        state.actors.push(actor);
        return actor;
    }

    function spawnProp(name, x, y, className) {
        const sprite = PROP_SPRITES[name];
        if (!sprite) return null;
        const el = document.createElement('div');
        el.className = 'intro-prop ' + (className || '');
        el.style.width = sprite.w + 'px';
        el.style.height = sprite.h + 'px';
        el.style.backgroundImage = 'url("' + sprite.src + '")';
        el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
        state.stage.appendChild(el);
        const prop = { name: name, element: el, x: x, y: y, w: sprite.w, h: sprite.h };
        state.props.push(prop);
        return prop;
    }

    function populateSceneProps() {
        clearNodeList(state.props);
        const crawl = state.crawlRect;
        if (!crawl) return;
        spawnProp('torch', crawl.left - 36, crawl.bottom - 54, 'intro-prop-static');
        spawnProp('torch', crawl.right + 18, crawl.bottom - 54, 'intro-prop-static');
        spawnProp('shieldSilver', crawl.left - 18, crawl.top + 36, 'intro-prop-static');
        spawnProp('swordSilver', crawl.right + 18, crawl.top + 34, 'intro-prop-static');
        spawnProp('extraCrate', crawl.left + 26, crawl.bottom + 6, 'intro-prop-static');
        spawnProp('pen', crawl.right - 38, crawl.bottom + 14, 'intro-prop-static');
    }

    function setupCeremony() {
        clearNodeList(state.actors);
        buildCeremonyLayout();
        populateSceneProps();
        state.sideTargets.forEach(function (spec, index) {
            createActor(spec, index);
        });
        if (state.info) {
            state.info.textContent = 'The ceremony is forming. Watch the crews line up before the chronicle begins.';
        }
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

    function processionBehavior(actor, dt) {
        const step = 76 * dt * 0.001;
        if (!actorArrived(actor)) {
            const dir = actor.targetX > actor.x ? 1 : -1;
            actor.direction = dir;
            actor.x += dir * Math.min(Math.abs(actor.targetX - actor.x), step);
            actor.state = 'walk';
            actor.nextStepAt -= dt;
            if (actor.nextStepAt <= 0) {
                actor.nextStepAt = rand(220, 420);
                playSound('stepWood');
            }
            return;
        }

        actor.state = actor.sleepy ? 'idle' : 'walk';
        if (!actor.tripped && state.elapsed > actor.jitterAt && Math.random() < 0.03) {
            actor.tripped = true;
            actor.state = 'hurt';
            actor.y += 4;
            playSound('push');
        }
        if (actor.tripped && Math.random() < 0.08) {
            actor.tripped = false;
            actor.y = actor.targetY;
        }
        actor.bobPhase += dt * 0.002;
        actor.y = actor.targetY + (actor.sleepy ? Math.sin(actor.bobPhase) * 2.2 : 0);
    }

    function makeProjectile(name, fromActor, towardActor) {
        const sprite = PROP_SPRITES[name];
        if (!sprite) return;
        const el = document.createElement('div');
        el.className = 'intro-prop intro-prop-flying';
        el.style.width = sprite.w + 'px';
        el.style.height = sprite.h + 'px';
        el.style.backgroundImage = 'url("' + sprite.src + '")';
        state.stage.appendChild(el);
        const prop = {
            name: name,
            element: el,
            x: fromActor.x + fromActor.width * 0.4,
            y: fromActor.y + 12,
            w: sprite.w,
            h: sprite.h,
            vx: towardActor ? (towardActor.x - fromActor.x) / 0.55 : (fromActor.direction > 0 ? 110 : -110),
            vy: towardActor ? -18 : -42,
            flying: true,
            fadeAt: state.elapsed + 850
        };
        state.props.push(prop);
        playSound(name === 'coinGold' ? 'pickup' : 'throw');
    }

    function processionAntics() {
        if (state.elapsed < 1000 || Math.random() > 0.045) return;
        const actors = state.actors;
        if (!actors.length) return;
        const actor = actors[Math.floor(Math.random() * actors.length)];
        if (!actorArrived(actor)) return;

        if (actor.type === 'mouse' || actor.type === 'spider') {
            actor.targetY += actor.type === 'mouse' ? -6 : 4;
            actor.state = 'walk';
            return;
        }

        if (actor.type.indexOf('alien') === 0 && Math.random() < 0.35) {
            actor.state = 'jump';
            actor.bounceUntil = state.elapsed + 420;
            playSound('swish');
            return;
        }

        if ((actor.type === 'female' || actor.type === 'adventurer') && Math.random() < 0.3) {
            makeProjectile('coinGold', actor, pick(state.actors.filter(function (candidate) { return candidate !== actor; })));
            return;
        }

        if (actor.type === 'zombie' && Math.random() < 0.25) {
            actor.sleepy = true;
            return;
        }

        if (actor.type === 'frog' || actor.type === 'slime') {
            actor.state = 'jump';
            actor.bounceUntil = state.elapsed + 360;
            playSound('jump');
            return;
        }

        actor.state = 'hurt';
        playSound('push');
    }

    function scrollBehavior(actor, dt) {
        actor.bobPhase += dt * 0.0022;
        if (actor.shuffleUntil && state.elapsed < actor.shuffleUntil) {
            actor.nudgeX = Math.sin((state.elapsed - (actor.shuffleUntil - 420)) * 0.03) * 5;
            actor.state = 'walk';
        } else {
            actor.nudgeX *= 0.82;
        }
        actor.x = actor.targetX + actor.nudgeX;
        actor.y = actor.targetY + (actor.bored ? Math.sin(actor.bobPhase) * 1.5 : 0);
        if (actor.bounceUntil && state.elapsed < actor.bounceUntil) {
            actor.state = 'jump';
            actor.y -= Math.abs(Math.sin((state.elapsed - (actor.bounceUntil - 420)) * 0.02)) * 12;
        } else if (actor.sleepy) {
            actor.state = 'idle';
            actor.y += Math.sin(actor.bobPhase * 0.9) * 2.5;
        } else if (actor.lookAtUntil && state.elapsed < actor.lookAtUntil) {
            actor.state = 'walk';
            actor.direction = actor.role === 'left' ? 1 : -1;
        } else {
            actor.state = 'idle';
        }
    }

    function scrollAntics() {
        if (state.elapsed - state.lastScrollCueAt < 1450) return;
        state.lastScrollCueAt = state.elapsed;
        const actor = pick(state.actors);
        if (!actor) return;
        if (actor.type === 'mouse' || actor.type === 'spider') {
            actor.targetY += actor.type === 'mouse' ? 2 : -2;
            playSound('stepWood');
        } else if (actor.type.indexOf('alien') === 0) {
            actor.state = 'hurt';
            actor.shuffleUntil = state.elapsed + 420;
            playSound('swish');
        } else if (actor.type === 'zombie') {
            actor.sleepy = !actor.sleepy;
        } else if (actor.type === 'bee' || actor.type === 'fly') {
            actor.bounceUntil = state.elapsed + 300;
            playSound('jump');
        } else if (actor.type === 'female' || actor.type === 'adventurer') {
            actor.lookAtUntil = state.elapsed + 640;
            actor.direction *= -1;
            playSound('write');
        } else if (actor.type === 'snail' || actor.type === 'slime') {
            actor.shuffleUntil = state.elapsed + 520;
            playSound('push');
        }
    }

    function cheerBehavior(actor) {
        actor.state = 'jump';
        actor.x = actor.targetX;
        actor.y = actor.targetY - Math.abs(Math.sin((state.elapsed - (PRELUDE_MS + CRAWL_MS)) * 0.026 + actor.targetX * 0.01)) * 18;
    }

    function cheerCue() {
        if (state.elapsed - state.lastCheerCueAt < 520) return;
        state.lastCheerCueAt = state.elapsed;
        playSound(Math.random() < 0.5 ? 'success' : 'pickup');
    }

    function updateFlyingProps(dt) {
        for (let i = state.props.length - 1; i >= 0; i -= 1) {
            const prop = state.props[i];
            if (!prop.flying) continue;
            prop.x += prop.vx * dt * 0.001;
            prop.y += prop.vy * dt * 0.001;
            prop.vy += 220 * dt * 0.001;
            if (state.elapsed > prop.fadeAt) {
                if (prop.element && prop.element.parentNode) prop.element.parentNode.removeChild(prop.element);
                state.props.splice(i, 1);
                continue;
            }
            prop.element.style.transform = 'translate(' + prop.x.toFixed(1) + 'px,' + prop.y.toFixed(1) + 'px) rotate(' + ((prop.fadeAt - state.elapsed) * 0.18) + 'deg)';
        }
    }

    function updateActor(actor, dt) {
        actor.frameTimer += dt;
        if (actor.frameTimer > 140) {
            actor.frameTimer = 0;
            actor.frameIndex = (actor.frameIndex + 1) % 4;
        }

        if (state.phase === 'procession') processionBehavior(actor, dt);
        else if (state.phase === 'scroll') scrollBehavior(actor, dt);
        else if (state.phase === 'cheer') cheerBehavior(actor);

        const frame = pickFrame(actor);
        actor.element.style.width = actor.width + 'px';
        actor.element.style.height = actor.height + 'px';
        actor.element.style.backgroundImage = 'url("' + frame + '")';
        actor.element.style.transform = 'translate(' + actor.x.toFixed(1) + 'px,' + actor.y.toFixed(1) + 'px) scaleX(' + actor.direction + ')';
        if (state.phase === 'fade') {
            actor.element.style.opacity = String(Math.max(0, 1 - ((state.elapsed - (TOTAL_MS - FADE_MS)) / FADE_MS)));
        } else {
            actor.element.style.opacity = '1';
        }
    }

    function updatePhase() {
        if (state.elapsed < PRELUDE_MS) {
            state.phase = 'procession';
            if (state.info) state.info.textContent = 'The gathered crews line the hall as the chronicle prepares to rise.';
        } else if (state.elapsed < PRELUDE_MS + CRAWL_MS) {
            state.phase = 'scroll';
            if (state.info) state.info.textContent = 'The chronicle is now rolling. Watch the attendants fidget, yawn, and try to stay ceremonial.';
        } else if (state.elapsed < PRELUDE_MS + CRAWL_MS + CHEER_MS) {
            state.phase = 'cheer';
            if (state.info) state.info.textContent = 'The chronicle is complete. Everyone cheers before the academy opens its gates.';
        } else if (state.elapsed < TOTAL_MS) {
            state.phase = 'fade';
            if (state.info) state.info.textContent = 'The ceremony fades as the academy opens.';
        } else {
            state.phase = 'fade';
        }
    }

    function tick(now) {
        if (!state.active) return;
        if (!state.lastTime) state.lastTime = now;
        const dt = Math.min(40, now - state.lastTime || 16);
        state.lastTime = now;
        state.elapsed += dt;
        updatePhase();

        if (state.phase === 'procession') processionAntics();
        if (state.phase === 'scroll') scrollAntics();
        if (state.phase === 'cheer') cheerCue();

        state.actors.forEach(function (actor) {
            updateActor(actor, dt);
        });
        updateFlyingProps(dt);
        state.rafId = requestAnimationFrame(tick);
    }

    function stop() {
        state.active = false;
        if (state.rafId) cancelAnimationFrame(state.rafId);
        state.rafId = 0;
        clearNodeList(state.actors);
        clearNodeList(state.props);
    }

    function musicCue() {
        return 'retro';
    }

    window.IntroSpriteShowcase = {
        getPreludeDelay: function () {
            return PRELUDE_MS;
        },

        getTotalRuntime: function () {
            return TOTAL_MS;
        },

        getMusicCue: musicCue,

        start: function () {
            if (!ensureDom()) return;
            stop();
            state.active = true;
            state.lastTime = 0;
            state.elapsed = 0;
            state.lastScrollCueAt = 0;
            state.lastCheerCueAt = 0;
            state.phase = 'procession';
            setupCeremony();
            state.rafId = requestAnimationFrame(tick);
        },

        stop: stop
    };
})();

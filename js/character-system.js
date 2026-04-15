// js/character-system.js
/**
 * Sprite-based character system with lightweight movement, reactions, and ambient life.
 */

(function () {
    const MAX_CHARACTERS = 5;
    const BASE_SIZE = 40;
    const FRAME_SIZE = 48;
    const FRAME_RATE_MS = 110;
    const GRAVITY = 1800;

    const TYPE_DEFS = {
        GitKnight: {
            sprite: 'gitknight',
            label: 'GitKnight',
            tone: 'mentor',
            walkSound: 'step',
            jumpSound: 'boing',
            pokeSound: 'pop',
            attackSound: 'success',
            fleeSound: 'switch'
        },
        MergeGoblin: {
            sprite: 'mergegoblin',
            label: 'Merge Goblin',
            tone: 'boss',
            walkSound: 'step',
            jumpSound: 'boing',
            pokeSound: 'pop',
            attackSound: 'glitch',
            fleeSound: 'alarm2'
        },
        LintImp: {
            sprite: 'lintimp',
            label: 'Lint Imp',
            tone: 'trickster',
            walkSound: 'step',
            jumpSound: 'boing',
            pokeSound: 'pop',
            attackSound: 'glitch',
            fleeSound: 'alarm2'
        },
        CIDragon: {
            sprite: 'cidragon',
            label: 'CI Dragon',
            tone: 'boss',
            walkSound: 'step',
            jumpSound: 'boing',
            pokeSound: 'pop',
            attackSound: 'alarm',
            fleeSound: 'alarm2'
        }
    };

    const TYPE_ALIASES = {
        gitKnight: 'GitKnight',
        gitknight: 'GitKnight',
        mergeGoblin: 'MergeGoblin',
        mergegoblin: 'MergeGoblin',
        lintImp: 'LintImp',
        lintimp: 'LintImp',
        ciDragon: 'CIDragon',
        cidragon: 'CIDragon'
    };

    const state = {
        stage: null,
        characters: [],
        byId: Object.create(null),
        running: false,
        paused: false,
        raf: 0,
        ambientTimer: 0,
        lastAmbientAt: 0,
        lastUpdate: 0,
        visibilityBound: false
    };

    function now() {
        return (window.performance && performance.now) ? performance.now() : Date.now();
    }

    function prefersReducedMotion() {
        return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    const raf = window.requestAnimationFrame
        ? window.requestAnimationFrame.bind(window)
        : function (fn) { return setTimeout(function () { fn(now()); }, 16); };
    const caf = window.cancelAnimationFrame
        ? window.cancelAnimationFrame.bind(window)
        : function (id) { clearTimeout(id); };

    function ensureStage() {
        if (state.stage && document.body.contains(state.stage)) return state.stage;
        state.stage = document.getElementById('characterStage');
        if (!state.stage) {
            state.stage = document.createElement('div');
            state.stage.id = 'characterStage';
            state.stage.className = 'character-stage';
            document.body.appendChild(state.stage);
        }
        return state.stage;
    }

    function getViewportRect() {
        const docEl = document.documentElement || {};
        const w = window.innerWidth || docEl.clientWidth || 1280;
        const h = window.innerHeight || docEl.clientHeight || 720;
        return { left: 0, top: 0, right: w, bottom: h, width: w, height: h };
    }

    function rectForElement(id) {
        const el = document.getElementById(id);
        if (!el || !el.getBoundingClientRect) return null;
        const rect = el.getBoundingClientRect();
        if (!rect || !rect.width || !rect.height) return null;
        return rect;
    }

    function getPanelRects() {
        return {
            lesson: rectForElement('lessonContent') || rectForElement('lesson-panel') || rectForElement('lessonPanel'),
            terminal: rectForElement('terminalOutput') || rectForElement('terminal-panel') || rectForElement('terminalPanel'),
            objectives: rectForElement('objectivesPanelContent') || rectForElement('currentObjectiveList') || rectForElement('sidebar-panel'),
            sidebar: rectForElement('achievementsPanelContent') || rectForElement('levelMapPanelContent')
        };
    }

    function panelEdgePoints(rect, margin, topOffset) {
        if (!rect) return [];
        const m = margin || 10;
        const top = (rect.top || 0) - m + (topOffset || 0);
        const left = (rect.left || 0) - m;
        const right = (rect.right || 0) + m;
        const bottom = (rect.bottom || 0) + m;
        const midX = (left + right) / 2;
        const midY = (top + bottom) / 2;
        return [
            { x: left, y: top },
            { x: right, y: top },
            { x: right, y: bottom },
            { x: left, y: bottom },
            { x: left, y: top },
            { x: midX, y: top },
            { x: right, y: midY },
            { x: midX, y: bottom },
            { x: left, y: midY }
        ];
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function pickPathForType(type, opts) {
        const rects = getPanelRects();
        const viewport = getViewportRect();
        const margin = opts && opts.margin ? opts.margin : 14;
        let rect = null;
        if (type === 'MergeGoblin' || type === 'CIDragon') rect = rects.terminal || rects.lesson || rects.objectives;
        else if (type === 'LintImp') rect = rects.terminal || rects.lesson;
        else if (type === 'GitKnight') rect = rects.objectives || rects.lesson;
        if (!rect) {
            rect = {
                left: viewport.width * 0.1,
                top: viewport.height * 0.2,
                right: viewport.width * 0.9,
                bottom: viewport.height * 0.8
            };
        }
        const points = panelEdgePoints(rect, margin, 0);
        const target = opts && opts.target === 'flee'
            ? [
                { x: viewport.width + 80, y: rect.top - 20 },
                { x: viewport.width + 120, y: rect.top + 40 }
            ]
            : points;
        return target.map(function (p) {
            return {
                x: clamp(p.x, -90, viewport.width + 90),
                y: clamp(p.y, 20, viewport.height - 20)
            };
        });
    }

    function playSound(name) {
        if (window.Assets && window.Assets.playSound) {
            window.Assets.playSound(name);
        }
    }

    function makeCanvasFrame(baseImage, drawFn) {
        const canvas = document.createElement('canvas');
        canvas.width = FRAME_SIZE;
        canvas.height = FRAME_SIZE;
        const ctx = canvas.getContext && canvas.getContext('2d');
        if (!ctx) return null;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, FRAME_SIZE, FRAME_SIZE);
        drawFn(ctx, baseImage);
        return canvas.toDataURL('image/png');
    }

    function loadImage(spriteName) {
        if (!window.Assets || !window.Assets.getSprite) return null;
        const img = window.Assets.getSprite(spriteName);
        return img || null;
    }

    function buildFrames(type, action) {
        const def = TYPE_DEFS[type] || TYPE_DEFS.GitKnight;
        const spriteName = def.sprite;
        const img = loadImage(spriteName);
        const cacheKey = type + ':' + action + ':' + spriteName;
        state._frameCache = state._frameCache || {};
        if (state._frameCache[cacheKey]) return state._frameCache[cacheKey];

        const fallbackSrc = img && img.src ? img.src : '';
        const sourceReady = img && img.complete && img.naturalWidth > 0;
        if (!sourceReady) {
            const fallback = new Array(action === 'idle' ? 2 : 4).fill(fallbackSrc);
            state._frameCache[cacheKey] = fallback;
            if (img && !img._gwaFrameHooked && typeof img.addEventListener === 'function') {
                img._gwaFrameHooked = true;
                img.addEventListener('load', function () {
                    delete state._frameCache[cacheKey];
                }, { once: true });
            }
            return fallback;
        }

        const frames = [];
        const cycles = action === 'idle' ? 2 : action === 'jump' ? 3 : action === 'attack' ? 3 : 4;
        for (let i = 0; i < cycles; i++) {
            const bob = action === 'idle' ? (i % 2 === 0 ? -1 : 1) : action === 'jump' ? (i === 1 ? -8 : 0) : action === 'flee' ? -1 : (i % 2 === 0 ? 0 : 1);
            const flip = action === 'flee' ? true : (type === 'MergeGoblin' && i % 2 === 1);
            const scale = action === 'attack' ? 1.04 : action === 'jump' ? 0.96 : 1;
            const tint = action === 'attack' ? 'rgba(255,91,87,0.15)' : action === 'flee' ? 'rgba(88,166,255,0.10)' : '';
            const frame = makeCanvasFrame(img, function (ctx) {
                ctx.translate(FRAME_SIZE / 2, FRAME_SIZE / 2 + bob);
                if (flip) ctx.scale(-1, 1);
                if (action === 'jump') ctx.rotate(i === 1 ? -0.08 : 0.04);
                const baseSize = action === 'jump' ? 30 : 32;
                const dw = baseSize * scale;
                const dh = baseSize * scale;
                ctx.globalAlpha = 0.25;
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.ellipse(0, 17, 9, 4, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
                ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
                if (tint) {
                    ctx.fillStyle = tint;
                    ctx.fillRect(-dw / 2, -dh / 2, dw, dh);
                }
            });
            frames.push(frame || fallbackSrc);
        }

        state._frameCache[cacheKey] = frames;
        return frames;
    }

    function spriteElementFor(type, action) {
        const img = document.createElement('img');
        img.className = 'character-sprite-img';
        img.alt = type;
        img.draggable = false;
        const frames = buildFrames(type, action);
        img.dataset.frames = JSON.stringify(frames);
        img.src = frames[0] || (loadImage(TYPE_DEFS[type]?.sprite || 'gitknight') || {}).src || '';
        return img;
    }

    function removeCharacter(id) {
        const entry = state.byId[id];
        if (!entry) return;
        if (entry.removeTimer) clearTimeout(entry.removeTimer);
        if (entry.frameTimer) clearInterval(entry.frameTimer);
        if (entry.el && entry.el.parentNode) entry.el.parentNode.removeChild(entry.el);
        delete state.byId[id];
        const idx = state.characters.findIndex(function (c) { return c.id === id; });
        if (idx >= 0) state.characters.splice(idx, 1);
    }

    function clearAll() {
        const ids = state.characters.map(function (c) { return c.id; });
        ids.forEach(removeCharacter);
        const stage = ensureStage();
        stage.classList.remove('stage-shake', 'stage-glitch', 'stage-alert');
    }

    function animateElement(char) {
        if (!char || !char.frames || !char.frames.length) return;
        char.frameIndex = (char.frameIndex + 1) % char.frames.length;
        if (char.img && char.frames[char.frameIndex]) {
            char.img.src = char.frames[char.frameIndex];
        }
    }

    function setFrames(char, action) {
        const nextFrames = buildFrames(char.type, action);
        const previousFirst = char.frames && char.frames[0] ? char.frames[0] : '';
        const nextFirst = nextFrames && nextFrames[0] ? nextFrames[0] : '';
        if (char.action === action && previousFirst === nextFirst && Array.isArray(char.frames) && char.frames.length === nextFrames.length) {
            return;
        }

        char.action = action;
        char.frames = nextFrames;
        char.frameIndex = 0;
        if (char.img && char.frames[0]) {
            char.img.src = char.frames[0];
        }
    }

    function applyStateClass(char) {
        if (!char || !char.el) return;
        const classes = ['is-idle', 'is-walking', 'is-jumping', 'is-annoying', 'is-fighting', 'is-fleeing'];
        classes.forEach(function (c) { char.el.classList.remove(c); });
        char.el.classList.add('is-' + char.state);
    }

    function updateShadow(char) {
        if (!char.shadow) return;
        const scale = char.state === 'jumping' ? 0.72 : char.state === 'fleeing' ? 0.68 : 1;
        const opacity = char.state === 'jumping' ? 0.18 : 0.28;
        char.shadow.style.transform = 'translate(-50%, -50%) scale(' + scale + ')';
        char.shadow.style.opacity = String(opacity);
    }

    function updateLabel(char) {
        if (!char.labelEl) return;
        char.labelEl.textContent = char.label;
    }

    function moveToward(char, target, speedPx, dt) {
        const dx = target.x - char.x;
        const dy = target.y - char.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const step = Math.min(speedPx * dt, dist);
        char.x += (dx / dist) * step;
        char.y += (dy / dist) * step;
        char.facing = dx < 0 ? -1 : 1;
        if (Math.abs(dy) > 10 && char.state !== 'jumping') {
            char.state = 'walking';
        }
        if (dist < 8) {
            return true;
        }
        return false;
    }

    function randomRange(min, max) {
        return min + Math.random() * (max - min);
    }

    function defaultSpawnPoint(type) {
        const viewport = getViewportRect();
        if (type === 'LintImp') return { x: viewport.width - 80, y: viewport.height * 0.62 };
        if (type === 'MergeGoblin') return { x: viewport.width * 0.72, y: viewport.height * 0.55 };
        if (type === 'CIDragon') return { x: viewport.width * 0.65, y: viewport.height * 0.48 };
        return { x: 24, y: viewport.height * 0.62 };
    }

    function createCharacter(type, options) {
        const stage = ensureStage();
        const resolvedType = TYPE_ALIASES[type] || type || 'GitKnight';
        const def = TYPE_DEFS[resolvedType] || TYPE_DEFS.GitKnight;
        const id = (options && options.id) || (resolvedType.toLowerCase() + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000));
        const img = spriteElementFor(resolvedType, options && options.action ? options.action : 'idle');
        const el = document.createElement('div');
        const shadow = document.createElement('div');
        const labelEl = document.createElement('div');

        el.className = 'game-character character-' + resolvedType.toLowerCase() + ' tone-' + def.tone;
        el.dataset.characterId = id;
        el.style.zIndex = String((options && options.zIndex) || 20);
        el.style.position = 'absolute';
        el.style.pointerEvents = options && options.interactive ? 'auto' : 'none';
        el.style.left = '0px';
        el.style.top = '0px';
        el.style.width = FRAME_SIZE + 'px';
        el.style.height = (FRAME_SIZE + 14) + 'px';

        shadow.className = 'character-shadow';
        labelEl.className = 'character-label character-label-floating';
        labelEl.textContent = (options && options.label) ? options.label : def.label;
        if (options && options.hideLabel) {
            labelEl.style.display = 'none';
        }

        img.className = 'character-sprite-img';

        shadow.style.position = 'absolute';
        shadow.style.left = '50%';
        shadow.style.top = (FRAME_SIZE - 4) + 'px';
        shadow.style.width = '18px';
        shadow.style.height = '8px';
        shadow.style.borderRadius = '50%';
        shadow.style.background = 'rgba(0, 0, 0, 0.34)';
        shadow.style.transform = 'translate(-50%, -50%)';
        shadow.style.filter = 'blur(2px)';
        shadow.style.pointerEvents = 'none';

        img.style.position = 'absolute';
        img.style.left = '50%';
        img.style.top = '0px';
        img.style.width = BASE_SIZE + 'px';
        img.style.height = BASE_SIZE + 'px';
        img.style.transform = 'translateX(-50%)';
        img.style.imageRendering = 'pixelated';
        img.style.pointerEvents = 'none';
        img.style.userSelect = 'none';
        img.style.filter = 'drop-shadow(0 2px 0 rgba(0,0,0,0.2))';

        labelEl.style.position = 'absolute';
        labelEl.style.left = '50%';
        labelEl.style.top = (FRAME_SIZE + 2) + 'px';
        labelEl.style.transform = 'translateX(-50%)';
        labelEl.style.fontSize = '0.62rem';
        labelEl.style.whiteSpace = 'nowrap';
        labelEl.style.padding = '2px 6px';
        labelEl.style.borderRadius = '999px';
        labelEl.style.background = 'rgba(9, 16, 27, 0.72)';
        labelEl.style.border = '1px solid rgba(255,255,255,0.08)';
        labelEl.style.pointerEvents = 'none';

        el.appendChild(shadow);
        el.appendChild(img);
        el.appendChild(labelEl);
        stage.appendChild(el);

        const start = options && typeof options.x === 'number' && typeof options.y === 'number'
            ? { x: options.x, y: options.y }
            : options && typeof options.left === 'number' && typeof options.top === 'number'
                ? { x: options.left, y: options.top }
            : defaultSpawnPoint(resolvedType);

        const char = {
            id: id,
            type: resolvedType,
            element: el,
            img: img,
            shadow: shadow,
            labelEl: labelEl,
            label: (options && options.label) ? options.label : def.label,
            x: start.x,
            y: start.y,
            state: (options && options.state) || 'idle',
            velocity: { x: 0, y: 0 },
            target: null,
            path: [],
            pathIndex: 0,
            pokeCount: 0,
            facing: options && options.facing ? options.facing : 1,
            age: 0,
            life: options && options.lifeMs ? options.lifeMs : 0,
            baseSpeed: options && options.speed ? options.speed : (resolvedType === 'MergeGoblin' ? 92 : resolvedType === 'LintImp' ? 110 : 72),
            jumpImpulse: options && options.jumpImpulse ? options.jumpImpulse : -720,
            groundY: start.y,
            anchor: options && options.anchor ? options.anchor : null,
            ambient: !!(options && options.ambient),
            hideLabel: !!(options && options.hideLabel),
            removeTimer: null,
            frameTimer: null
        };

        function applyPosition() {
            char.element.style.transform = 'translate3d(' + Math.round(char.x) + 'px,' + Math.round(char.y) + 'px,0) scaleX(' + (char.facing < 0 ? -1 : 1) + ')';
            char.element.style.left = '0px';
            char.element.style.top = '0px';
            char.element.style.opacity = '1';
        }

        function choosePath(action) {
            char.path = pickPathForType(char.type, { target: action === 'flee' ? 'flee' : 'normal' });
            char.pathIndex = 0;
            if (!char.path.length) {
                const vp = getViewportRect();
                char.path = [
                    { x: clamp(start.x + randomRange(-80, 80), 20, vp.width - 20), y: clamp(start.y + randomRange(-50, 50), 20, vp.height - 20) },
                    { x: clamp(start.x + randomRange(-40, 120), 20, vp.width - 20), y: clamp(start.y + randomRange(-60, 60), 20, vp.height - 20) }
                ];
            }
        }

        char.react = function (action) {
            if (action === 'poke') {
                char.pokeCount += 1;
                playSound(def.pokeSound);
                if (window.Effects && window.Effects.pulse) window.Effects.pulse({ left: char.x, top: char.y, lifeMs: 600, scale: 0.6 });
                char.velocity.y = char.jumpImpulse * 0.4;
                char.state = char.pokeCount >= 3 ? 'fleeing' : 'jumping';
                if (char.pokeCount >= 3) {
                    playSound(def.fleeSound);
                    choosePath('flee');
                    char.target = { x: getViewportRect().width + 120, y: char.y - 20 };
                }
                if (char.type === 'MergeGoblin' && window.Effects && window.Effects.glitch) window.Effects.glitch(220);
                if (char.type === 'LintImp' && window.Effects && window.Effects.shake) window.Effects.shake(120);
                setFrames(char, char.state === 'fleeing' ? 'flee' : 'jump');
            } else if (action === 'bump') {
                playSound('switch');
                char.velocity.y = char.jumpImpulse * 0.3;
                char.state = 'jumping';
                setFrames(char, 'jump');
            } else if (action === 'attack') {
                playSound(def.attackSound);
                if (window.Effects && window.Effects.glitch) window.Effects.glitch(300);
                char.state = 'fighting';
                char.velocity.y = char.jumpImpulse * 0.1;
                setFrames(char, 'attack');
            } else if (action === 'flee') {
                playSound(def.fleeSound);
                char.state = 'fleeing';
                choosePath('flee');
                setFrames(char, 'flee');
            }
            if (window.DevLogger && typeof window.DevLogger.log === 'function') {
                window.DevLogger.log('character.react', { id: char.id, type: char.type, action: action });
            }
        };

        char.el = el;
        char.update = function (dt) {
            char.age += dt;

            if (char.life > 0 && char.age > char.life) {
                removeCharacter(char.id);
                return;
            }

            if (char.state === 'jumping' || char.state === 'fighting') {
                char.velocity.y += GRAVITY * dt;
                char.x += char.velocity.x * dt;
                char.y += char.velocity.y * dt;
                if (char.y >= char.groundY) {
                    char.y = char.groundY;
                    char.velocity.y = 0;
                    char.state = char.state === 'fighting' ? 'annoying' : 'idle';
                    setFrames(char, char.state === 'annoying' ? 'attack' : 'idle');
                }
            } else if (char.state === 'fleeing') {
                char.x += (char.velocity.x || 220) * dt;
                char.y += (char.velocity.y || -20) * dt;
                if (char.x > getViewportRect().width + 110 || char.y < -100 || char.y > getViewportRect().height + 120) {
                    removeCharacter(char.id);
                    return;
                }
            } else {
                if (!char.path.length) choosePath('normal');
                const target = char.path[char.pathIndex];
                if (target) {
                    const reached = moveToward(char, target, char.baseSpeed, dt);
                    if (reached) {
                        char.pathIndex = (char.pathIndex + 1) % char.path.length;
                        if (char.type === 'GitKnight' && Math.random() < 0.35) {
                            char.state = 'idle';
                            setFrames(char, 'idle');
                        } else if (char.type === 'LintImp' && Math.random() < 0.5) {
                            char.state = 'annoying';
                            setFrames(char, 'attack');
                        } else {
                            char.state = 'walking';
                            setFrames(char, 'walk');
                        }
                    } else {
                        char.state = 'walking';
                        setFrames(char, 'walk');
                    }
                }
            }

            if (char.state === 'idle') {
                char.y = char.y + Math.sin(char.age * 5) * 0.05;
            }

            char.x = clamp(char.x, -120, getViewportRect().width + 120);
            char.y = clamp(char.y, 10, getViewportRect().height - 20);
            applyPosition();
            updateShadow(char);
            updateLabel(char);
            applyStateClass(char);
        };

        if (options && options.interactive && el.addEventListener) {
            el.addEventListener('click', function () {
                char.react('poke');
            });
        }

        setFrames(char, options && options.state ? options.state : 'idle');
        char.path = [];
        if (options && options.path) {
            char.path = options.path.slice();
        } else {
            choosePath('normal');
        }

        if (options && options.facing) {
            char.facing = options.facing;
        }

        if (options && options.velocity) {
            char.velocity.x = options.velocity.x || 0;
            char.velocity.y = options.velocity.y || 0;
        }

        if (options && options.autoRemoveMs) {
            char.life = options.autoRemoveMs;
        }

        if (options && options.jolt) {
            char.velocity.y = char.jumpImpulse;
            char.state = 'jumping';
            setFrames(char, 'jump');
        }

        state.characters.push(char);
        state.byId[id] = char;
        applyPosition();
        updateShadow(char);
        applyStateClass(char);

        if (state.characters.length > MAX_CHARACTERS) {
            const oldest = state.characters[0];
            if (oldest && oldest.id !== id) removeCharacter(oldest.id);
        }

        if (char.life > 0) {
            char.removeTimer = setTimeout(function () {
                removeCharacter(char.id);
            }, char.life);
        }

        if (window.DevLogger && typeof window.DevLogger.log === 'function') {
            window.DevLogger.log('character.spawn', { id: char.id, type: char.type, options: options || {} });
        }

        return char.id;
    }

    function spawn(type, options) {
        return createCharacter(type, options || {});
    }

    function update(timestamp) {
        if (!state.running) return;
        const time = typeof timestamp === 'number' ? timestamp : now();
        if (state.paused || document.hidden) {
            state.lastUpdate = time;
            state.raf = raf(update);
            return;
        }
        const dt = state.lastUpdate ? Math.min((time - state.lastUpdate) / 1000, 0.06) : 0.016;
        state.lastUpdate = time;

        for (let i = state.characters.length - 1; i >= 0; i--) {
            const char = state.characters[i];
            if (!char || !char.update) continue;
            char.update(dt);
        }

        state.raf = raf(update);
    }

    function startLoop() {
        if (state.running) return;
        state.running = true;
        state.paused = document.hidden;
        state.lastUpdate = now();
        state.raf = raf(update);
    }

    function stopLoop() {
        state.running = false;
        state.paused = false;
        if (state.raf) caf(state.raf);
        state.raf = 0;
    }

    function preloadCoreSprites() {
        if (window.Assets && window.Assets.preload) {
            return window.Assets.preload({
                sprites: ['gitknight', 'mergegoblin', 'lintimp', 'cidragon', 'fire', 'exploding', 'skull']
            });
        }
        return Promise.resolve([]);
    }

    function bindVisibility() {
        if (state.visibilityBound) return;
        state.visibilityBound = true;
        document.addEventListener('visibilitychange', function () {
            state.paused = document.hidden;
        });
    }

    function preloadLevel(levelIndex) {
        if (window.Assets && window.Assets.preloadLevel) {
            window.Assets.preloadLevel(levelIndex);
        }
    }

    function cueNarrator(levelIndex) {
        const lore = window.storyArc && window.storyArc.getLessonLore ? window.storyArc.getLessonLore(levelIndex) : null;
        if (!lore) return null;
        const id = spawn('GitKnight', {
            id: 'mentor-' + levelIndex,
            label: window.storyArc.mentor.avatar + ' ' + window.storyArc.mentor.name,
            x: 28,
            y: getViewportRect().height - 120,
            anchor: 'objectives',
            state: 'idle',
            lifeMs: 3800,
            zIndex: 30
        });
        const char = state.byId[id];
        if (char) {
            char.react('bump');
            if (window.Effects && window.Effects.sparkle) window.Effects.sparkle({ left: char.x, top: char.y, lifeMs: 700, scale: 0.6 });
        }
        return id;
    }

    function cueGuardian(levelIndex) {
        const lore = window.storyArc && window.storyArc.getLessonLore ? window.storyArc.getLessonLore(levelIndex) : null;
        if (!lore) return null;
        const id = spawn('GitKnight', {
            id: 'guardian-' + levelIndex,
            label: lore.guardian.avatar + ' ' + lore.guardian.name,
            x: getViewportRect().width - 120,
            y: getViewportRect().height - 128,
            anchor: 'lesson',
            state: 'idle',
            lifeMs: 4200,
            zIndex: 30
        });
        return id;
    }

    function showBoss(boss) {
        if (!boss) return null;
        clearAll();
        const id = spawn('MergeGoblin', {
            id: 'boss-merge-goblin',
            label: boss.name || 'Merge Conflict Goblin King',
            x: getViewportRect().width - 140,
            y: getViewportRect().height * 0.48,
            state: 'fighting',
            lifeMs: 0,
            zIndex: 36
        });
        const char = state.byId[id];
        if (char) {
            char.react('attack');
            if (boss.avatar && char.labelEl) char.labelEl.textContent = boss.avatar + ' ' + (boss.name || 'Merge Goblin');
        }
        return id;
    }

    function showBossMinions() {
        spawnEffect('fire', { left: getViewportRect().width * 0.62, top: getViewportRect().height * 0.58, lifeMs: 850, scale: 0.8, fallbackEmoji: '🔥' });
        spawnEffect('skull', { left: getViewportRect().width * 0.72, top: getViewportRect().height * 0.48, lifeMs: 850, scale: 0.7, fallbackEmoji: '💀' });
    }

    function spawnEffect(name, opts) {
        if (window.Effects && typeof window.Effects.spawn === 'function') {
            const effectType = name === 'fire' ? 'spark' : (name === 'skull' ? 'pulse' : 'spark');
            return window.Effects.spawn(effectType, {
                left: opts && typeof opts.left === 'number' ? opts.left : undefined,
                top: opts && typeof opts.top === 'number' ? opts.top : undefined,
                lifeMs: (opts && opts.lifeMs) || 900,
                scale: (opts && opts.scale) || 1,
                label: opts && opts.fallbackEmoji ? opts.fallbackEmoji : undefined
            });
        }
        return null;
    }

    function reactToEvent(eventName, payload) {
        if (!eventName) return;
        if (window.DevLogger && typeof window.DevLogger.log === 'function') {
            window.DevLogger.log('character.event', { eventName: eventName, payload: payload || {} });
        }

        switch (eventName) {
            case 'level-start':
                if (state.characters.length) clearAll();
                cueNarrator(payload && payload.levelIndex !== undefined ? payload.levelIndex : (window.gameState ? window.gameState.currentLevel : 0));
                cueGuardian(payload && payload.levelIndex !== undefined ? payload.levelIndex : (window.gameState ? window.gameState.currentLevel : 0));
                break;
            case 'commit-success':
                spawnEffect('award', { left: getViewportRect().width * 0.52, top: getViewportRect().height * 0.5, lifeMs: 700, scale: 0.8, fallbackEmoji: '🏆' });
                break;
            case 'commit-rejected':
                spawn('LintImp', {
                    id: 'lint-imp-' + Date.now(),
                    x: getViewportRect().width - 80,
                    y: getViewportRect().height * 0.58,
                    state: 'annoying',
                    lifeMs: 3200,
                    anchor: 'terminal'
                });
                if (window.Effects && window.Effects.glitch) window.Effects.glitch(200);
                break;
            case 'merge-conflict':
                spawn('MergeGoblin', {
                    id: 'boss-merge-goblin',
                    label: 'Merge Conflict Goblin King',
                    x: getViewportRect().width - 150,
                    y: getViewportRect().height * 0.45,
                    state: 'fighting',
                    lifeMs: 0,
                    anchor: 'terminal'
                });
                if (window.Effects && window.Effects.shake) window.Effects.shake(220);
                if (window.Effects && window.Effects.glitch) window.Effects.glitch(480);
                break;
            case 'merge-resolved':
                removeCharacter('boss-merge-goblin');
                spawnEffect('exploding', { left: getViewportRect().width * 0.7, top: getViewportRect().height * 0.5, lifeMs: 850, scale: 0.95, fallbackEmoji: '💥' });
                break;
            case 'lint-fail':
                spawn('LintImp', {
                    id: 'lint-imp-inline-' + Date.now(),
                    x: getViewportRect().width - 90,
                    y: getViewportRect().height * 0.6,
                    state: 'annoying',
                    lifeMs: 2200
                });
                break;
            case 'ci-blocked':
                spawn('CIDragon', {
                    id: 'ci-dragon-' + Date.now(),
                    x: getViewportRect().width - 120,
                    y: getViewportRect().height * 0.5,
                    state: 'fighting',
                    lifeMs: 3800
                });
                break;
            case 'cleanup':
                clearAll();
                break;
            default:
                break;
        }
    }

    function init() {
        ensureStage();
        bindVisibility();
        preloadCoreSprites();
        startLoop();
    }

    const api = {
        characters: state.characters,
        spawn: spawn,
        update: update,
        remove: removeCharacter,
        removeCharacter: removeCharacter,
        clearAll: clearAll,
        preloadLevel: preloadLevel,
        cueNarrator: cueNarrator,
        cueGuardian: cueGuardian,
        showBoss: showBoss,
        showBossMinions: showBossMinions,
        spawnEffect: spawnEffect,
        reactToEvent: reactToEvent,
        init: init,
        start: startLoop,
        stop: stopLoop
    };

    window.characterSystem = api;

    document.addEventListener('DOMContentLoaded', init);
})();

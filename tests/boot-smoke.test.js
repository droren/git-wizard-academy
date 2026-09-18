// tests/boot-smoke.test.js
//
// End-to-end boot smoke test: loads every browser module in index.html order
// against a permissive DOM/global shim, fires DOMContentLoaded, and exercises a
// little real gameplay. It guards against the class of regression where a method
// crashes on application startup (e.g. the `this.progressTracking` bug that
// crashed every fresh load).
//
// This is intentionally tolerant of DOM details (the shim auto-vivifies element
// members) but strict about the application's own logic: any thrown error during
// load or DOMContentLoaded init is a hard failure.

const fs = require('fs');
const vm = require('vm');

// ------------------------------------------------------------------ DOM shim
let listeners = {};
function makeElement() {
    const classList = {
        _s: new Set(),
        toggle(c, v) { if (v === true) this._s.add(c); else if (v === false) this._s.delete(c); else { this._s.has(c) ? this._s.delete(c) : this._s.add(c); } },
        add() { for (const c of arguments) this._s.add(c); },
        remove() { for (const c of arguments) this._s.delete(c); },
        contains(c) { return this._s.has(c); },
        replace(c, n) { if (this._s.has(c)) this._s.delete(c); this._s.add(n); }
     };
    const dataset = {};
    const style = new Proxy({}, {
        get: (t, p) => (p in t ? t[p] : ''),
        set: (t, p, v) => { t[p] = v; return true; }
     });
    const api = {
        getBoundingClientRect() { return { width: 100, height: 100, top: 0, left: 0, right: 100, bottom: 100, x: 0, y: 0 }; },
        setAttribute(k, v) { api['$a_' + k] = v; },
        getAttribute(k) { return api['$a_' + k] ?? null; },
        removeAttribute(k) { delete api['$a_' + k]; },
        hasAttribute(k) { return ('$a_' + k) in api; },
        appendChild(c) { api.children.push(c); return c; },
        removeChild(c) { const i = api.children.indexOf(c); if (i >= 0) api.children.splice(i, 1); return c; },
        insertBefore(a) { api.children.push(a); return a; },
        append() { for (const x of arguments) api.children.push(x); },
        prepend() { for (const x of arguments) api.children.unshift(x); },
        querySelector() { return makeElement(); },
        querySelectorAll() { return []; },
        contains() { return false; },
        focus() {}, blur() {}, click() {}, remove() {}, matches() { return false; },
        closest() { return api; },
        cloneNode() { return makeElement(); },
        getContext() {
            const c = { canvas: api };
            ['setTransform', 'scale', 'translate', 'rotate', 'ellipse', 'save', 'restore', 'clearRect', 'drawImage', 'fillRect', 'strokeRect', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'fill', 'stroke', 'fillText', 'strokeText', 'measureText'].forEach((m) => { c[m] = () => {}; });
            c.createLinearGradient = () => ({ addColorStop() {} });
            c.createRadialGradient = () => ({ addColorStop() {} });
            return c;
         },
        addEventListener(ev, cb) { (listeners[ev] = listeners[ev] || []).push(cb); },
        removeEventListener() {},
        set textContent(v) { this.$text = v; },
        get textContent() { return this.$text || ''; },
        set innerHTML(v) { this.$html = v; },
        get innerHTML() { return this.$html || ''; },
        set value(v) { this.$val = v; },
        get value() { return this.$val || ''; }
     };
    api.classList = classList; api.style = style; api.dataset = dataset;
    api.children = []; api.childNodes = []; api.parentElement = api; api.parentNode = api;
    return new Proxy(api, {
        get(t, p) {
            if (p in t) return t[p];
            if (p === 'contains') return () => false;
            if (typeof p === 'string' && (p[0] === '$')) return () => undefined;
            return () => undefined;
         },
        set(t, p, v) { t[p] = v; return true; }
     });
 }

const document = {
    getElementById() { return makeElement(); },
    createElement() { return makeElement(); },
    createElementNS() { return makeElement(); },
    createDocumentFragment() { return makeElement(); },
    createTextNode() { return makeElement(); },
    createEvent() { return { initEvent() {} }; },
    querySelector() { return makeElement(); },
    querySelectorAll() { return []; },
    addEventListener(ev, cb) { (listeners[ev] = listeners[ev] || []).push(cb); },
    removeEventListener() {},
    dispatchEvent() { return true; },
    body: makeElement(),
    documentElement: makeElement(),
    head: makeElement(),
    get selection() { return { rangeCount: 0, getRangeAt() { return { startContainer: null, endContainer: null }; } }; },
    cookie: '',
    defaultView: null
 };

const storage = {};
const localStorage = {
    getItem(k) { return Object.prototype.hasOwnProperty.call(storage, k) ? storage[k] : null; },
    setItem(k, v) { storage[k] = String(v); },
    removeItem(k) { delete storage[k]; },
    clear() { for (const k of Object.keys(storage)) delete storage[k]; },
    key(i) { return Object.keys(storage)[i] ?? null; },
    get length() { return Object.keys(storage).length; }
 };

function buildEnvironment() {
    listeners = {};
    const win = {
        localStorage, document,
        matchMedia() { return { matches: false, addEventListener() {}, addListener() {} }; },
        addEventListener(ev, cb) { (listeners[ev] = listeners[ev] || []).push(cb); },
        removeEventListener() {},
        // No-op timers keep the process from hanging and the intro RAF loop from spinning.
        requestAnimationFrame() { return 0; },
        cancelAnimationFrame() {},
        setTimeout() { return 0; },
        clearTimeout() {},
        setInterval() { return 0; },
        clearInterval() {},
        performance: { now: () => Date.now() },
        console,
        location: { host: 'localhost:8080', hostname: 'localhost', port: '8080', protocol: 'http:', href: 'http://localhost:8080/', origin: 'http://localhost:8080' },
        navigator: { userAgent: 'node', language: 'en-US' },
        fetch() { throw new Error('fetch is not available in the boot smoke test'); },
        URL,
        Blob: undefined,
        CustomEvent: class CustomEvent { constructor(n, o) { this.type = n; this.detail = (o && o.detail) || null; } },
        MutationObserver: class { observe() {} disconnect() {} },
        Image: function () { const s = {}; s.addEventListener = () => {}; Object.defineProperty(s, 'src', { set() {}, get() { return ''; } }); Object.defineProperty(s, 'complete', { get() { return true; } }); Object.defineProperty(s, 'naturalWidth', { get() { return 10; } }); return s; },
        FileReader: class { readAsText() {} readAsArrayBuffer() {} },
        Audio: function () { const s = {}; s.addEventListener = () => {}; s.play = () => Promise.resolve(); s.pause = () => {}; s.currentTime = 0; return s; },
        HTMLAudioElement: null,
        addEventListenerAlias: null
     };
    win.HTMLAudioElement = win.Audio;
    win.self = win; win.window = win;
    document.defaultView = win;
    return win;
 }

// ------------------------------------------------------------------ module order (matches index.html)
const MODULES = [
   'js/storage-stores.js', 'js/repo-model.js', 'js/file-system.js', 'js/dev-logger.js',
   'js/asset-loader.js', 'js/effects.js', 'js/character-system.js', 'js/intro-sprite-showcase.js',
   'js/ambient-engine.js', 'js/shell-commands.js', 'js/git-commands.js', 'js/achievements.js',
   'js/lessons.js', 'js/lesson-guides.js', 'js/story-arc.js', 'js/objective-rules.js',
   'js/game-engine.js', 'js/ui.js', 'js/export-bridge-client.js', 'js/live-github-client.js', 'js/test-bridge.js'
];

function loadAll() {
    const win = buildEnvironment();
    // Wire globals the modules expect.
    global.window = win;
    global.document = document;
    global.localStorage = localStorage;
    global.self = win;
    global.navigator = win.navigator;
    global.performance = win.performance;
    global.requestAnimationFrame = win.requestAnimationFrame;
    global.cancelAnimationFrame = win.cancelAnimationFrame;
    global.setTimeout = win.setTimeout;
    global.clearTimeout = win.clearTimeout;
    global.setInterval = win.setInterval;
    global.clearInterval = win.clearInterval;
    global.CustomEvent = win.CustomEvent;
    global.URL = URL;
    global.Blob = undefined;
    global.MutationObserver = win.MutationObserver;
    global.Image = win.Image;
    global.FileReader = win.FileReader;
    global.Audio = win.Audio;
    global.HTMLAudioElement = win.HTMLAudioElement;
    global.matchMedia = win.matchMedia;
    global.fetch = win.fetch;

    const dir = require('path').join(__dirname, '..');
    for (const f of MODULES) {
        const src = fs.readFileSync(require('path').join(dir, f), 'utf8');
        try {
            vm.runInThisContext(src, { filename: f });
         } catch (e) {
            throw new Error('LOAD FAIL in ' + f + ' :: ' + e.constructor.name + ' ' + e.message + '\n' + (e.stack || '').split('\n').slice(1, 4).join('\n'));
         }
     }
    return win;
 }

function fire(doc, event) {
    for (const cb of (listeners[event] || [])) {
        try { cb({ type: event }); }
        catch (e) {
            throw new Error('RUNTIME FAIL during ' + event + ' :: ' + e.constructor.name + ' ' + e.message + '\n' + (e.stack || '').split('\n').slice(1, 5).join('\n'));
         }
     }
 }

function run() {
    const win = loadAll();
    fire(document, 'DOMContentLoaded');

    // Core globals must be exposed by every module.
    const expected = ['gitCommands', 'ui', 'gameEngine', 'lessons', 'objectiveRules',
        'repoModel', 'characterSystem', 'Effects', 'Assets', 'gwaTiers',
        'achievements', 'lessonGuides', 'storyArc', 'AmbientEngine'];
    for (const name of expected) {
        if (typeof win[name] === 'undefined') throw new Error('boot-smoke: window.' + name + ' was never defined');
     }

    // A fresh load must not leave progress tracking in a broken shape (regression guard).
    if (!win.gameState || !win.gameState.progressTracking || typeof win.gameState.progressTracking !== 'object') {
        throw new Error('boot-smoke: window.gameState.progressTracking was not initialized (regression of the startup crash)');
     }
    if (!Array.isArray(win.lessons) || win.lessons.length < 10) {
        throw new Error('boot-smoke: expected at least 10 lessons, got ' + (win.lessons ? win.lessons.length : 0));
     }

    // Exercise a little real gameplay through the public git command layer.
    win.fileSystemModule.reset();
    win.fileSystemModule.createDirectory('/home/gitwizard/projects/level-1/.git');
    win.fileSystemModule.setCurrentPath('/home/gitwizard/projects/level-1');
    win.gitCommands.init([]);
    win.fileSystemModule.createFile('README.md', '# Git Wizard Academy\n');
    win.gitCommands.add(['README.md']);
    const commit = win.gitCommands.commit(['-m', 'feat: initialize academy repository']);
    if (!commit || commit.success !== true) throw new Error('boot-smoke: commit did not succeed: ' + JSON.stringify(commit));
    if (typeof win.gitCommands.log(['--oneline']) === 'undefined') throw new Error('boot-smoke: git log returned nothing');

    console.log('boot-smoke: all tests passed');
 }

if (require.main === module) run();
module.exports = { run, loadAll, fire };

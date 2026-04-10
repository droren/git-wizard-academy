// js/git-commands.js
/**
 * Git Commands for Git Wizard Academy
 * Stateful in-browser Git simulation (refs, HEAD, index, commits, merge/conflicts).
 */

const gitCommands = {};

const GIT_CONFIG_STORAGE_KEY = 'gwa_git_config_v1';
const model = window.repoModel || {};

// tiny non-crypto hash for file snapshots (good enough for a game)
function hashContent(str) {
    if (model.hashContent) return model.hashContent(str);
    str = String(str || '');
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) + h) + str.charCodeAt(i); // djb2
        h = h >>> 0;
    }
    return h.toString(16);
}

function toSha(seed) {
    if (model.toSha) return model.toSha(seed);
    let hex = hashContent(seed || '0');
    while (hex.length < 40) {
        hex += hashContent(hex + ':' + seed + ':' + hex.length);
    }
    return hex.slice(0, 40);
}

function deepClone(obj) {
    if (model.deepClone) return model.deepClone(obj);
    return JSON.parse(JSON.stringify(obj));
}

function getGlobalConfig() {
    if (window.configStore && window.configStore.load) {
        return window.configStore.load();
    }
    try {
        const parsed = JSON.parse(localStorage.getItem(GIT_CONFIG_STORAGE_KEY) || '{}');
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
        return {};
    }
}

function setGlobalConfig(config) {
    if (window.configStore && window.configStore.save) {
        window.configStore.save(config || {});
        return;
    }
    localStorage.setItem(GIT_CONFIG_STORAGE_KEY, JSON.stringify(config || {}));
}

function isGitRepo() {
    const fs = window.fileSystemModule;
    return fs.exists('.git/config') && fs.readFile('.git/config')?.content?.includes('repositoryformatversion');
}

function ensureGitState() {
    window.gameState.gitState = window.gameState.gitState || {};
    const s = window.gameState.gitState;

    if (!Array.isArray(s.branches) || !s.branches.length) s.branches = ['main'];
    if (!s.currentBranch || typeof s.currentBranch !== 'string') s.currentBranch = 'main';

    s.refs = s.refs || {};
    s.branches.forEach((b) => {
        if (!(b in s.refs)) s.refs[b] = null;
    });
    if (!(s.currentBranch in s.refs)) s.refs[s.currentBranch] = null;

    s.headRef = 'refs/heads/' + s.currentBranch;
    s.head = s.refs[s.currentBranch] || null;

    if (!Array.isArray(s.commits)) s.commits = [];
    if (!s.commitBySha || typeof s.commitBySha !== 'object') s.commitBySha = {};

    // Backfill commit index for older saves.
    s.commits.forEach((c, idx) => {
        if (!c.sha) {
            c.sha = toSha((c.message || 'commit') + ':' + idx + ':' + (c.date || ''));
        }
        if (!c.shortSha) c.shortSha = c.sha.slice(0, 7);
        if (!Array.isArray(c.parents)) c.parents = c.parent ? [c.parent] : [];
        if (!c.tree || typeof c.tree !== 'object') c.tree = {};
        if (!c.snapshot || typeof c.snapshot !== 'object') c.snapshot = {};
        if (!c.parentSnapshot || typeof c.parentSnapshot !== 'object') {
            const p = c.parents && c.parents[0] ? c.parents[0] : null;
            c.parentSnapshot = p && s.commitBySha[p] && s.commitBySha[p].snapshot
                ? deepClone(s.commitBySha[p].snapshot)
                : {};
        }
        s.commitBySha[c.sha] = c;
        if (c.branch) s.refs[c.branch] = c.sha;
    });

    if (!Object.values(s.refs).some(Boolean) && s.commits.length) {
        const last = s.commits[s.commits.length - 1];
        s.refs[s.currentBranch] = last.sha;
    }

    if (!s.index || typeof s.index !== 'object') s.index = {};
    if (!Array.isArray(s.staged)) s.staged = [];
    if (!s.trackedFiles || typeof s.trackedFiles !== 'object') s.trackedFiles = {};
    if (!s.tags || typeof s.tags !== 'object') s.tags = {};

    s.config = s.config || {};
    s.config.local = s.config.local || {};
    s.config.global = getGlobalConfig();

    if (typeof s.mergeInProgress !== 'boolean') s.mergeInProgress = false;
    if (!Array.isArray(s.conflictFiles)) s.conflictFiles = [];

    return s;
}

function getHeadCommit(state) {
    const sha = state.refs[state.currentBranch] || null;
    return sha ? state.commitBySha[sha] || null : null;
}

function getHeadTree(state) {
    const head = getHeadCommit(state);
    return head && head.tree ? head.tree : {};
}

function getHeadSnapshot(state) {
    const head = getHeadCommit(state);
    return head && head.snapshot ? head.snapshot : {};
}

function refreshTrackedFiles(state) {
    const tree = getHeadTree(state);
    state.trackedFiles = deepClone(tree);
    state.head = state.refs[state.currentBranch] || null;
    state.headRef = 'refs/heads/' + state.currentBranch;
}

function listWorkingFiles() {
    if (model.listWorkingFiles) {
        return model.listWorkingFiles(window.fileSystemModule);
    }
    const fs = window.fileSystemModule;
    const out = {};
    const joinPath = function(base, name) {
        if (!base || base === '.') return name;
        if (base.endsWith('/')) return base + name;
        return base + '/' + name;
    };
    const walk = function(dirPath, relPrefix) {
        const entries = fs.listDirectory(dirPath);
        entries.forEach((e) => {
            if (e.name === '.git') return;
            const fullPath = joinPath(dirPath, e.name);
            const relPath = relPrefix ? relPrefix + '/' + e.name : e.name;
            if (e.type === 'directory') {
                walk(fullPath, relPath);
                return;
            }
            if (e.type !== 'file') return;
            const file = fs.readFile(fullPath);
            const content = file ? String(file.content || '') : '';
            out[relPath] = { content, hash: hashContent(content) };
        });
    };
    walk('.', '');
    return out;
}

function readConfigValue(state, key) {
    if (key in state.config.local) return state.config.local[key];
    if (key in state.config.global) return state.config.global[key];
    return '';
}

function parseCommitMessage(args) {
    const mIdx = args.indexOf('-m');
    if (mIdx !== -1 && args[mIdx + 1]) return args[mIdx + 1];
    return 'Update';
}

function validateCommitMessage(message) {
    const normalized = String(message || '').trim();
    if (!normalized) {
        return { ok: false, reason: 'error: commit message cannot be empty' };
    }
    if (normalized.length < 8) {
        return { ok: false, reason: 'error: commit message is too short. Write a more descriptive message.' };
    }
    if (/^(update|wip|temp|test|fix|commit|changes?)$/i.test(normalized)) {
        return { ok: false, reason: 'error: commit message is too vague. Use a descriptive summary.' };
    }
    return { ok: true, message: normalized };
}

function getHookPath(name) {
    return '.git/hooks/' + name;
}

function readHookScript(name) {
    const fs = window.fileSystemModule;
    const path = getHookPath(name);
    if (!fs || !fs.exists(path)) return '';
    const file = fs.readFile(path);
    return file ? String(file.content || '') : '';
}

function hasActiveHook(name) {
    return !!readHookScript(name);
}

function commitMsgHookAllows(message) {
    const hook = readHookScript('commit-msg');
    if (!hook) return { ok: true };

    const normalized = String(message || '').trim();
    if (/exit\s+1|reject|fail/i.test(hook)) {
        return { ok: false, reason: 'commit-msg hook rejected the commit message' };
    }
    if (/conventional/i.test(hook) || /feat:|fix:|docs:|chore:|refactor:|test:|ci:/i.test(hook)) {
        const conventional = /^(feat|fix|docs|chore|refactor|test|ci|style|perf|build|revert)(\([\w.-]+\))?:\s+.+/.test(normalized);
        if (!conventional) {
            return { ok: false, reason: 'commit-msg hook rejected the message. Try a conventional commit like "feat: add login flow".' };
        }
    }
    return { ok: true };
}

function preCommitHookAllows(state) {
    const hook = readHookScript('pre-commit');
    if (!hook) return { ok: true };

    if (/exit\s+1|reject|fail/i.test(hook)) {
        return { ok: false, reason: 'pre-commit hook rejected the commit' };
    }

    const staged = state.index || {};
    const stagedNames = Object.keys(staged);
    const dirtyContent = stagedNames.some((name) => {
        const entry = staged[name];
        if (!entry || entry.deleted) return false;
        const content = String(entry.content || '');
        return /TODO|FIXME|debugger;|console\.log\(/i.test(content);
    });

    if ((/lint|semgrep|test/i.test(hook)) && dirtyContent) {
        return { ok: false, reason: 'pre-commit hook failed: lint/test checks found issues in staged files' };
    }

    return { ok: true };
}

function hasUnresolvedConflictMarkers(content) {
    if (!content) return false;
    return content.includes('<<<<<<<') || content.includes('=======') || content.includes('>>>>>>>');
}

function getAncestors(state, startSha) {
    if (model.getAncestors) {
        return model.getAncestors(state.commitBySha || {}, startSha);
    }
    const seen = new Set();
    const queue = [startSha];
    while (queue.length) {
        const sha = queue.shift();
        if (!sha || seen.has(sha)) continue;
        seen.add(sha);
        const commit = state.commitBySha[sha];
        if (!commit) continue;
        (commit.parents || []).forEach((p) => queue.push(p));
    }
    return seen;
}

function findMergeBase(state, a, b) {
    if (model.findMergeBase) {
        return model.findMergeBase(state.commitBySha || {}, a, b);
    }
    if (!a || !b) return null;
    const aAnc = getAncestors(state, a);
    const queue = [b];
    const visited = new Set();

    while (queue.length) {
        const cur = queue.shift();
        if (!cur || visited.has(cur)) continue;
        visited.add(cur);
        if (aAnc.has(cur)) return cur;
        const c = state.commitBySha[cur];
        if (c) (c.parents || []).forEach((p) => queue.push(p));
    }

    return null;
}

function createCommit(state, opts) {
    const fs = window.fileSystemModule;
    const parent = state.refs[state.currentBranch] || null;
    const parents = Array.isArray(opts.parents) && opts.parents.length ? opts.parents : (parent ? [parent] : []);
    const baseTree = parent ? deepClone(getHeadTree(state)) : {};
    const baseSnapshot = parent ? deepClone(getHeadSnapshot(state)) : {};

    const index = opts.index || state.index;
    const changedFiles = [];

    Object.keys(index).forEach((name) => {
        const entry = index[name];
        if (!entry) return;

        if (entry.deleted) {
            delete baseTree[name];
            delete baseSnapshot[name];
            changedFiles.push(name);
            return;
        }

        baseTree[name] = entry.hash;
        baseSnapshot[name] = entry.content;
        changedFiles.push(name);
    });

    if (!changedFiles.length && !opts.allowEmpty) {
        return { error: 'nothing to commit (use "git add")' };
    }

    const now = new Date();
    const timestamp = now.toISOString();
    const message = opts.message || 'Update';
    const authorName = readConfigValue(state, 'user.name') || 'You';
    const authorEmail = readConfigValue(state, 'user.email') || 'you@example.com';
    const sha = toSha(JSON.stringify({
        tree: baseTree,
        parent: parents,
        message,
        authorName,
        authorEmail,
        timestamp
    }));

    const commit = {
        sha,
        shortSha: sha.slice(0, 7),
        message,
        author: authorName + ' <' + authorEmail + '>',
        authorName,
        authorEmail,
        branch: state.currentBranch,
        date: timestamp,
        timestamp,
        files: changedFiles,
        parent: parents[0] || null,
        parents,
        tree: baseTree,
        snapshot: baseSnapshot,
        parentSnapshot: parent ? deepClone(getSnapshotForSha(state, parent)) : {}
    };

    state.commits.push(commit);
    state.commitBySha[sha] = commit;
    state.refs[state.currentBranch] = sha;
    refreshTrackedFiles(state);

    // Persist a lightweight ref to .git/HEAD for observability in the virtual FS.
    fs.writeFile('.git/HEAD', 'ref: refs/heads/' + state.currentBranch);

    return { commit, changedFiles };
}

function checkoutBranchSnapshot(state, branchName) {
    const fs = window.fileSystemModule;
    const targetSha = state.refs[branchName] || null;
    const targetCommit = targetSha ? state.commitBySha[targetSha] : null;
    const targetSnapshot = targetCommit ? (targetCommit.snapshot || {}) : {};

    // Replace tracked files from current HEAD with target snapshot, while preserving untracked files.
    const currentTracked = Object.keys(getHeadTree(state));
    currentTracked.forEach((name) => {
        if (!(name in targetSnapshot) && fs.exists(name)) {
            fs.deletePath(name);
        }
    });

    Object.keys(targetSnapshot).forEach((name) => {
        fs.writeFile(name, targetSnapshot[name]);
    });

    state.currentBranch = branchName;
    state.headRef = 'refs/heads/' + branchName;
    state.head = targetSha;
    state.index = {};
    state.staged = [];
    refreshTrackedFiles(state);
}

function createConflictContent(currentBranch, sourceBranch, ours, theirs) {
    return [
        '<<<<<<< ' + currentBranch,
        (ours || '').trimEnd(),
        '=======',
        (theirs || '').trimEnd(),
        '>>>>>>> ' + sourceBranch,
        ''
    ].join('\n');
}

function getSnapshotForSha(state, sha) {
    if (!sha) return {};
    const c = state.commitBySha[sha];
    return c && c.snapshot ? c.snapshot : {};
}

function writeWorkingSnapshot(snapshot) {
    const fs = window.fileSystemModule;
    const working = listWorkingFiles();

    Object.keys(working).forEach((name) => {
        if (!(name in snapshot) && fs.exists(name)) fs.deletePath(name);
    });
    Object.keys(snapshot).forEach((name) => fs.writeFile(name, snapshot[name]));
}

function resolveRevision(state, rev) {
    const head = state.refs[state.currentBranch] || null;
    if (!rev || rev === 'HEAD') return head;

    if (rev.startsWith('HEAD~')) {
        const n = Number(rev.slice(5));
        if (!Number.isFinite(n) || n < 0) return null;
        let ptr = head;
        let steps = n;
        while (steps > 0 && ptr) {
            const c = state.commitBySha[ptr];
            ptr = c && c.parents && c.parents[0] ? c.parents[0] : null;
            steps--;
        }
        return ptr || null;
    }

    if (rev in state.refs) return state.refs[rev] || null;
    if (state.commitBySha[rev]) return rev;

    const matches = Object.keys(state.commitBySha).filter((sha) => sha.startsWith(rev));
    if (matches.length === 1) return matches[0];
    return null;
}

function isWorkingTreeDirty(state) {
    if (Object.keys(state.index || {}).length > 0) return true;

    const headSnapshot = getHeadSnapshot(state);
    const working = listWorkingFiles();
    const names = new Set([...Object.keys(headSnapshot), ...Object.keys(working)]);

    for (const name of names) {
        const headContent = headSnapshot[name];
        const workContent = working[name] ? working[name].content : undefined;
        if (headContent !== workContent) return true;
    }
    return false;
}

function getCommitDiff(commit) {
    const pSha = commit && commit.parents && commit.parents[0] ? commit.parents[0] : null;
    const parentSnap = commit && commit.parentSnapshot
        ? commit.parentSnapshot
        : (pSha && window.gameState && window.gameState.gitState && window.gameState.gitState.commitBySha && window.gameState.gitState.commitBySha[pSha]
            ? (window.gameState.gitState.commitBySha[pSha].snapshot || {})
            : {});
    const afterSnap = (commit && commit.snapshot) ? commit.snapshot : {};
    const names = new Set([...Object.keys(parentSnap), ...Object.keys(afterSnap)]);
    const diff = {};
    names.forEach((name) => {
        if (parentSnap[name] !== afterSnap[name]) {
            diff[name] = { before: parentSnap[name], after: afterSnap[name] };
        }
    });
    return diff;
}

function applyDiffToSnapshot(baseSnapshot, diff) {
    const out = deepClone(baseSnapshot);
    const conflicts = [];

    Object.keys(diff).forEach((name) => {
        const before = diff[name].before;
        const after = diff[name].after;
        const current = out[name];

        // If target location diverged from expected parent content, mark conflict.
        if (current !== before && current !== after) {
            conflicts.push(name);
            return;
        }

        if (after === undefined) delete out[name];
        else out[name] = after;
    });

    return { snapshot: out, conflicts };
}

function createCommitFromSnapshot(state, opts) {
    const snapshot = opts.snapshot || {};
    const parent = Array.isArray(opts.parents) && opts.parents.length ? opts.parents[0] : null;
    const parentSnap = parent ? getSnapshotForSha(state, parent) : {};
    const files = new Set([...Object.keys(parentSnap), ...Object.keys(snapshot)]);
    const changedFiles = [];
    const tree = {};

    Object.keys(snapshot).forEach((name) => {
        tree[name] = hashContent(snapshot[name]);
    });

    files.forEach((name) => {
        if (parentSnap[name] !== snapshot[name]) changedFiles.push(name);
    });

    if (!changedFiles.length && !opts.allowEmpty) {
        return { error: 'nothing to commit' };
    }

    const now = new Date();
    const timestamp = now.toISOString();
    const authorName = opts.authorName || readConfigValue(state, 'user.name') || 'You';
    const authorEmail = opts.authorEmail || readConfigValue(state, 'user.email') || 'you@example.com';
    const parents = opts.parents || [];

    const sha = toSha(JSON.stringify({
        tree,
        parents,
        message: opts.message || 'Update',
        authorName,
        authorEmail,
        timestamp
    }));

    const commit = {
        sha,
        shortSha: sha.slice(0, 7),
        message: opts.message || 'Update',
        author: authorName + ' <' + authorEmail + '>',
        authorName,
        authorEmail,
        branch: state.currentBranch,
        date: timestamp,
        timestamp,
        files: changedFiles,
        parent: parent,
        parents,
        tree,
        snapshot: deepClone(snapshot),
        parentSnapshot: deepClone(parentSnap)
    };

    state.commits.push(commit);
    state.commitBySha[sha] = commit;
    state.refs[state.currentBranch] = sha;
    refreshTrackedFiles(state);

    const fs = window.fileSystemModule;
    fs.writeFile('.git/HEAD', 'ref: refs/heads/' + state.currentBranch);

    return { commit };
}

gitCommands._hash = hashContent;

gitCommands.help = function(args) {
    const cmd = args[0];

    if (cmd) {
        const helpText = {
            init: 'git-init(1)                        Git Manual                        git-init(1)\n\nNAME\n       git init - Create an empty Git repository\n\nSYNOPSIS\n       git init [-q | --quiet] [--bare]',
            add: 'git-add(1)                      Git Manual                      git-add(1)\n\nNAME\n       git-add - Add file contents to the index',
            commit: 'git-commit(1)                    Git Manual                    git-commit(1)\n\nNAME\n       git-commit - Record changes to the repository',
            status: 'git-status(1)                   Git Manual                   git-status(1)\n\nNAME\n       git-status - Show the working tree status',
            log: 'git-log(1)                       Git Manual                       git-log(1)',
            branch: 'git-branch(1)                   Git Manual                   git-branch(1)',
            checkout: 'git-checkout(1)                Git Manual                git-checkout(1)',
            switch: 'git-switch(1)                  Git Manual                  git-switch(1)',
            merge: 'git-merge(1)                    Git Manual                    git-merge(1)',
            submodule: 'git-submodule(1)                Git Manual                git-submodule(1)',
            stash: 'git-stash(1)                    Git Manual                    git-stash(1)',
            rebase: 'git-rebase(1)                   Git Manual                   git-rebase(1)',
            'cherry-pick': 'git-cherry-pick(1)              Git Manual              git-cherry-pick(1)',
            bisect: 'git-bisect(1)                   Git Manual                   git-bisect(1)',
            reflog: 'git-reflog(1)                   Git Manual                   git-reflog(1)',
            reset: 'git-reset(1)                    Git Manual                    git-reset(1)',
            tag: 'git-tag(1)                       Git Manual                       git-tag(1)'
        };

        if (helpText[cmd]) {
            return { success: true, message: helpText[cmd], xp: 5 };
        }
        return { success: false, message: "git: '" + cmd + "' is not a git command. See 'git help'.", xp: 0 };
    }

    return {
        success: true,
        message: `Git - the stupid content tracker

usage: git [--version] [--help] [-C <path>] [-c <name>=<value>]
           <command> [<args>]

Common commands:
   init      Create an empty Git repository
   add       Add file contents to the index
   commit    Record changes to the repository
   branch    List, create, or delete branches
   checkout  Switch branches or restore working tree files
   switch    Switch branches
   merge     Join two or more development histories
   submodule Manage nested repositories
   log       Show commit logs
   status    Show the working tree status
   push      Update remote refs
   pull      Fetch from and integrate with another repository

See 'git help <command>' for more information.`,
        xp: 5
    };
};

gitCommands.init = function(args) {
    const fs = window.fileSystemModule;

    if (isGitRepo()) {
        return { success: false, message: 'fatal: reinitializing an existing Git repository', xp: 0 };
    }

    fs.createDirectory('.git');
    fs.createFile('.git/config', '[core]\n\trepositoryformatversion = 0\n\tfilemode = false\n\tbare = false\n\tlogallrefupdates = true');
    fs.createFile('.git/HEAD', 'ref: refs/heads/main');
    fs.createDirectory('.git/refs');
    fs.createDirectory('.git/refs/heads');
    fs.createDirectory('.git/objects');
    fs.createDirectory('.git/objects/pack');
    fs.createDirectory('.git/objects/info');

    window.gameState.gitState = {
        branches: ['main'],
        currentBranch: 'main',
        refs: { main: null },
        headRef: 'refs/heads/main',
        head: null,
        commits: [],
        commitBySha: {},
        staged: [],
        index: {},
        trackedFiles: {},
        config: {
            local: {},
            global: getGlobalConfig()
        },
        mergeInProgress: false,
        mergeHead: null,
        mergeBase: null,
        conflictFiles: []
    };

    window.gameState.flags = window.gameState.flags || {};
    window.gameState.flags.repoInited = true;
    return { success: true, message: 'Initialized empty Git repository in .git/', xp: 25 };
};

gitCommands.config = function(args) {
    const state = ensureGitState();
    const isGlobal = args.includes('--global');
    const list = args.includes('--list');
    const get = args.includes('--get');

    const plainArgs = args.filter((a) => !a.startsWith('--'));

    if (list) {
        const lines = [];
        Object.keys(state.config.global).sort().forEach((k) => lines.push(k + '=' + state.config.global[k]));
        Object.keys(state.config.local).sort().forEach((k) => lines.push(k + '=' + state.config.local[k]));
        return { success: true, message: lines.join('\n'), isRaw: true, xp: 5 };
    }

    if (get && plainArgs[0]) {
        const value = readConfigValue(state, plainArgs[0]);
        if (!value) return { success: false, message: '', xp: 0 };
        return { success: true, message: value, isRaw: true, xp: 2 };
    }

    // Support: git config user.name "Jane Doe" and git config user.name=Jane
    let key = '';
    let value = '';

    if (plainArgs[0] && plainArgs[0].includes('=')) {
        const split = plainArgs[0].split('=');
        key = split[0];
        value = split.slice(1).join('=');
    } else if (plainArgs.length >= 2) {
        key = plainArgs[0];
        value = plainArgs.slice(1).join(' ');
    }

    if (!key) {
        return { success: true, message: '', xp: 0 };
    }

    if (!value) {
        const existing = readConfigValue(state, key);
        return { success: true, message: existing, isRaw: true, xp: 1 };
    }

    if (isGlobal) {
        state.config.global[key] = value;
        setGlobalConfig(state.config.global);
    } else {
        state.config.local[key] = value;
    }

    if (key === 'user.name' || key === 'user.email') {
        window.gameState.flags = window.gameState.flags || {};
        window.gameState.flags.configuredIdentity = true;
    }

    if (window.gameEngine && window.gameEngine.syncGlobalEnvironmentConfig) {
        window.gameEngine.syncGlobalEnvironmentConfig();
    }
    if (window.gameEngine && window.gameEngine.renderLessonContent) {
        window.gameEngine.renderLessonContent(window.gameState.currentLevel || 0);
        window.gameEngine.renderObjectives();
    }

    return { success: true, message: '', xp: 10 };
};

gitCommands.status = function(args) {
    if (!isGitRepo()) {
        return { success: false, message: 'fatal: not a git repository (or any of the parent directories): .git', xp: 0 };
    }

    const state = ensureGitState();
    const headTree = getHeadTree(state);
    const working = listWorkingFiles();
    const index = state.index || {};

    const staged = [];
    const modified = [];
    const deleted = [];
    const untracked = [];
    const allFiles = new Set([
        ...Object.keys(headTree),
        ...Object.keys(index),
        ...Object.keys(working)
    ]);

    Array.from(allFiles).sort().forEach((name) => {
        const headHash = headTree[name];
        const work = working[name];
        const indexEntry = index[name];

        if (indexEntry) {
            if (indexEntry.deleted && headHash !== undefined) {
                staged.push({ kind: 'deleted', name });
            } else if (!indexEntry.deleted && headHash === undefined) {
                staged.push({ kind: 'new file', name });
            } else if (!indexEntry.deleted && headHash !== indexEntry.hash) {
                staged.push({ kind: 'modified', name });
            }
        }

        const compareHash = indexEntry ? (indexEntry.deleted ? undefined : indexEntry.hash) : headHash;

        if (compareHash === undefined && work !== undefined && headHash === undefined && !indexEntry) {
            untracked.push(name);
            return;
        }

        if (compareHash !== undefined && work === undefined) {
            deleted.push(name);
            return;
        }

        if (compareHash !== undefined && work !== undefined && work.hash !== compareHash) {
            modified.push(name);
        }
    });

    let out = '\x1b[36mOn branch ' + state.currentBranch + '\x1b[0m\n';

    if (state.mergeInProgress) {
        out += '\n\x1b[33mYou have unmerged paths.\x1b[0m\n';
        out += '  (fix conflicts and run "git commit")\n';
        state.conflictFiles.forEach((name) => {
            out += '  \x1b[31mboth modified:\x1b[0m   ' + name + '\n';
        });
    }

    if (staged.length) {
        out += '\nChanges to be committed:\n';
        staged.forEach((item) => {
            out += '  \x1b[32m' + item.kind + ':\x1b[0m   ' + item.name + '\n';
        });
    }

    if (modified.length || deleted.length) {
        out += '\nChanges not staged for commit:\n';
        modified.forEach((name) => {
            out += '  \x1b[31mmodified:\x1b[0m   ' + name + '\n';
        });
        deleted.forEach((name) => {
            out += '  \x1b[31mdeleted:\x1b[0m   ' + name + '\n';
        });
    }

    if (untracked.length) {
        out += '\nUntracked files:\n';
        untracked.forEach((name) => {
            out += '  \x1b[31m??\x1b[0m ' + name + '\n';
        });
    }

    if (!state.mergeInProgress && !staged.length && !modified.length && !deleted.length && !untracked.length) {
        out += '\nnothing to commit, working tree clean';
    }

    window.gameState.flags = window.gameState.flags || {};
    window.gameState.flags.ranStatus = true;
    if (staged.length) window.gameState.flags.statusSawStaged = true;
    if (modified.length || deleted.length || untracked.length) window.gameState.flags.statusSawWorkingChanges = true;

    return { success: true, message: out, isRaw: true, xp: 5 };
};

gitCommands.add = function(args) {
    const fs = window.fileSystemModule;

    if (args.length === 0) {
        return { success: false, message: 'Nothing specified, nothing added.', xp: 0 };
    }

    if (!isGitRepo()) {
        return { success: false, message: 'fatal: not a git repository (or any of the parent directories): .git', xp: 0 };
    }

    const state = ensureGitState();
    const headTree = getHeadTree(state);
    const addAll = args.includes('--all') || args.includes('-A') || args.includes('.') || args.includes('*');
    const targets = [];

    if (addAll) {
        const working = listWorkingFiles();
        Object.keys(working).forEach((name) => targets.push(name));
        Object.keys(headTree).forEach((name) => {
            if (!working[name]) targets.push(name); // stage deletions
        });
    } else {
        args.forEach((arg) => {
            if (!arg.startsWith('-')) targets.push(arg.replace(/^['"]|['"]$/g, ''));
        });
    }

    if (!targets.length) {
        return { success: false, message: 'Nothing specified, nothing added.', xp: 0 };
    }

    let added = 0;
    let firstNotFound = '';

    targets.forEach((name) => {
        if (fs.exists(name)) {
            const file = fs.readFile(name);
            const content = file ? String(file.content || '') : '';
            state.index[name] = {
                hash: hashContent(content),
                content,
                deleted: false
            };
            if (!state.staged.includes(name)) state.staged.push(name);
            added++;

            if (state.mergeInProgress && !hasUnresolvedConflictMarkers(content)) {
                state.conflictFiles = state.conflictFiles.filter((f) => f !== name);
                if (!state.conflictFiles.length) {
                    window.gameState.flags = window.gameState.flags || {};
                    window.gameState.flags.conflictResolvedCandidate = true;
                }
            }
        } else if (headTree[name] !== undefined) {
            state.index[name] = { hash: '', content: '', deleted: true };
            if (!state.staged.includes(name)) state.staged.push(name);
            added++;
        } else if (!firstNotFound) {
            firstNotFound = name;
        }
    });

    if (added === 0) {
        if (firstNotFound) {
            return { success: false, message: "fatal: pathspec '" + firstNotFound + "' did not match any files", xp: 0 };
        }
        return { success: true, message: 'Nothing to add, all files already staged', xp: 0 };
    }

    window.gameState.flags = window.gameState.flags || {};
    window.gameState.flags.stagedOnce = true;

    return { success: true, message: 'Added ' + added + ' file(s)', xp: addAll ? 15 : 10 };
};

gitCommands.commit = function(args) {
    if (!isGitRepo()) {
        return { success: false, message: 'fatal: not a git repository (or any of the parent directories): .git', xp: 0 };
    }

    const state = ensureGitState();
    const allowEmpty = args.includes('--allow-empty');

    if (state.mergeInProgress && state.conflictFiles.length) {
        return {
            success: false,
            message: 'error: Committing is not possible because you have unmerged files.\nHint: resolve conflicts, `git add`, then `git commit`.',
            xp: 0
        };
    }

    const commitMessage = parseCommitMessage(args);
    const messageCheck = validateCommitMessage(commitMessage);
    if (!messageCheck.ok) {
        window.gameState.flags = window.gameState.flags || {};
        window.gameState.flags.commitMessageRejected = true;
        return { success: false, message: messageCheck.reason, xp: 0 };
    }

    const preCommitCheck = preCommitHookAllows(state);
    if (!preCommitCheck.ok) {
        window.gameState.flags = window.gameState.flags || {};
        window.gameState.flags.preCommitHookBlocked = true;
        return { success: false, message: preCommitCheck.reason, xp: 0 };
    }

    const msgHookCheck = commitMsgHookAllows(commitMessage);
    if (!msgHookCheck.ok) {
        window.gameState.flags = window.gameState.flags || {};
        window.gameState.flags.commitMsgHookBlocked = true;
        return { success: false, message: msgHookCheck.reason, xp: 0 };
    }

    const parents = state.mergeInProgress
        ? [state.refs[state.currentBranch], state.mergeHead].filter(Boolean)
        : undefined;

    const result = createCommit(state, {
        message: messageCheck.message,
        allowEmpty,
        parents
    });

    if (result.error) {
        return { success: false, message: result.error, xp: 0 };
    }

    state.index = {};
    state.staged = [];

    if (state.mergeInProgress) {
        state.mergeInProgress = false;
        state.mergeHead = null;
        state.mergeBase = null;
        state.conflictFiles = [];

        window.gameState.merges++;
        window.gameState.flags = window.gameState.flags || {};
        window.gameState.flags.mergeCompleted = true;
        window.gameState.flags.conflictResolved = true;

        if (window.gameEngine && document.getElementById('bossOverlay')?.classList.contains('show')) {
            window.gameEngine.damageBoss(60);
        }
    }

    window.gameState.commits++;
    window.gameState.flags = window.gameState.flags || {};
    window.gameState.flags.ranCommit = true;
    window.gameState.flags.lastCommitMessageGood = true;

    if (window.gameEngine) {
        window.gameEngine.checkObjectives();
    }

    window.gameState.flags = window.gameState.flags || {};
    window.gameState.flags.commitsByBranchSinceLevelStart = window.gameState.flags.commitsByBranchSinceLevelStart || {};
    window.gameState.flags.commitsByBranchSinceLevelStart[state.currentBranch] =
        (window.gameState.flags.commitsByBranchSinceLevelStart[state.currentBranch] || 0) + 1;

    return {
        success: true,
        message: '[' + state.currentBranch + ' ' + result.commit.shortSha + '] ' + result.commit.message,
        xp: 35
    };
};

gitCommands.log = function(args) {
    if (!isGitRepo()) {
        return { success: false, message: 'fatal: not a git repository (or any of the parent directories): .git', xp: 0 };
    }

    const state = ensureGitState();
    const headSha = state.refs[state.currentBranch] || null;
    if (!headSha) {
        return { success: false, message: 'fatal: your current branch does not have any commits yet', xp: 0 };
    }

    const oneline = args.includes('--oneline');
    const commits = [];
    let ptr = headSha;
    while (ptr) {
        const c = state.commitBySha[ptr];
        if (!c) break;
        commits.push(c);
        ptr = (c.parents && c.parents[0]) || null;
    }

    const branchAtHead = Object.keys(state.refs).filter((b) => state.refs[b] === headSha);
    let output = '';

    commits.forEach((commit, idx) => {
        let decorations = '';
        if (idx === 0) {
            const refs = branchAtHead.map((b) => (b === state.currentBranch ? 'HEAD -> ' + b : b));
            if (refs.length) decorations = ' (\x1b[36m' + refs.join(', ') + '\x1b[0m)';
        }

        if (oneline) {
            output += commit.shortSha + decorations + ' ' + commit.message + '\n';
        } else {
            output += '\x1b[33mcommit ' + commit.sha + '\x1b[0m' + decorations + '\n';
            output += 'Author: ' + commit.author + '\n';
            output += 'Date:   ' + new Date(commit.timestamp || commit.date).toLocaleString() + '\n\n';
            output += '    ' + commit.message + '\n\n';
        }
    });

    window.gameState.flags = window.gameState.flags || {};
    window.gameState.flags.ranLog = true;

    return { success: true, message: output.trimEnd(), isRaw: true, xp: 8 };
};

gitCommands.branch = function(args) {
    if (!isGitRepo()) {
        return { success: false, message: 'fatal: not a git repository (or any of the parent directories): .git', xp: 0 };
    }

    const state = ensureGitState();

    const deleteFlag = args.includes('-d') || args.includes('--delete');
    const createFlag = args.includes('-c') || args.includes('--create');
    const plain = args.filter((a) => !a.startsWith('-'));

    if (!args.length || args.includes('-l') || args.includes('--list') || args.includes('-a')) {
        let output = '';
        state.branches.slice().sort().forEach((branch) => {
            if (branch === state.currentBranch) {
                output += '* \x1b[32m' + branch + '\x1b[0m\n';
            } else {
                output += '  ' + branch + '\n';
            }
        });
        return { success: true, message: output.trimEnd(), isRaw: true, xp: 5 };
    }

    if (deleteFlag && plain[0]) {
        const toDelete = plain[0];
        if (toDelete === state.currentBranch) {
            return { success: false, message: "error: Cannot delete branch '" + toDelete + "' checked out", xp: 0 };
        }
        if (!state.branches.includes(toDelete)) {
            return { success: false, message: "error: branch '" + toDelete + "' not found", xp: 0 };
        }

        state.branches = state.branches.filter((b) => b !== toDelete);
        delete state.refs[toDelete];
        return { success: true, message: 'Deleted branch ' + toDelete, xp: 20 };
    }

    if ((createFlag || plain.length === 1) && plain[0]) {
        const newBranch = plain[0];
        if (state.branches.includes(newBranch)) {
            return { success: false, message: "fatal: A branch named '" + newBranch + "' already exists.", xp: 0 };
        }

        state.branches.push(newBranch);
        state.refs[newBranch] = state.refs[state.currentBranch] || null;
        window.gameState.branches++;
        window.gameState.flags = window.gameState.flags || {};
        window.gameState.flags.branchCreated = true;
        window.gameState.flags.ranBranchFlow = true;
        return { success: true, message: "Branch '" + newBranch + "' created", xp: 25 };
    }

    return { success: true, message: 'usage: git branch [-c|--create] <branch> | [-d|--delete] <branch>', xp: 0 };
};

gitCommands.checkout = function(args) {
    if (!isGitRepo()) {
        return { success: false, message: 'fatal: not a git repository (or any of the parent directories): .git', xp: 0 };
    }

    const state = ensureGitState();
    const doubleDash = args.indexOf('--');
    const createIndex = args.findIndex((a) => a === '-b');

    if (doubleDash !== -1) {
        const targets = args.slice(doubleDash + 1);
        if (!targets.length) return { success: false, message: 'error: you must specify path(s) to restore', xp: 0 };

        const headSnapshot = getHeadSnapshot(state);
        const fs = window.fileSystemModule;
        let restored = 0;
        targets.forEach((name) => {
            if (name in headSnapshot) {
                fs.writeFile(name, headSnapshot[name]);
                restored++;
            }
        });
        if (!restored) {
            return { success: false, message: "error: pathspec '" + targets[0] + "' did not match any file(s) known to git", xp: 0 };
        }
        return { success: true, message: 'Restored ' + targets.join(' '), xp: 10 };
    }

    if (createIndex !== -1 && args[createIndex + 1]) {
        const newBranch = args[createIndex + 1];
        if (state.branches.includes(newBranch)) {
            return { success: false, message: "fatal: A branch named '" + newBranch + "' already exists.", xp: 0 };
        }

        state.branches.push(newBranch);
        state.refs[newBranch] = state.refs[state.currentBranch] || null;
        checkoutBranchSnapshot(state, newBranch);
        window.gameState.branches++;
        window.gameState.flags = window.gameState.flags || {};
        window.gameState.flags.branchCreated = true;
        window.gameState.flags.visitedBranches = window.gameState.flags.visitedBranches || {};
        window.gameState.flags.visitedBranches[newBranch] = true;
        window.gameState.flags.explicitBranchSwitches = (window.gameState.flags.explicitBranchSwitches || 0) + 1;
        window.gameState.flags.ranBranchFlow = true;
        return { success: true, message: "Switched to a new branch '" + newBranch + "'", xp: 25 };
    }

    const branch = args.find((a) => !a.startsWith('-'));
    if (!branch) return { success: true, message: 'usage: git checkout <branch-name>', xp: 0 };
    if (!state.branches.includes(branch)) {
        return { success: false, message: "error: pathspec '" + branch + "' did not match any file(s) known to git", xp: 0 };
    }

    checkoutBranchSnapshot(state, branch);
    window.gameState.flags = window.gameState.flags || {};
    window.gameState.flags.visitedBranches = window.gameState.flags.visitedBranches || {};
    window.gameState.flags.visitedBranches[branch] = true;
    window.gameState.flags.explicitBranchSwitches = (window.gameState.flags.explicitBranchSwitches || 0) + 1;
    window.gameState.flags.ranBranchFlow = true;
    if (args.some((a) => /^[a-f0-9]{7,40}$/.test(a))) {
        window.gameState.flags.recoveredCommit = true;
    }
    return { success: true, message: "Switched to branch '" + branch + "'", xp: 20 };
};

gitCommands.switch = function(args) {
    if (!isGitRepo()) {
        return { success: false, message: 'fatal: not a git repository', xp: 0 };
    }

    const state = ensureGitState();
    const createIndex = args.findIndex((a) => a === '-c' || a === '--create');

    if (createIndex !== -1 && args[createIndex + 1]) {
        const newBranch = args[createIndex + 1];
        if (state.branches.includes(newBranch)) {
            return { success: false, message: "fatal: A branch named '" + newBranch + "' already exists.", xp: 0 };
        }

        state.branches.push(newBranch);
        state.refs[newBranch] = state.refs[state.currentBranch] || null;
        checkoutBranchSnapshot(state, newBranch);
        window.gameState.branches++;
        window.gameState.flags = window.gameState.flags || {};
        window.gameState.flags.branchCreated = true;
        window.gameState.flags.visitedBranches = window.gameState.flags.visitedBranches || {};
        window.gameState.flags.visitedBranches[newBranch] = true;
        window.gameState.flags.explicitBranchSwitches = (window.gameState.flags.explicitBranchSwitches || 0) + 1;
        window.gameState.flags.ranBranchFlow = true;
        return { success: true, message: "Switched to a new branch '" + newBranch + "'", xp: 25 };
    }

    const branch = args.find((a) => !a.startsWith('-'));
    if (!branch) return { success: true, message: 'usage: git switch [-c|--create] <branch>', xp: 0 };
    if (!state.branches.includes(branch)) {
        return { success: false, message: "error: branch '" + branch + "' not found", xp: 0 };
    }

    checkoutBranchSnapshot(state, branch);
    window.gameState.flags = window.gameState.flags || {};
    window.gameState.flags.visitedBranches = window.gameState.flags.visitedBranches || {};
    window.gameState.flags.visitedBranches[branch] = true;
    window.gameState.flags.explicitBranchSwitches = (window.gameState.flags.explicitBranchSwitches || 0) + 1;
    window.gameState.flags.ranBranchFlow = true;
    return { success: true, message: "Switched to branch '" + branch + "'", xp: 20 };
};

gitCommands.merge = function(args) {
    if (!isGitRepo()) {
        return { success: false, message: 'fatal: not a git repository', xp: 0 };
    }

    const state = ensureGitState();
    window.gameState.flags = window.gameState.flags || {};
    window.gameState.flags.ranMerge = true;

    if (state.mergeInProgress) {
        return {
            success: false,
            message: 'fatal: You have not concluded your merge (MERGE_HEAD exists).\nHint: resolve conflicts, `git add`, then `git commit`.',
            xp: 0
        };
    }

    const sourceBranch = args[0];
    if (!sourceBranch) return { success: false, message: 'Nothing to merge', xp: 0 };
    if (sourceBranch === state.currentBranch) return { success: false, message: 'Already up to date.', xp: 0 };
    if (!state.branches.includes(sourceBranch)) {
        return { success: false, message: "fatal: '" + sourceBranch + "' - not something we can merge", xp: 0 };
    }

    const oursSha = state.refs[state.currentBranch] || null;
    const theirsSha = state.refs[sourceBranch] || null;

    if (!theirsSha) {
        return { success: false, message: 'Already up to date.', xp: 0 };
    }

    if (!oursSha) {
        // No commits on current branch: fast-forward to source tip.
        const fs = window.fileSystemModule;
        const sourceSnapshot = (state.commitBySha[theirsSha] && state.commitBySha[theirsSha].snapshot) || {};
        Object.keys(listWorkingFiles()).forEach((name) => {
            if (!(name in sourceSnapshot)) fs.deletePath(name);
        });
        Object.keys(sourceSnapshot).forEach((name) => fs.writeFile(name, sourceSnapshot[name]));
        state.refs[state.currentBranch] = theirsSha;
        refreshTrackedFiles(state);
        return { success: true, message: 'Updating (empty)\nFast-forward', xp: 25 };
    }

    const oursAnc = getAncestors(state, oursSha);
    if (oursAnc.has(theirsSha)) {
        return { success: false, message: 'Already up to date.', xp: 0 };
    }

    const theirsAnc = getAncestors(state, theirsSha);
    if (theirsAnc.has(oursSha)) {
        // Fast-forward current branch.
        const previousTracked = Object.keys(getHeadTree(state));
        state.refs[state.currentBranch] = theirsSha;
        const target = state.commitBySha[theirsSha];
        const fs = window.fileSystemModule;
        previousTracked.forEach((name) => {
            if (!target.snapshot[name] && fs.exists(name)) fs.deletePath(name);
        });
        Object.keys(target.snapshot).forEach((name) => fs.writeFile(name, target.snapshot[name]));
        refreshTrackedFiles(state);
        window.gameState.merges++;
        window.gameState.flags = window.gameState.flags || {};
        window.gameState.flags.mergeCompleted = true;
        return { success: true, message: 'Updating ' + oursSha.slice(0, 7) + '..' + theirsSha.slice(0, 7) + '\nFast-forward', xp: 25 };
    }

    const baseSha = findMergeBase(state, oursSha, theirsSha);
    const base = baseSha ? state.commitBySha[baseSha] : null;
    const ours = state.commitBySha[oursSha];
    const theirs = state.commitBySha[theirsSha];

    const baseSnap = base ? (base.snapshot || {}) : {};
    const oursSnap = ours ? (ours.snapshot || {}) : {};
    const theirsSnap = theirs ? (theirs.snapshot || {}) : {};

    const files = new Set([...Object.keys(baseSnap), ...Object.keys(oursSnap), ...Object.keys(theirsSnap)]);
    const fs = window.fileSystemModule;

    state.index = {};
    state.staged = [];

    const conflictFiles = [];

    Array.from(files).sort().forEach((name) => {
        const baseContent = baseSnap[name];
        const ourContent = oursSnap[name];
        const theirContent = theirsSnap[name];

        if (ourContent === theirContent) {
            if (ourContent === undefined) {
                if (fs.exists(name)) fs.deletePath(name);
            } else {
                fs.writeFile(name, ourContent);
                state.index[name] = { hash: hashContent(ourContent), content: ourContent, deleted: false };
                state.staged.push(name);
            }
            return;
        }

        if (ourContent === baseContent) {
            if (theirContent === undefined) {
                if (fs.exists(name)) fs.deletePath(name);
                state.index[name] = { hash: '', content: '', deleted: true };
                state.staged.push(name);
            } else {
                fs.writeFile(name, theirContent);
                state.index[name] = { hash: hashContent(theirContent), content: theirContent, deleted: false };
                state.staged.push(name);
            }
            return;
        }

        if (theirContent === baseContent) {
            if (ourContent === undefined) {
                if (fs.exists(name)) fs.deletePath(name);
            } else {
                fs.writeFile(name, ourContent);
                state.index[name] = { hash: hashContent(ourContent), content: ourContent, deleted: false };
                state.staged.push(name);
            }
            return;
        }

        const conflicted = createConflictContent(state.currentBranch, sourceBranch, ourContent || '', theirContent || '');
        fs.writeFile(name, conflicted);
        conflictFiles.push(name);
    });

    if (conflictFiles.length) {
        state.mergeInProgress = true;
        state.mergeHead = theirsSha;
        state.mergeBase = baseSha;
        state.conflictFiles = conflictFiles;

        window.gameState.conflicts++;
        window.gameState.flags = window.gameState.flags || {};
        window.gameState.flags.conflictCreated = true;

        if (window.gameEngine) window.gameEngine.checkObjectives();

        return {
            success: false,
            message: 'Auto-merging ' + conflictFiles.join(', ') + '\nCONFLICT (content): Merge conflict in ' + conflictFiles[0] + '\nAutomatic merge failed; fix conflicts and then commit the result.',
            xp: 35
        };
    }

    const mergeResult = createCommit(state, {
        message: "Merge branch '" + sourceBranch + "'",
        parents: [oursSha, theirsSha],
        allowEmpty: true
    });

    state.index = {};
    state.staged = [];
    state.mergeInProgress = false;
    state.mergeHead = null;
    state.mergeBase = null;
    state.conflictFiles = [];

    window.gameState.merges++;
    window.gameState.flags = window.gameState.flags || {};
    window.gameState.flags.mergeCompleted = true;

    if (window.gameEngine && document.getElementById('bossOverlay')?.classList.contains('show')) {
        window.gameEngine.damageBoss(35);
    }

    if (window.gameEngine) {
        window.gameEngine.checkObjectives();
    }

    return {
        success: true,
        message: "Merge made by the 'ort' strategy.\n" + (mergeResult.commit ? mergeResult.commit.shortSha : ''),
        xp: 45
    };
};

gitCommands.stash = function(args) {
    if (!isGitRepo()) {
        return { success: false, message: 'fatal: not a git repository', xp: 0 };
    }

    const state = ensureGitState();
    if (!Array.isArray(state.stashStack)) state.stashStack = [];
    localStorage.setItem('gwa_stash', 'true');
    window.gameState.flags = window.gameState.flags || {};
    window.gameState.flags.ranStash = true;

    const sub = args[0];
    const isSave = !sub || sub === 'save' || sub === 'push';

    if (isSave) {
        if (!isWorkingTreeDirty(state)) {
            return { success: true, message: 'No local changes to save', xp: 0 };
        }

        const headSha = state.refs[state.currentBranch] || null;
        const headSnapshot = getSnapshotForSha(state, headSha);
        const entry = {
            id: toSha('stash:' + Date.now() + ':' + Math.random()).slice(0, 8),
            branch: state.currentBranch,
            head: headSha,
            message: 'WIP on ' + state.currentBranch + ': ' + (headSha ? headSha.slice(0, 7) : '0000000') + ' work in progress',
            workingSnapshot: Object.fromEntries(Object.entries(listWorkingFiles()).map(([k, v]) => [k, v.content])),
            index: deepClone(state.index || {})
        };

        state.stashStack.unshift(entry);
        writeWorkingSnapshot(headSnapshot);
        state.index = {};
        state.staged = [];
        return { success: true, message: 'Saved working directory and index state WIP on ' + state.currentBranch, xp: 20 };
    }

    if (sub === 'list') {
        window.gameState.flags.ranStashList = true;
        if (!state.stashStack.length) return { success: true, message: '', xp: 0 };
        const out = state.stashStack.map((s, i) => 'stash@{' + i + '}: ' + s.message).join('\n');
        return { success: true, message: out, xp: 5 };
    }

    const ref = args[1] || 'stash@{0}';
    const match = ref.match(/^stash@\{(\d+)\}$/);
    const idx = match ? Number(match[1]) : 0;
    const entry = state.stashStack[idx];

    if ((sub === 'apply' || sub === 'pop') && !entry) {
        return { success: false, message: 'No stash entries found.', xp: 0 };
    }

    if (sub === 'apply' || sub === 'pop') {
        if (isWorkingTreeDirty(state)) {
            return {
                success: false,
                message: 'error: Your local changes would be overwritten by stash apply.',
                xp: 0
            };
        }

        writeWorkingSnapshot(entry.workingSnapshot || {});
        state.index = deepClone(entry.index || {});
        state.staged = Object.keys(state.index);

        if (sub === 'pop') {
            window.gameState.flags.ranStashPop = true;
            state.stashStack.splice(idx, 1);
            return { success: true, message: 'Dropped refs/stash@{' + idx + '} (restored files)', xp: 15 };
        }
        window.gameState.flags.ranStashApply = true;
        return { success: true, message: 'Applied stash@{' + idx + '}', xp: 10 };
    }

    if (sub === 'drop') {
        if (!entry) return { success: false, message: 'No stash entries found.', xp: 0 };
        state.stashStack.splice(idx, 1);
        return { success: true, message: 'Dropped stash@{' + idx + '}', xp: 10 };
    }

    return { success: true, message: '', xp: 0 };
};

gitCommands.tag = function(args) {
    if (!isGitRepo()) {
        return { success: true, message: 'fatal: not a git repository', xp: 0 };
    }

    if (args.length === 0) {
        return { success: true, message: 'No tags yet', xp: 0 };
    }

    const tagName = args[0];
    localStorage.setItem('gwa_tag', 'true');
    window.gameState.flags = window.gameState.flags || {};
    window.gameState.flags.ranTag = true;

    state.tags = state.tags || {};

    const annotateIndex = args.findIndex((a) => a === '-a');
    const messageIndex = args.findIndex((a) => a === '-m');
    const target = state.refs[state.currentBranch] || null;
    const now = new Date().toISOString();

    if (annotateIndex !== -1 && messageIndex !== -1 && args[messageIndex + 1]) {
        window.gameState.flags.createdAnnotatedTag = true;
        state.tags[tagName] = {
            name: tagName,
            target: target,
            annotated: true,
            message: args[messageIndex + 1],
            tagger: {
                name: readConfigValue(state, 'user.name') || 'You',
                email: readConfigValue(state, 'user.email') || 'you@example.com',
                date: now
            }
        };
        return { success: true, message: '[ tagged ' + tagName + ' ]', xp: 30 };
    }

    state.tags[tagName] = {
        name: tagName,
        target: target,
        annotated: false,
        message: '',
        tagger: {
            name: readConfigValue(state, 'user.name') || 'You',
            email: readConfigValue(state, 'user.email') || 'you@example.com',
            date: now
        }
    };
    return { success: true, message: 'Tagged ' + tagName, xp: 25 };
};

gitCommands.submodule = function(args) {
    if (!isGitRepo()) {
        return { success: false, message: 'fatal: not a git repository', xp: 0 };
    }
    const sub = args[0] || '';
    window.gameState.flags = window.gameState.flags || {};
    window.gameState.flags.ranSubmodule = true;
    if (sub === 'add' && args[1] && args[2]) {
        return { success: true, message: "Submodule '" + args[2] + "' added", xp: 25 };
    }
    if (sub === 'update' || sub === 'init') {
        return { success: true, message: 'Submodule operation complete', xp: 10 };
    }
    return { success: true, message: 'usage: git submodule add <url> <path> | update | init', xp: 0 };
};

gitCommands.rebase = function(args) {
    if (!isGitRepo()) {
        return { success: false, message: 'fatal: not a git repository', xp: 0 };
    }

    const state = ensureGitState();
    localStorage.setItem('gwa_rebase', 'true');
    window.gameState.flags = window.gameState.flags || {};
    window.gameState.flags.ranRebase = true;
    const interactive = args.includes('-i') || args.includes('--interactive');
    const plain = args.filter((a) => !a.startsWith('-'));
    const upstreamRef = plain[0];

    if (!upstreamRef) {
        return { success: false, message: 'usage: git rebase [--interactive] <upstream>', xp: 0 };
    }

    if (isWorkingTreeDirty(state)) {
        return {
            success: false,
            message: 'error: cannot rebase: You have unstaged changes.\nerror: Please commit or stash them.',
            xp: 0
        };
    }

    const upstreamSha = resolveRevision(state, upstreamRef);
    if (!upstreamSha) {
        return { success: false, message: "fatal: invalid upstream '" + upstreamRef + "'", xp: 0 };
    }

    if (interactive) {
        window.gameState.flags.ranRebaseInteractive = true;
        // In this educational simulator, invoking interactive mode is enough to satisfy
        // "edited/reordered/squashed" intent even if the replay is a no-op.
        window.gameState.flags.ranRebaseEdited = true;
    } else {
        window.gameState.flags.ranRebaseBasic = true;
    }

    const headSha = state.refs[state.currentBranch] || null;
    if (!headSha) {
        return { success: false, message: 'Current branch has no commits to rebase.', xp: 0 };
    }

    const upstreamAnc = getAncestors(state, upstreamSha);
    const toReplay = [];
    let ptr = headSha;
    while (ptr && !upstreamAnc.has(ptr)) {
        const c = state.commitBySha[ptr];
        if (!c) break;
        toReplay.push(c);
        ptr = (c.parents && c.parents[0]) || null;
    }

    if (!toReplay.length) {
        return {
            success: true,
            message: interactive ? 'Successfully rebased and edited 0 commit(s)\nUpdated refs/heads/' + state.currentBranch : 'Current branch is up to date.',
            xp: interactive ? 55 : 5
        };
    }

    toReplay.reverse();
    let baseSha = upstreamSha;
    let baseSnapshot = deepClone(getSnapshotForSha(state, upstreamSha));
    let rebased = 0;

    for (const commit of toReplay) {
        const diff = getCommitDiff(commit);
        const applied = applyDiffToSnapshot(baseSnapshot, diff);
        if (applied.conflicts.length) {
            return {
                success: false,
                message: 'error: could not apply ' + commit.shortSha + '... ' + commit.message + '\n' +
                    'hint: conflicting files: ' + applied.conflicts.join(', '),
                xp: 0
            };
        }

        const created = createCommitFromSnapshot(state, {
            snapshot: applied.snapshot,
            parents: [baseSha],
            message: commit.message,
            authorName: commit.authorName,
            authorEmail: commit.authorEmail,
            allowEmpty: true
        });

        if (created.error) {
            return { success: false, message: created.error, xp: 0 };
        }

        baseSha = created.commit.sha;
        baseSnapshot = applied.snapshot;
        rebased++;
    }

    state.refs[state.currentBranch] = baseSha;
    state.index = {};
    state.staged = [];
    writeWorkingSnapshot(baseSnapshot);
    refreshTrackedFiles(state);
    window.gameState.flags.ranRebaseBasic = true;

    if (interactive) {
        localStorage.setItem('gwa_interactive_rebase', 'true');
        if (window.gameEngine && document.getElementById('bossOverlay')?.classList.contains('show')) {
            window.gameEngine.damageBoss(40);
        }
        return {
            success: true,
            message: 'Successfully rebased and edited ' + rebased + ' commit(s)\nUpdated refs/heads/' + state.currentBranch,
            xp: 55
        };
    }

    if (window.gameEngine && document.getElementById('bossOverlay')?.classList.contains('show')) {
        window.gameEngine.damageBoss(40);
    }
    return { success: true, message: 'Successfully rebased and updated refs/heads/' + state.currentBranch, xp: 40 };
};

gitCommands.cherrypick = function(args) {
    if (!isGitRepo()) {
        return { success: false, message: 'fatal: not a git repository', xp: 0 };
    }

    const state = ensureGitState();
    localStorage.setItem('gwa_cherrypick', 'true');
    window.gameState.flags = window.gameState.flags || {};
    window.gameState.flags.ranCherryPick = true;
    const targetRef = args.find((a) => !a.startsWith('-'));

    if (!targetRef) {
        return { success: false, message: 'usage: git cherry-pick <commit>', xp: 0 };
    }

    if (isWorkingTreeDirty(state)) {
        return {
            success: false,
            message: 'error: your local changes would be overwritten by cherry-pick.\nHint: commit or stash them first.',
            xp: 0
        };
    }

    const targetSha = resolveRevision(state, targetRef);
    if (!targetSha || !state.commitBySha[targetSha]) {
        return { success: false, message: "fatal: bad revision '" + targetRef + "'", xp: 0 };
    }

    const targetCommit = state.commitBySha[targetSha];
    const diff = getCommitDiff(targetCommit);
    const headSnapshot = deepClone(getHeadSnapshot(state));
    const applied = applyDiffToSnapshot(headSnapshot, diff);

    if (applied.conflicts.length) {
        return {
            success: false,
            message: 'error: could not apply ' + targetCommit.shortSha + '... ' + targetCommit.message + '\n' +
                'hint: conflicting files: ' + applied.conflicts.join(', '),
            xp: 0
        };
    }

    const created = createCommitFromSnapshot(state, {
        snapshot: applied.snapshot,
        parents: [state.refs[state.currentBranch] || null].filter(Boolean),
        message: targetCommit.message,
        authorName: targetCommit.authorName,
        authorEmail: targetCommit.authorEmail,
        allowEmpty: true
    });

    if (created.error) {
        return { success: false, message: created.error, xp: 0 };
    }

    writeWorkingSnapshot(applied.snapshot);
    state.index = {};
    state.staged = [];
    window.gameState.commits++;

    if (window.gameEngine) {
        window.gameEngine.checkObjectives();
    }

    if (window.gameEngine && document.getElementById('bossOverlay')?.classList.contains('show')) {
        window.gameEngine.damageBoss(35);
    }
    return {
        success: true,
        message: '[' + state.currentBranch + ' ' + created.commit.shortSha + '] ' + created.commit.message,
        xp: 50
    };
};
gitCommands['cherry-pick'] = gitCommands.cherrypick;

gitCommands.bisect = function(args) {
    window.gameState.flags = window.gameState.flags || {};
    if (args.includes('start')) {
        window.gameState.flags.ranBisectStart = true;
        return { success: true, message: 'Bisect started. Good and bad commits needed.', xp: 10 };
    }
    if (args.includes('good') || args.includes('bad')) {
        return { success: true, message: 'Bisect: checking commits...', xp: 15 };
    }
    if (args.includes('run')) {
        window.gameState.flags.ranBisectComplete = true;
        return { success: true, message: 'Bisect complete! Found the culprit.', xp: 35 };
    }
    if (args.includes('reset')) {
        return { success: true, message: 'Bisect reset done', xp: 5 };
    }

    return { success: true, message: 'git bisect start | good <commit> | bad <commit> | run <script>', xp: 0 };
};

gitCommands.reflog = function(args) {
    const state = ensureGitState();
    localStorage.setItem('gwa_recovery', 'true');
    window.gameState.flags = window.gameState.flags || {};
    window.gameState.flags.ranReflog = true;

    let output = '';
    state.commits.slice().reverse().forEach((c, i) => {
        output += 'HEAD@{' + i + '} ' + c.shortSha + ' ' + c.message + '\n';
    });

    return { success: true, message: output || 'No reflog entries', xp: 15 };
};

gitCommands.reset = function(args) {
    if (!isGitRepo()) {
        return { success: false, message: 'fatal: not a git repository', xp: 0 };
    }

    const state = ensureGitState();
    let mode = 'mixed';
    if (args.includes('--soft')) mode = 'soft';
    if (args.includes('--hard')) mode = 'hard';

    const targetRef = args.find((a) => !a.startsWith('-')) || 'HEAD';
    const targetSha = resolveRevision(state, targetRef);

    if (!targetSha) {
        return { success: false, message: "fatal: ambiguous argument '" + targetRef + "': unknown revision", xp: 0 };
    }

    state.refs[state.currentBranch] = targetSha;
    const snapshot = getSnapshotForSha(state, targetSha);

    if (mode === 'hard') {
        window.gameState.flags = window.gameState.flags || {};
        window.gameState.flags.ranResetHard = true;
        if (targetRef !== 'HEAD') window.gameState.flags.recoveredCommit = true;
        writeWorkingSnapshot(snapshot);
        state.index = {};
        state.staged = [];
        refreshTrackedFiles(state);
        return { success: true, message: 'HEAD is now at ' + targetSha.slice(0, 7), xp: 20 };
    }

    refreshTrackedFiles(state);

    if (mode === 'soft') {
        window.gameState.flags = window.gameState.flags || {};
        window.gameState.flags.ranResetSoft = true;
        if (targetRef !== 'HEAD') window.gameState.flags.recoveredCommit = true;
        return { success: true, message: 'HEAD is now at ' + targetSha.slice(0, 7), xp: 15 };
    }

    // mixed reset (default): keep working tree, clear index
    state.index = {};
    state.staged = [];
    window.gameState.flags = window.gameState.flags || {};
    window.gameState.flags.ranResetMixed = true;
    if (targetRef !== 'HEAD') window.gameState.flags.recoveredCommit = true;
    return { success: true, message: 'Unstaged changes after reset', xp: 10 };
};

gitCommands.diff = function(args) {
    if (!isGitRepo()) {
        return { success: true, message: 'fatal: not a git repository', xp: 0 };
    }
    return { success: true, message: 'No differences to show\n(note: diff is simulated in Git Wizard Academy)', xp: 5 };
};

gitCommands.show = function(args) {
    if (!isGitRepo()) {
        return { success: true, message: 'fatal: not a git repository', xp: 0 };
    }

    const state = ensureGitState();
    if (!state.commits.length) {
        return { success: false, message: 'No commits to show', xp: 0 };
    }

    const commit = state.commits[state.commits.length - 1];
    return {
        success: true,
        message: 'commit ' + commit.sha + '\nAuthor: ' + commit.author + '\nDate:   ' + new Date(commit.timestamp).toLocaleString() + '\n\n    ' + commit.message,
        xp: 10
    };
};

gitCommands.remote = async function(args) {
    if (window.gameEngine && window.gameEngine.isLiveGitHubConnected && window.gameEngine.isLiveGitHubConnected()) {
        const live = window.gameEngine.getLiveGitHubState ? window.gameEngine.getLiveGitHubState() : {};
        const repo = live.repo || {};
        if (args.length === 0 || args.includes('-v')) {
            const url = repo.clone_url || repo.html_url || 'https://github.com/';
            return { success: true, message: 'origin  ' + url + ' (fetch)\norigin  ' + url + ' (push)\n(note: Live GitHub Mode is connected)', xp: 5 };
        }
        if (args.includes('add')) {
            return { success: true, message: '(note: Live GitHub Mode manages the remote bridge for you)', xp: 10 };
        }
        return { success: true, message: '(note: Live GitHub Mode is connected)', xp: 0 };
    }

    if (args.length === 0 || args.includes('-v')) {
        return { success: true, message: 'origin  (fetch)\norigin  (push)\n(note: remotes are simulated in Git Wizard Academy)', xp: 5 };
    }
    if (args.includes('add')) {
        return { success: true, message: '(note: remotes are simulated in Git Wizard Academy)', xp: 10 };
    }
    return { success: true, message: '', xp: 0 };
};

gitCommands.fetch = async function(args) {
    if (window.gameEngine && window.gameEngine.isLiveGitHubConnected && window.gameEngine.isLiveGitHubConnected()) {
        const result = await window.gameEngine.fetchLiveGitHubRepo();
        return {
            success: true,
            message: (result && result.result && result.result.output ? result.result.output : 'Fetched remote refs.') + '\n(note: Live GitHub Mode fetched real GitHub refs)',
            xp: 15
        };
    }
    return { success: true, message: 'From /\n   a8949f9..3b2a0c5  main     -> origin/main\n(note: fetch is simulated in Git Wizard Academy)', xp: 15 };
};

gitCommands.pull = async function(args) {
    if (window.gameEngine && window.gameEngine.isLiveGitHubConnected && window.gameEngine.isLiveGitHubConnected()) {
        const result = await window.gameEngine.pullLiveGitHubRepo();
        return {
            success: true,
            message: (result && result.result && result.result.output ? result.result.output : 'Pulled from remote.') + '\n(note: Live GitHub Mode pulled from GitHub)',
            xp: 25
        };
    }
    return { success: true, message: 'Updating a8949f9..3b2a0c5\nFast-forward\n file.txt | 2 +-\n 1 file changed, 1 insertion(+), 1 deletion(-)\n(note: pull is simulated in Git Wizard Academy)', xp: 25 };
};

gitCommands.push = async function(args) {
    if (window.gameEngine && window.gameEngine.isLiveGitHubConnected && window.gameEngine.isLiveGitHubConnected()) {
        const result = await window.gameEngine.pushLiveGitHubRepo();
        return {
            success: true,
            message: (result && result.result && result.result.repo ? ('Pushed to ' + result.result.repo.owner + '/' + result.result.repo.name) : 'Pushed to GitHub') + '\n(note: Live GitHub Mode pushed real branches and tags)',
            xp: 25
        };
    }
    return { success: true, message: 'To /repo.git\n   a8949f9..3b2a0c5  main -> main\n(note: push is simulated in Git Wizard Academy)', xp: 25 };
};

// Export
window.gitCommands = gitCommands;

// js/export-repo.js
/**
 * Real Repository Export Mode
 * Node-only exporter that reconstructs a playable Git repo from the simulated state.
 */

const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function runGit(args, cwd, env) {
    return execFileSync('git', args, {
        cwd,
        env: Object.assign({}, process.env, env || {}),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
    });
}

function runGitQuiet(args, cwd, env) {
    try {
        return runGit(args, cwd, env);
    } catch (err) {
        const stderr = err && err.stderr ? String(err.stderr) : '';
        const stdout = err && err.stdout ? String(err.stdout) : '';
        const detail = [stdout, stderr].filter(Boolean).join('\n').trim();
        const msg = detail || (err && err.message ? err.message : 'git command failed');
        const error = new Error(msg);
        error.cause = err;
        throw error;
    }
}

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function removeTreeButKeep(dir, keepNames) {
    const keep = new Set(keepNames || []);
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (keep.has(entry.name)) continue;
        fs.rmSync(path.join(dir, entry.name), { recursive: true, force: true });
    }
}

function writeSnapshotToWorktree(repoDir, files) {
    removeTreeButKeep(repoDir, ['.git']);
    Object.keys(files || {}).sort().forEach((filePath) => {
        const full = path.join(repoDir, filePath);
        ensureDir(path.dirname(full));
        fs.writeFileSync(full, String(files[filePath] == null ? '' : files[filePath]));
    });
}

function flattenFileSystemSnapshot(snapshot) {
    if (!snapshot) return {};

    if (snapshot.files && typeof snapshot.files === 'object') {
        return deepClone(snapshot.files);
    }
    if (snapshot.workingTree && typeof snapshot.workingTree === 'object') {
        return deepClone(snapshot.workingTree);
    }
    if (snapshot.snapshot && typeof snapshot.snapshot === 'object') {
        return deepClone(snapshot.snapshot);
    }

    const tree = snapshot.fs || snapshot;
    const root = tree['/'] || tree;
    const out = {};

    const walk = function(node, prefix) {
        if (!node || node.type !== 'directory') return;
        const children = node.children || {};
        Object.keys(children).forEach((name) => {
            const child = children[name];
            const rel = prefix ? prefix + '/' + name : name;
            if (child.type === 'directory') {
                walk(child, rel);
            } else if (child.type === 'file') {
                out[rel] = String(child.content || '');
            }
        });
    };

    walk(root, '');
    return out;
}

function normalizeCommit(commit, fallbackIndex) {
    const authorMatch = String(commit.author || '').match(/^(.*?)(?:\s*<([^>]+)>)?$/);
    const parents = Array.isArray(commit.parents) ? commit.parents.slice() : (commit.parent ? [commit.parent] : []);
    const snapshot = commit.snapshot && typeof commit.snapshot === 'object'
        ? deepClone(commit.snapshot)
        : (commit.files && typeof commit.files === 'object' ? deepClone(commit.files) : {});

    return {
        sha: String(commit.sha || commit.id || ('commit-' + fallbackIndex)),
        shortSha: String(commit.shortSha || String(commit.sha || commit.id || fallbackIndex).slice(0, 7)),
        message: String(commit.message || 'Update'),
        authorName: String(commit.authorName || (authorMatch && authorMatch[1] ? authorMatch[1].trim() : 'You')),
        authorEmail: String(commit.authorEmail || (authorMatch && authorMatch[2] ? authorMatch[2].trim() : 'you@example.com')),
        timestamp: String(commit.timestamp || commit.date || new Date().toISOString()),
        parents,
        branch: commit.branch || '',
        snapshot,
        original: commit
    };
}

function topoSort(commits) {
    const items = commits.map(normalizeCommit);
    const bySha = new Map(items.map((c) => [c.sha, c]));
    const originalOrder = items.map((c, idx) => [c.sha, idx]).sort((a, b) => a[1] - b[1]).map((x) => x[0]);
    const remaining = new Set(items.map((c) => c.sha));
    const ordered = [];

    while (remaining.size) {
        let progressed = false;
        for (const sha of originalOrder) {
            if (!remaining.has(sha)) continue;
            const commit = bySha.get(sha);
            const parentsKnown = commit.parents.every((p) => !remaining.has(p) || bySha.has(p) === false);
            if (!parentsKnown) continue;
            ordered.push(commit);
            remaining.delete(sha);
            progressed = true;
        }
        if (!progressed) {
            throw new Error('Unable to topologically sort commits for export; missing parent chain or cycle detected.');
        }
    }

    return ordered;
}

function getGitIdentity(state) {
    const cfg = (state.gitState && state.gitState.config && (state.gitState.config.local || state.gitState.config.global)) || {};
    const globalCfg = (state.gitState && state.gitState.config && state.gitState.config.global) || {};
    const localCfg = (state.gitState && state.gitState.config && state.gitState.config.local) || {};
    return {
        name: localCfg['user.name'] || globalCfg['user.name'] || cfg['user.name'] || 'You',
        email: localCfg['user.email'] || globalCfg['user.email'] || cfg['user.email'] || 'you@example.com'
    };
}

function compareSnapshots(a, b) {
    const left = flattenFileSystemSnapshot(a);
    const right = flattenFileSystemSnapshot(b);
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    for (const key of keys) {
        if (String(left[key] || '') !== String(right[key] || '')) return true;
    }
    return false;
}

function createTempRoot() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'gwa-export-'));
}

function initRepo(repoDir) {
    try {
        runGitQuiet(['init', '-b', 'main'], repoDir);
    } catch (err) {
        runGitQuiet(['init'], repoDir);
        runGitQuiet(['branch', '-M', 'main'], repoDir);
    }
    runGitQuiet(['config', 'user.name', 'Git Wizard Academy'], repoDir);
    runGitQuiet(['config', 'user.email', 'academy@example.com'], repoDir);
    runGitQuiet(['config', 'core.autocrlf', 'false'], repoDir);
}

function createCommitObjects(repoDir, commits, identity) {
    const ordered = commits.length ? topoSort(commits) : [];
    const shaMap = new Map();

    if (!ordered.length) {
        const emptyCommit = {
            sha: '__root__',
            shortSha: '__root__'.slice(0, 7),
            message: 'Initial export snapshot',
            authorName: identity.name,
            authorEmail: identity.email,
            timestamp: new Date().toISOString(),
            parents: [],
            branch: 'main',
            snapshot: flattenFileSystemSnapshot({ fs: { '/': { type: 'directory', children: {} } } }),
            original: {}
        };
        writeSnapshotToWorktree(repoDir, emptyCommit.snapshot);
        runGitQuiet(['add', '-A'], repoDir);
        const treeSha = runGitQuiet(['write-tree'], repoDir).trim();
        const env = {
            GIT_AUTHOR_NAME: identity.name,
            GIT_AUTHOR_EMAIL: identity.email,
            GIT_AUTHOR_DATE: emptyCommit.timestamp,
            GIT_COMMITTER_NAME: identity.name,
            GIT_COMMITTER_EMAIL: identity.email,
            GIT_COMMITTER_DATE: emptyCommit.timestamp
        };
        const newSha = runGitQuiet(['commit-tree', treeSha, '-m', emptyCommit.message], repoDir, env).trim();
        shaMap.set('__root__', newSha);
        return { ordered: [emptyCommit], shaMap, rootSha: newSha };
    }

    ordered.forEach((commit) => {
        writeSnapshotToWorktree(repoDir, commit.snapshot);
        runGitQuiet(['add', '-A'], repoDir);
        const treeSha = runGitQuiet(['write-tree'], repoDir).trim();
        const args = ['commit-tree', treeSha];
        commit.parents.forEach((parentSha) => {
            if (shaMap.has(parentSha)) {
                args.push('-p', shaMap.get(parentSha));
            }
        });
        args.push('-m', commit.message);

        const env = {
            GIT_AUTHOR_NAME: commit.authorName || identity.name,
            GIT_AUTHOR_EMAIL: commit.authorEmail || identity.email,
            GIT_AUTHOR_DATE: commit.timestamp,
            GIT_COMMITTER_NAME: commit.authorName || identity.name,
            GIT_COMMITTER_EMAIL: commit.authorEmail || identity.email,
            GIT_COMMITTER_DATE: commit.timestamp
        };
        const newSha = runGitQuiet(args, repoDir, env).trim();
        shaMap.set(commit.sha, newSha);
    });

    return { ordered, shaMap, rootSha: null };
}

function determineHeadCommit(state, shaMap) {
    const gitState = state.gitState || {};
    const headRef = gitState.headRef || '';
    const currentBranch = gitState.currentBranch || '';
    const refs = gitState.refs || {};
    const originalHead = gitState.head || (currentBranch ? refs[currentBranch] : null);
    const mappedHead = originalHead && shaMap.has(originalHead) ? shaMap.get(originalHead) : null;
    const branchName = headRef && headRef.startsWith('refs/heads/')
        ? headRef.slice('refs/heads/'.length)
        : (currentBranch || null);
    const detached = !!headRef && !headRef.startsWith('refs/heads/');

    return { branchName, detached, mappedHead };
}

function createSyntheticWipCommit(repoDir, state, shaMap, identity) {
    const gitState = state.gitState || {};
    const currentBranch = gitState.currentBranch || 'main';
    const headOriginal = gitState.refs && gitState.refs[currentBranch];
    if (!headOriginal || !shaMap.has(headOriginal)) return null;

    const currentFs = flattenFileSystemSnapshot(state.fsSnapshot || state.fileSystem || state.workingTree || {});
    const headCommitOriginal = (gitState.commitBySha && gitState.commitBySha[headOriginal]) || null;
    const headSnapshot = headCommitOriginal && headCommitOriginal.snapshot ? headCommitOriginal.snapshot : {};
    if (!compareSnapshots({ files: currentFs }, { files: headSnapshot })) {
        return null;
    }

    writeSnapshotToWorktree(repoDir, currentFs);
    runGitQuiet(['add', '-A'], repoDir);
    const treeSha = runGitQuiet(['write-tree'], repoDir).trim();
    const env = {
        GIT_AUTHOR_NAME: identity.name,
        GIT_AUTHOR_EMAIL: identity.email,
        GIT_AUTHOR_DATE: new Date().toISOString(),
        GIT_COMMITTER_NAME: identity.name,
        GIT_COMMITTER_EMAIL: identity.email,
        GIT_COMMITTER_DATE: new Date().toISOString()
    };
    const sha = runGitQuiet(['commit-tree', treeSha, '-p', shaMap.get(headOriginal), '-m', 'WIP export snapshot'], repoDir, env).trim();
    shaMap.set('__wip_export__', sha);
    return sha;
}

function applyRefs(repoDir, state, shaMap, mode, workflowRoot, rootSha) {
    const gitState = state.gitState || {};
    const refs = gitState.refs || {};
    const branches = Array.isArray(gitState.branches) ? gitState.branches : [];

    branches.forEach((branch) => {
        const original = refs[branch];
        if (original && shaMap.has(original)) {
            runGitQuiet(['update-ref', 'refs/heads/' + branch, shaMap.get(original)], repoDir);
        } else if (branch === (gitState.currentBranch || 'main') && rootSha) {
            runGitQuiet(['update-ref', 'refs/heads/' + branch, rootSha], repoDir);
        }
    });

    const tags = gitState.tags || {};
    Object.keys(tags).forEach((tagName) => {
        const tag = tags[tagName];
        const target = tag && tag.target && shaMap.has(tag.target) ? shaMap.get(tag.target) : null;
        if (!target) return;
        if (tag.annotated) {
            const env = {
                GIT_COMMITTER_NAME: (tag.tagger && tag.tagger.name) || 'You',
                GIT_COMMITTER_EMAIL: (tag.tagger && tag.tagger.email) || 'you@example.com',
                GIT_COMMITTER_DATE: (tag.tagger && tag.tagger.date) || new Date().toISOString()
            };
            runGitQuiet(['tag', '-a', tagName, '-m', tag.message || tagName, target], repoDir, env);
        } else {
            runGitQuiet(['tag', tagName, target], repoDir);
        }
    });

    const head = determineHeadCommit(state, shaMap);
    if (head.detached) {
        if (head.mappedHead) {
            runGitQuiet(['checkout', '--detach', head.mappedHead], repoDir);
        }
    } else if (head.branchName) {
        const branchSha = refs[head.branchName] && shaMap.has(refs[head.branchName]) ? shaMap.get(refs[head.branchName]) : head.mappedHead;
        if (branchSha) {
            runGitQuiet(['checkout', '-f', '-B', head.branchName, branchSha], repoDir);
            runGitQuiet(['symbolic-ref', 'HEAD', 'refs/heads/' + head.branchName], repoDir);
        }
    }

    if (mode === 'workflow' && workflowRoot) {
        const remoteDir = path.join(workflowRoot, 'origin.git');
        runGitQuiet(['init', '--bare', remoteDir], workflowRoot);
        const relRemote = path.relative(repoDir, remoteDir) || '.';
        runGitQuiet(['remote', 'add', 'origin', relRemote], repoDir);
        runGitQuiet(['push', '--mirror', 'origin'], repoDir);
        const currentBranch = gitState.currentBranch || 'main';
        if (branches.includes(currentBranch)) {
            try {
                runGitQuiet(['branch', '--set-upstream-to=origin/' + currentBranch, currentBranch], repoDir);
            } catch (e) {
                // Non-fatal for detached or unusual histories.
            }
        }
    }

    runGitQuiet(['reset', '--hard'], repoDir);
}

function createZip(archivePath, rootDir, entries) {
    execFileSync('zip', ['-qr', archivePath].concat(entries), {
        cwd: rootDir,
        stdio: ['ignore', 'pipe', 'pipe']
    });
    return archivePath;
}

function buildExport(state, options) {
    const mode = (options && options.mode) || 'clean';
    const exportRoot = createTempRoot();
    const repoDir = path.join(exportRoot, 'repo');
    ensureDir(repoDir);
    initRepo(repoDir);

    const identity = getGitIdentity(state);
    runGitQuiet(['config', 'user.name', identity.name], repoDir);
    runGitQuiet(['config', 'user.email', identity.email], repoDir);

    const commits = ((state.gitState && state.gitState.commits) || []).map(normalizeCommit);
    const created = createCommitObjects(repoDir, commits, identity);
    const shaMap = created.shaMap;

    if (mode !== 'clean') {
        createSyntheticWipCommit(repoDir, state, shaMap, identity);
    }

    applyRefs(repoDir, state, shaMap, mode, exportRoot, created.rootSha);

    const archiveName = 'git-wizard-export-' + mode + '.zip';
    const archivePath = path.join(os.tmpdir(), archiveName);
    if (fs.existsSync(archivePath)) fs.rmSync(archivePath, { force: true });
    createZip(archivePath, exportRoot, ['repo'].concat(mode === 'workflow' ? ['origin.git'] : []));

    return {
        mode,
        exportRoot,
        repoDir,
        archivePath
    };
}

function exportClean(state, options) {
    return buildExport(state, Object.assign({}, options, { mode: 'clean' }));
}

function exportFullHistory(state, options) {
    return buildExport(state, Object.assign({}, options, { mode: 'full' }));
}

function exportWithWorkflow(state, options) {
    return buildExport(state, Object.assign({}, options, { mode: 'workflow' }));
}

module.exports = {
    exportClean,
    exportFullHistory,
    exportWithWorkflow,
    buildExport,
    flattenFileSystemSnapshot
};

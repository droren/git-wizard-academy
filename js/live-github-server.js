// js/live-github-server.js
/**
 * Live GitHub Mode bridge.
 * A local Node service that keeps GitHub credentials out of the browser and
 * bridges the simulator to real GitHub REST API + git CLI workflows.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { buildExport } = require('./export-repo.js');

function runGit(args, cwd, env) {
    return execFileSync('git', args, {
        cwd,
        env: Object.assign({}, process.env, env || {}, {
            GIT_TERMINAL_PROMPT: '0'
        }),
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

function safeJson(raw, fallback) {
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch (err) {
        return fallback;
    }
}

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function sanitizeRepoName(value) {
    return String(value || 'git-wizard-academy')
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'git-wizard-academy';
}

function defaultSessionPath(baseDir) {
    return path.join(baseDir || os.tmpdir(), 'gwa-live-github-session.json');
}

function publicSession(session) {
    const clone = JSON.parse(JSON.stringify(session || {}));
    if (clone.token) delete clone.token;
    return clone;
}

function authHeaders(token, extra) {
    return Object.assign({
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
    }, extra || {});
}

async function githubRequest(fetchImpl, apiBase, token, method, endpoint, body) {
    const res = await fetchImpl(apiBase.replace(/\/$/, '') + endpoint, {
        method,
        headers: authHeaders(token),
        body: body ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    let payload = null;
    try {
        payload = text ? JSON.parse(text) : null;
    } catch (err) {
        payload = text;
    }
    if (!res.ok) {
        const message = payload && payload.message ? payload.message : String(text || res.statusText || 'GitHub API request failed');
        const error = new Error(message);
        error.status = res.status;
        error.payload = payload;
        throw error;
    }
    return payload;
}

function makeRemoteUrl(repoCloneUrl, token) {
    const match = String(repoCloneUrl || '').match(/^https:\/\/github\.com\/(.+?)(?:\.git)?$/i);
    if (!match) return repoCloneUrl;
    return 'https://x-access-token:' + encodeURIComponent(token) + '@github.com/' + match[1] + '.git';
}

function loadSession(sessionPath) {
    if (!fs.existsSync(sessionPath)) {
        return {
            authenticated: false,
            token: '',
            apiBase: 'https://api.github.com',
            webBase: 'https://github.com',
            user: null,
            repo: null,
            lastSync: null
        };
    }
    return Object.assign({
        authenticated: false,
        token: '',
        apiBase: 'https://api.github.com',
        webBase: 'https://github.com',
        user: null,
        repo: null,
        lastSync: null
    }, safeJson(fs.readFileSync(sessionPath, 'utf8'), {}));
}

function saveSession(sessionPath, session) {
    ensureDir(path.dirname(sessionPath));
    fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2), { mode: 0o600 });
    try {
        fs.chmodSync(sessionPath, 0o600);
    } catch (err) {
        // Best-effort on platforms that do not support chmod.
    }
}

function createWorkflowYaml() {
    return [
        'name: Git Wizard Academy CI',
        '',
        'on:',
        '  push:',
        '    branches:',
        '      - main',
        '      - "feature/**"',
        '  pull_request:',
        '',
        'jobs:',
        '  validate:',
        '    runs-on: ubuntu-latest',
        '    steps:',
        '      - name: Checkout repository',
        '        uses: actions/checkout@v4',
        '      - name: Setup Node',
        '        uses: actions/setup-node@v4',
        '        with:',
        '          node-version: "20"',
        '      - name: Run academy checks',
        '        run: |',
        '          chmod +x tests/run-all.sh || true',
        '          ./tests/run-all.sh'
    ].join('\n') + '\n';
}

function normalizePayload(payload) {
    const body = payload || {};
    return {
        mode: body.mode || 'live',
        apiBase: body.apiBase || 'https://api.github.com',
        webBase: body.webBase || 'https://github.com',
        token: body.token || '',
        repoName: body.repoName || '',
        owner: body.owner || '',
        reuseExisting: !!body.reuseExisting,
        private: !!body.private,
        description: body.description || 'Git Wizard Academy live session',
        includeWorkflow: !!body.includeWorkflow,
        prTitle: body.prTitle || 'Git Wizard Academy lesson submission',
        prBody: body.prBody || '',
        baseBranch: body.baseBranch || 'main',
        headBranch: body.headBranch || '',
        reviewers: Array.isArray(body.reviewers) ? body.reviewers : [],
        mergeMethod: body.mergeMethod || 'merge',
        gameState: body.gameState || null,
        config: body.config || {},
        branchName: body.branchName || '',
        summary: body.summary || '',
        pullNumber: Number(body.pullNumber || 0) || 0,
        reviewEvent: body.reviewEvent || 'COMMENT',
        reviewBody: body.reviewBody || '',
        mergeTitle: body.mergeTitle || '',
        mergeMessage: body.mergeMessage || ''
    };
}

function createLiveGitHubService(options) {
    const fetchImpl = options && options.fetchImpl ? options.fetchImpl : global.fetch;
    if (typeof fetchImpl !== 'function') {
        throw new Error('fetch is required for Live GitHub Mode');
    }

    const exporter = options && options.exporter ? options.exporter : require('./export-repo.js');
    const tempDir = options && options.tempDir ? path.resolve(String(options.tempDir)) : path.join(os.tmpdir(), 'gwa-live-github');
    const sessionPath = options && options.sessionPath ? path.resolve(String(options.sessionPath)) : defaultSessionPath(tempDir);
    const session = loadSession(sessionPath);

    function persist() {
        saveSession(sessionPath, session);
    }

    async function authenticate(token, apiBase, webBase) {
        const user = await githubRequest(fetchImpl, apiBase || session.apiBase, token, 'GET', '/user', null);
        session.authenticated = true;
        session.token = token;
        session.apiBase = apiBase || session.apiBase || 'https://api.github.com';
        session.webBase = webBase || session.webBase || 'https://github.com';
        session.user = user;
        persist();
        return publicSession(session);
    }

    function requireAuth() {
        if (!session.authenticated || !session.token || !session.user) {
            throw new Error('Live GitHub Mode is not authenticated. Connect with a GitHub token first.');
        }
    }

    async function ensureRepository(payload) {
        requireAuth();
        const body = normalizePayload(payload);
        const repoName = sanitizeRepoName(body.repoName || (session.repo && session.repo.name) || session.user.login + '-git-wizard');
        const owner = sanitizeRepoName(body.owner || (session.repo && session.repo.owner) || session.user.login);
        let repo = null;

        if (body.reuseExisting) {
            repo = await githubRequest(fetchImpl, session.apiBase, session.token, 'GET', '/repos/' + owner + '/' + repoName, null);
        } else {
            try {
                repo = await githubRequest(fetchImpl, session.apiBase, session.token, 'POST', '/user/repos', {
                    name: repoName,
                    private: body.private,
                    description: body.description,
                    auto_init: false,
                    has_issues: true,
                    has_projects: false,
                    has_wiki: false
                });
            } catch (err) {
                if (err && err.status === 422) {
                    repo = await githubRequest(fetchImpl, session.apiBase, session.token, 'GET', '/repos/' + owner + '/' + repoName, null);
                } else {
                    throw err;
                }
            }
        }

        session.repo = {
            id: repo.id,
            name: repo.name,
            owner: repo.owner && repo.owner.login ? repo.owner.login : owner,
            html_url: repo.html_url,
            clone_url: repo.clone_url,
            ssh_url: repo.ssh_url,
            default_branch: repo.default_branch || 'main',
            private: !!repo.private
        };
        persist();
        return session.repo;
    }

    function buildLocalRepo(payload, mode) {
        if (!payload || !payload.gameState) {
            throw new Error('Live GitHub Mode needs the current simulator state to bootstrap a repository.');
        }
        return exporter.buildExport(payload.gameState, { mode: mode || 'full' });
    }

    async function syncLocalRepoToRemote(payload, mode) {
        const body = normalizePayload(payload);
        const repo = await ensureRepository(body);
        const local = buildLocalRepo(body, mode || 'full');
        const remoteUrl = makeRemoteUrl(repo.clone_url, session.token);

        try {
            runGitQuiet(['remote', 'remove', 'origin'], local.repoDir);
        } catch (err) {
            // remote may not exist yet
        }
        runGitQuiet(['remote', 'add', 'origin', remoteUrl], local.repoDir);
        runGitQuiet(['push', '--force', '--all', 'origin'], local.repoDir);
        runGitQuiet(['push', '--force', '--tags', 'origin'], local.repoDir);

        session.lastSync = new Date().toISOString();
        persist();
        return {
            repo,
            repoDir: local.repoDir,
            exportRoot: local.exportRoot,
            pushed: true,
            lastSync: session.lastSync
        };
    }

    async function fetchRemote(payload) {
        const body = normalizePayload(payload);
        const repo = await ensureRepository(body);
        const local = buildLocalRepo(body, 'full');
        const remoteUrl = makeRemoteUrl(repo.clone_url, session.token);

        try {
            runGitQuiet(['remote', 'remove', 'origin'], local.repoDir);
        } catch (err) {
            // ignore
        }
        runGitQuiet(['remote', 'add', 'origin', remoteUrl], local.repoDir);
        const output = runGitQuiet(['fetch', '--prune', 'origin'], local.repoDir);
        const branches = runGitQuiet(['branch', '-r'], local.repoDir);
        const status = runGitQuiet(['status', '--short'], local.repoDir);
        return {
            repo,
            output,
            branches,
            status
        };
    }

    async function pullRemote(payload) {
        const body = normalizePayload(payload);
        const repo = await ensureRepository(body);
        const local = buildLocalRepo(body, 'full');
        const remoteUrl = makeRemoteUrl(repo.clone_url, session.token);
        const currentBranch = body.gameState && body.gameState.gitState ? body.gameState.gitState.currentBranch || 'main' : 'main';

        try {
            runGitQuiet(['remote', 'remove', 'origin'], local.repoDir);
        } catch (err) {
            // ignore
        }
        runGitQuiet(['remote', 'add', 'origin', remoteUrl], local.repoDir);
        const output = runGitQuiet(['pull', '--ff-only', 'origin', currentBranch], local.repoDir);
        const status = runGitQuiet(['status', '--short'], local.repoDir);
        return {
            repo,
            output,
            status
        };
    }

    async function installWorkflow(payload) {
        const body = normalizePayload(payload);
        const repo = await ensureRepository(body);
        const branch = repo.default_branch || 'main';
        const workflowPath = '.github/workflows/git-wizard-academy-ci.yml';
        const getRes = await fetchImpl(session.apiBase.replace(/\/$/, '') + '/repos/' + repo.owner + '/' + repo.name + '/contents/' + workflowPath + '?ref=' + encodeURIComponent(branch), {
            method: 'GET',
            headers: authHeaders(session.token)
        });
        let existing = null;
        if (getRes.ok) {
            existing = await getRes.json();
        }

        const payloadBody = {
            message: 'chore(ci): add Git Wizard Academy workflow',
            content: Buffer.from(createWorkflowYaml(), 'utf8').toString('base64'),
            branch
        };
        if (existing && existing.sha) payloadBody.sha = existing.sha;

        const result = await githubRequest(fetchImpl, session.apiBase, session.token, 'PUT', '/repos/' + repo.owner + '/' + repo.name + '/contents/' + workflowPath, payloadBody);
        return { repo, workflowPath, result };
    }

    async function createPullRequest(payload) {
        const body = normalizePayload(payload);
        const repo = await ensureRepository(body);
        const result = await githubRequest(fetchImpl, session.apiBase, session.token, 'POST', '/repos/' + repo.owner + '/' + repo.name + '/pulls', {
            title: body.prTitle || 'Git Wizard Academy lesson submission',
            body: body.prBody || 'Auto-created from Git Wizard Academy.',
            head: body.headBranch || (body.gameState && body.gameState.gitState ? body.gameState.gitState.currentBranch : 'feature'),
            base: body.baseBranch || 'main',
            draft: false,
            maintainer_can_modify: true
        });
        return { repo, pr: result };
    }

    async function reviewPullRequest(payload) {
        const body = normalizePayload(payload);
        const repo = await ensureRepository(body);
        if (!body.pullNumber) throw new Error('pullNumber is required');
        const result = await githubRequest(fetchImpl, session.apiBase, session.token, 'POST', '/repos/' + repo.owner + '/' + repo.name + '/pulls/' + body.pullNumber + '/reviews', {
            event: body.reviewEvent || 'COMMENT',
            body: body.reviewBody || 'Automated review from Git Wizard Academy.'
        });
        return { repo, review: result };
    }

    async function getCombinedStatus(owner, repoName, sha) {
        const status = await githubRequest(fetchImpl, session.apiBase, session.token, 'GET', '/repos/' + owner + '/' + repoName + '/commits/' + sha + '/status', null);
        let checks = null;
        try {
            checks = await githubRequest(fetchImpl, session.apiBase, session.token, 'GET', '/repos/' + owner + '/' + repoName + '/commits/' + sha + '/check-runs', null);
        } catch (err) {
            checks = null;
        }
        return { status, checks };
    }

    async function mergePullRequest(payload) {
        const body = normalizePayload(payload);
        const repo = await ensureRepository(body);
        if (!body.pullNumber) throw new Error('pullNumber is required');
        const pr = await githubRequest(fetchImpl, session.apiBase, session.token, 'GET', '/repos/' + repo.owner + '/' + repo.name + '/pulls/' + body.pullNumber, null);
        const combined = await getCombinedStatus(repo.owner, repo.name, pr.head && pr.head.sha ? pr.head.sha : pr.head && pr.head.ref ? pr.head.ref : '');
        const state = combined.status && combined.status.state ? combined.status.state : 'pending';
        if (state !== 'success') {
            const err = new Error('PR cannot be merged until checks pass. Current status: ' + state);
            err.status = 409;
            throw err;
        }
        const result = await githubRequest(fetchImpl, session.apiBase, session.token, 'PUT', '/repos/' + repo.owner + '/' + repo.name + '/pulls/' + body.pullNumber + '/merge', {
            merge_method: body.mergeMethod || 'merge',
            commit_title: body.mergeTitle || 'Merge pull request',
            commit_message: body.mergeMessage || 'Merged from Git Wizard Academy'
        });
        return { repo, merge: result, combined };
    }

    async function reviewBot(payload) {
        const body = normalizePayload(payload);
        const repo = await ensureRepository(body);
        if (!body.pullNumber) throw new Error('pullNumber is required');
        const pr = await githubRequest(fetchImpl, session.apiBase, session.token, 'GET', '/repos/' + repo.owner + '/' + repo.name + '/pulls/' + body.pullNumber, null);
        const commits = await githubRequest(fetchImpl, session.apiBase, session.token, 'GET', '/repos/' + repo.owner + '/' + repo.name + '/pulls/' + body.pullNumber + '/commits', null);

        const problems = [];
        const branchName = String(pr.head && pr.head.ref || '');
        if (!/^feature\/|^hotfix\/|^bugfix\/|^release\//i.test(branchName)) {
            problems.push('Consider a feature/hotfix branch naming convention for clearer review history.');
        }
        (Array.isArray(commits) ? commits : []).forEach((commit) => {
            const msg = String(commit.commit && commit.commit.message || '').split('\n')[0];
            if (!/^(feat|fix|docs|chore|refactor|test|ci|style|perf|build|revert)(\([\w.-]+\))?:\s+.+/i.test(msg)) {
                problems.push('Commit "' + msg + '" does not follow conventional commit style.');
            }
        });

        let comment = null;
        if (problems.length) {
            comment = await githubRequest(fetchImpl, session.apiBase, session.token, 'POST', '/repos/' + repo.owner + '/' + repo.name + '/issues/' + body.pullNumber + '/comments', {
                body: [
                    'Git Wizard Academy review bot found a few things:',
                    '',
                    ...problems.map((line) => '- ' + line)
                ].join('\n')
            });
        }

        return { repo, pr, problems, comment };
    }

    async function getSession() {
        return publicSession(session);
    }

    async function logout() {
        session.authenticated = false;
        session.token = '';
        session.user = null;
        session.repo = null;
        session.lastSync = null;
        try {
            fs.unlinkSync(sessionPath);
        } catch (err) {
            // ignore
        }
        return publicSession(session);
    }

    async function remoteStatus(payload) {
        const body = normalizePayload(payload);
        const repo = await ensureRepository(body);
        const ref = body.headBranch || (body.gameState && body.gameState.gitState ? body.gameState.gitState.currentBranch || 'main' : 'main');
        const local = buildLocalRepo(body, 'full');
        const remoteUrl = makeRemoteUrl(repo.clone_url, session.token);

        try {
            runGitQuiet(['remote', 'remove', 'origin'], local.repoDir);
        } catch (err) {
            // ignore
        }
        runGitQuiet(['remote', 'add', 'origin', remoteUrl], local.repoDir);
        runGitQuiet(['fetch', '--prune', 'origin'], local.repoDir);
        const remoteBranches = runGitQuiet(['branch', '-r'], local.repoDir);
        const currentBranch = runGitQuiet(['branch', '--show-current'], local.repoDir).trim() || ref;
        const status = runGitQuiet(['status', '--short'], local.repoDir);
        return { repo, remoteBranches, currentBranch, status };
    }

    return {
        getSession,
        authenticate,
        logout,
        ensureRepository,
        syncLocalRepoToRemote,
        fetchRemote,
        pullRemote,
        installWorkflow,
        createPullRequest,
        reviewPullRequest,
        mergePullRequest,
        reviewBot,
        remoteStatus,
        getCombinedStatus
    };
}

function createLiveGitHubRequestHandler(options) {
    const service = options && options.service ? options.service : createLiveGitHubService(options);
    return async function (req, res) {
        const method = req.method || 'GET';
        const url = new URL(req.url, 'http://' + (req.headers.host || '127.0.0.1:31556'));

        function writeJson(statusCode, payload) {
            const body = JSON.stringify(payload, null, 2);
            res.writeHead(statusCode, {
                'Content-Type': 'application/json; charset=utf-8',
                'Content-Length': Buffer.byteLength(body),
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            });
            res.end(body);
        }

        function writeText(statusCode, text) {
            const body = String(text || '');
            res.writeHead(statusCode, {
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Length': Buffer.byteLength(body),
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            });
            res.end(body);
        }

        async function readBody() {
            return await new Promise((resolve, reject) => {
                const chunks = [];
                req.on('data', (chunk) => chunks.push(chunk));
                req.on('end', () => {
                    try {
                        const raw = Buffer.concat(chunks).toString('utf8');
                        resolve(raw ? JSON.parse(raw) : {});
                    } catch (err) {
                        reject(err);
                    }
                });
                req.on('error', reject);
            });
        }

        if (method === 'OPTIONS') {
            res.writeHead(204, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            });
            res.end();
            return;
        }

        try {
            if (method === 'GET' && url.pathname === '/health') {
                writeJson(200, { ok: true, mode: 'live-github' });
                return;
            }
            if (method === 'GET' && url.pathname === '/session') {
                writeJson(200, await service.getSession());
                return;
            }
            if (method === 'POST' && url.pathname === '/auth') {
                const body = normalizePayload(await readBody());
                const result = await service.authenticate(body.token, body.apiBase, body.webBase);
                writeJson(200, { ok: true, session: result });
                return;
            }
            if (method === 'POST' && url.pathname === '/logout') {
                writeJson(200, { ok: true, session: await service.logout() });
                return;
            }
            if (method === 'POST' && url.pathname === '/repo/create') {
                const repo = await service.ensureRepository(await readBody());
                writeJson(200, { ok: true, repo });
                return;
            }
            if (method === 'POST' && url.pathname === '/repo/bootstrap') {
                const result = await service.syncLocalRepoToRemote(await readBody(), 'full');
                writeJson(200, { ok: true, result });
                return;
            }
            if (method === 'POST' && url.pathname === '/push') {
                const result = await service.syncLocalRepoToRemote(await readBody(), 'full');
                writeJson(200, { ok: true, result });
                return;
            }
            if (method === 'POST' && url.pathname === '/fetch') {
                const result = await service.fetchRemote(await readBody());
                writeJson(200, { ok: true, result });
                return;
            }
            if (method === 'POST' && url.pathname === '/pull') {
                const result = await service.pullRemote(await readBody());
                writeJson(200, { ok: true, result });
                return;
            }
            if (method === 'POST' && url.pathname === '/workflow/install') {
                const result = await service.installWorkflow(await readBody());
                writeJson(200, { ok: true, result });
                return;
            }
            if (method === 'POST' && url.pathname === '/pr/create') {
                const result = await service.createPullRequest(await readBody());
                writeJson(200, { ok: true, result });
                return;
            }
            if (method === 'POST' && url.pathname === '/pr/review') {
                const result = await service.reviewPullRequest(await readBody());
                writeJson(200, { ok: true, result });
                return;
            }
            if (method === 'POST' && url.pathname === '/pr/merge') {
                const result = await service.mergePullRequest(await readBody());
                writeJson(200, { ok: true, result });
                return;
            }
            if (method === 'POST' && url.pathname === '/pr/review-bot') {
                const result = await service.reviewBot(await readBody());
                writeJson(200, { ok: true, result });
                return;
            }
            if (method === 'GET' && url.pathname === '/status') {
                const repo = await service.remoteStatus(safeJson(url.searchParams.get('payload') || '{}', {}));
                writeJson(200, { ok: true, result: repo });
                return;
            }

            writeText(404, 'not found');
        } catch (err) {
            writeJson(err && err.status ? err.status : 500, {
                ok: false,
                error: err && err.message ? err.message : String(err)
            });
        }
    };
}

function createLiveGitHubServer(options) {
    const port = Number(options && options.port) || 31556;
    const host = options && options.host ? String(options.host) : '127.0.0.1';
    const handler = createLiveGitHubRequestHandler(options);
    const server = http.createServer(handler);
    return {
        port,
        host,
        server,
        listen() {
            return new Promise((resolve, reject) => {
                server.once('error', reject);
                server.listen(port, host, () => {
                    server.off('error', reject);
                    resolve({ host, port });
                });
            });
        },
        close() {
            return new Promise((resolve) => server.close(() => resolve()));
        }
    };
}

module.exports = {
    createLiveGitHubService,
    createLiveGitHubRequestHandler,
    createLiveGitHubServer,
    createWorkflowYaml,
    sanitizeRepoName,
    makeRemoteUrl
};

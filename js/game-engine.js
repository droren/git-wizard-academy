// js/game-engine.js
/**
 * Game Engine for Git Wizard Academy
 * Handles XP, levels, achievements, and game state
 */

function createDefaultGameState() {
    return {
    // Lesson progression
currentLevel: 0,
    // Player rank (XP based)
    playerLevel: 1,
    lastPlayedDate: null,

    totalXP: 0,
    xpForCurrentLevel: 0,
    xpRequiredForLevel: 300,
    streak: 0,
    commandsUsed: 0,
    commits: 0,
    branches: 0,
    merges: 0,
    conflicts: 0,
        achievements: [],
        certificates: [],
        liveGitHub: {
            connected: false,
            authenticated: false,
            repo: null,
            user: null,
            bridgeUrl: 'http://127.0.0.1:31556'
        },
        tierProgress: {},
        completedLevels: [],
        currentObjectives: [],
    gitState: {
        branches: ['main'],
        currentBranch: 'main',
        commits: [],
        staged: [],
        remotes: {
            origin: {
                name: 'origin',
                fetchUrl: 'https://example.com/git-wizard-origin.git',
                pushUrl: 'https://example.com/git-wizard-origin.git',
                branches: { main: null }
            },
            upstream: {
                name: 'upstream',
                fetchUrl: 'https://example.com/git-wizard-upstream.git',
                pushUrl: 'https://example.com/git-wizard-upstream.git',
                branches: {}
            }
        },
        remoteRefs: { 'refs/remotes/origin/main': null },
        tracking: { main: { remote: 'origin', merge: 'refs/heads/main' } },
        pullRequests: []
    },
    commandHistory: [],
    nanoFile: null,
    introSeen: false,
        levelReadyToProceed: false
    };
}

window.gameState = createDefaultGameState();

function buildGlobalGitConfigText(config) {
    const cfg = config || {};
    const keys = Object.keys(cfg).sort();
    if (!keys.length) {
        return '# Git Wizard Academy global config\n# Add entries with git config --global <key> <value>\n';
    }

    const grouped = {};
    keys.forEach(function(key) {
        const parts = key.split('.');
        const section = parts[0] || 'core';
        const name = parts.slice(1).join('.') || key;
        grouped[section] = grouped[section] || [];
        grouped[section].push({ name: name, value: cfg[key] });
    });

    return Object.keys(grouped).sort().map(function(section) {
        const lines = ['[' + section + ']'];
        grouped[section].sort(function(a, b) {
            return a.name.localeCompare(b.name);
        }).forEach(function(entry) {
            lines.push('\t' + entry.name + ' = ' + entry.value);
        });
        return lines.join('\n');
    }).join('\n\n') + '\n';
}

const gameEngine = {
    getRepoSetupMessage: function(levelIndex) {
        const lesson = (window.lessons && window.lessons[levelIndex]) ? window.lessons[levelIndex] : null;
        if (!lesson) return '';
        const setup = lesson.repoSetup || {};
        if (setup.summary) return setup.summary;
        if (setup.mode === 'init-required') return 'This level starts without a repository. Run `git init` yourself.';
        return 'This level starts with a prepared repository. You do not need to run `git init` unless the lesson says so.';
    },

    updateObjectivesPanelState: function() {
        const proceedBtn = document.getElementById('proceedLevelBtn');
        const repoNote = document.getElementById('repoSetupNote');
        const tierNote = document.getElementById('tierNote');
        const lesson = (window.lessons && window.lessons[window.gameState.currentLevel]) ? window.lessons[window.gameState.currentLevel] : null;
        if (repoNote) repoNote.textContent = this.getRepoSetupMessage(window.gameState.currentLevel);
        if (tierNote) {
            tierNote.textContent = lesson
                ? 'Tier: ' + lesson.tier + (lesson.tierIsCapstone ? ' • Tier capstone' : ' • Chapter ' + (lesson.tierLevelIndex + 1))
                : '';
        }
        if (proceedBtn) {
            proceedBtn.style.display = window.gameState.levelReadyToProceed ? 'inline-flex' : 'none';
        }
    },

    getLiveGitHubState: function() {
        window.gameState.liveGitHub = window.gameState.liveGitHub || {
            connected: false,
            authenticated: false,
            repo: null,
            user: null,
            bridgeUrl: 'http://127.0.0.1:31556'
        };
        return window.gameState.liveGitHub;
    },

    isLiveGitHubConnected: function() {
        const state = this.getLiveGitHubState();
        return !!(state && state.connected && state.authenticated);
    },

    isSimulatedRemoteMode: function() {
        return !this.isLiveGitHubConnected();
    },

    getSimulatedPullRequests: function() {
        const gitState = window.gameState.gitState || {};
        gitState.pullRequests = Array.isArray(gitState.pullRequests) ? gitState.pullRequests : [];
        return gitState.pullRequests;
    },

    evaluateSimulatedCi: function(branchName) {
        const branch = branchName || (window.gameState.gitState && window.gameState.gitState.currentBranch) || 'main';
        const headSha = window.gameState.gitState && window.gameState.gitState.refs ? window.gameState.gitState.refs[branch] : null;
        const commit = headSha && window.gameState.gitState && window.gameState.gitState.commitBySha
            ? window.gameState.gitState.commitBySha[headSha]
            : null;
        const snapshot = commit && commit.snapshot ? commit.snapshot : {};
        const files = Object.keys(snapshot || {});
        const failingFiles = files.filter(function(name) {
            const content = String(snapshot[name] || '');
            return /CI_FAIL|TODO|FIXME|console\.log\(/i.test(content);
        });
        return {
            passed: failingFiles.length === 0,
            failingFiles: failingFiles
        };
    },

    getLiveGitHubPayload: function() {
        const state = this.getLiveGitHubState();
        return {
            mode: 'live',
            bridgeUrl: state.bridgeUrl || 'http://127.0.0.1:31556',
            repoName: state.repo && state.repo.name ? state.repo.name : '',
            owner: state.repo && state.repo.owner ? state.repo.owner : '',
            gameState: window.gameState,
            config: window.configStore && window.configStore.load ? window.configStore.load() : {}
        };
    },

    updateLiveGitHubStatus: function(message) {
        const status = document.getElementById('liveGitHubStatus');
        if (status) status.textContent = message;
    },

    renderLiveGitHubState: function() {
        const state = this.getLiveGitHubState();
        const btn = document.getElementById('liveGitHubBtn');
        const summary = state.connected && state.repo
            ? '☁ Live GitHub: ' + (state.repo.owner || '') + '/' + (state.repo.name || '')
            : '☁ Simulated Remote';
        if (btn) btn.textContent = summary;
    },

    getLessonTierInfo: function(levelIndex) {
        const lesson = (window.lessons && window.lessons[levelIndex]) ? window.lessons[levelIndex] : null;
        return lesson ? {
            key: lesson.tierKey,
            name: lesson.tier,
            badge: lesson.tierBadge,
            isCapstone: !!lesson.tierIsCapstone,
            indexWithinTier: lesson.tierLevelIndex
        } : null;
    },

    getCertificateName: function() {
        const lesson = (window.lessons && window.lessons[window.gameState.currentLevel]) ? window.lessons[window.gameState.currentLevel] : null;
        return lesson ? lesson.tier : 'Git Wizard Academy';
    },

    getUserDisplayName: function() {
        const cfg = window.configStore && window.configStore.load ? window.configStore.load() : {};
        return cfg['user.name'] || (window.gameState.gitState && window.gameState.gitState.config && window.gameState.gitState.config.global && window.gameState.gitState.config.global['user.name']) || 'Anonymous Apprentice';
    },

    getUserEmail: function() {
        const cfg = window.configStore && window.configStore.load ? window.configStore.load() : {};
        return cfg['user.email'] || (window.gameState.gitState && window.gameState.gitState.config && window.gameState.gitState.config.global && window.gameState.gitState.config.global['user.email']) || 'unknown@example.com';
    },

    buildCertificateRecord: function(levelIndex) {
        const lesson = (window.lessons && window.lessons[levelIndex]) ? window.lessons[levelIndex] : null;
        if (!lesson) return null;
        return {
            tierKey: lesson.tierKey,
            tierName: lesson.tier,
            badge: lesson.tierBadge,
            levelIndex,
            levelTitle: lesson.title,
            achievedAt: new Date().toISOString(),
            name: this.getUserDisplayName(),
            email: this.getUserEmail()
        };
    },

    hasCertificateForTier: function(tierKey) {
        const list = Array.isArray(window.gameState.certificates) ? window.gameState.certificates : [];
        return list.some(function(c) { return c.tierKey === tierKey; });
    },

    renderCertificateButton: function() {
        const btn = document.getElementById('downloadCertificateBtn');
        const lesson = (window.lessons && window.lessons[window.gameState.currentLevel]) ? window.lessons[window.gameState.currentLevel] : null;
        if (!btn) return;
        const cfg = window.configStore && window.configStore.load ? window.configStore.load() : {};
        const hasIdentity = !!(cfg['user.name'] && cfg['user.email']);
        const canIssue = !!(lesson && lesson.tierIsCapstone && hasIdentity && window.gameState.levelReadyToProceed);
        btn.style.display = canIssue ? 'inline-flex' : 'none';
        btn.textContent = lesson ? ('Download ' + lesson.tier + ' Certificate') : 'Download Certificate';
    },

    issueCertificate: function(levelIndex) {
        const record = this.buildCertificateRecord(levelIndex);
        if (!record) return false;

        window.gameState.certificates = Array.isArray(window.gameState.certificates) ? window.gameState.certificates : [];
        if (!this.hasCertificateForTier(record.tierKey)) {
            window.gameState.certificates.push(record);
        }

        if (window.certificateStore && window.certificateStore.save) {
            window.certificateStore.save(window.gameState.certificates);
        }

        const esc = (window.ui && window.ui.escapeHtml)
            ? window.ui.escapeHtml.bind(window.ui)
            : function(value) {
                return String(value || '')
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            };

        const html = [
            '<!doctype html><html><head><meta charset="utf-8"><title>' + record.tierName + ' Certificate</title>',
            '<style>body{font-family:Georgia,serif;background:#08131f;color:#f5f7fb;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:32px;}',
            '.card{width:min(760px,92vw);background:linear-gradient(145deg,#102338,#0b1421);border:1px solid rgba(255,255,255,.12);border-radius:24px;padding:48px;box-shadow:0 30px 80px rgba(0,0,0,.45);text-align:center;}',
            '.badge{font-size:64px;margin-bottom:12px}.tier{color:#83d0ff;letter-spacing:.18em;text-transform:uppercase;font-size:.8rem}',
            '.name{font-size:2.8rem;margin:16px 0 0}.title{font-size:1.4rem;color:#d6e5f3;margin:12px 0 24px}.meta{margin-top:28px;color:#a9c0d6;font-size:.95rem;line-height:1.7}',
            '</style></head><body><div class="card"><div class="badge">' + esc(record.badge) + '</div><div class="tier">Git Wizard Academy</div><div class="name">' + esc(record.name) + '</div><div class="title">Certified ' + esc(record.tierName) + '</div><div class="meta">Level: ' + (record.levelIndex + 1) + ' · ' + esc(record.levelTitle) + '<br>Name: ' + esc(record.name) + ' &lt;' + esc(record.email) + '&gt;<br>Issued: ' + esc(new Date(record.achievedAt).toLocaleString()) + '</div></div></body></html>'
        ].join('');
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = record.tierKey + '-certificate.html';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
        return true;
    },

    openExportModal: function() {
        const overlay = document.getElementById('exportRepoOverlay');
        const status = document.getElementById('exportRepoStatus');
        if (status) {
            status.textContent = 'Select an export mode to reconstruct the repository. Run `node export-bridge.js` in a local terminal to enable the real Git CLI bridge at http://127.0.0.1:31555. If the bridge is not running, the browser falls back to a downloadable export package.';
        }
        if (overlay) overlay.classList.add('show');
    },

    closeExportModal: function() {
        const overlay = document.getElementById('exportRepoOverlay');
        if (overlay) overlay.classList.remove('show');
    },

    openLiveGitHubModal: async function() {
        const overlay = document.getElementById('liveGitHubOverlay');
        const status = document.getElementById('liveGitHubStatus');
        const state = this.getLiveGitHubState();
        if (overlay) overlay.classList.add('show');
        if (status) {
            status.textContent = state.connected && state.repo
                ? 'Connected to ' + (state.repo.owner || '') + '/' + (state.repo.name || '') + '. You can now create a repo, install CI, push branches, and manage PRs.'
                : 'No bridge connection detected. Simulated Remote Mode is active: push a branch, open a PR, run CI/review, then merge locally.';
        }
        const token = document.getElementById('liveGitHubToken');
        const repoName = document.getElementById('liveGitHubRepoName');
        const owner = document.getElementById('liveGitHubOwner');
        const description = document.getElementById('liveGitHubDescription');
        const branch = document.getElementById('liveGitHubBranch');
        const priv = document.getElementById('liveGitHubPrivate');
        const reuse = document.getElementById('liveGitHubReuse');
        const workflow = document.getElementById('liveGitHubInstallWorkflow');
        if (repoName && !repoName.value) repoName.value = state.repo && state.repo.name ? state.repo.name : 'git-wizard-academy-live';
        if (branch && !branch.value) branch.value = state.repo && state.repo.default_branch ? state.repo.default_branch : 'main';
        if (description && !description.value) description.value = 'Git Wizard Academy live training repo';
        if (priv) priv.checked = !!(state.repo && state.repo.private);
        if (reuse) reuse.checked = true;
        if (workflow) workflow.checked = true;
        if (owner && !owner.value && state.user && state.user.login) owner.value = state.user.login;

        if (window.liveGitHubBridge && typeof window.liveGitHubBridge.session === 'function') {
            try {
                const session = await window.liveGitHubBridge.session();
                if (session && session.authenticated) {
                    this.syncLiveGitHubState({
                        connected: true,
                        authenticated: true,
                        user: session.user || state.user || null,
                        repo: session.repo || state.repo || null
                    });
                    this.updateLiveGitHubStatus('Bridge connected. Session is ready for real GitHub workflows.');
                }
            } catch (err) {
                this.updateLiveGitHubStatus('Bridge not reachable at ' + (state.bridgeUrl || 'http://127.0.0.1:31556') + '. Run `node live-github.js` in a local terminal to enable Live GitHub Mode.');
            }
        }
        this.renderLiveGitHubState();
    },

    closeLiveGitHubModal: function() {
        const overlay = document.getElementById('liveGitHubOverlay');
        if (overlay) overlay.classList.remove('show');
    },

    syncLiveGitHubState: function(patch) {
        const current = this.getLiveGitHubState();
        window.gameState.liveGitHub = Object.assign({}, current, patch || {});
        if (window.liveGitHubStore && window.liveGitHubStore.save) {
            window.liveGitHubStore.save(window.gameState.liveGitHub);
        }
        this.renderLiveGitHubState();
        this.saveGame();
    },

    connectLiveGitHub: async function() {
        if (!window.liveGitHubBridge || typeof window.liveGitHubBridge.connect !== 'function') {
            throw new Error('Live GitHub bridge client is unavailable.');
        }
        const token = document.getElementById('liveGitHubToken');
        const payload = {
            token: token ? token.value.trim() : '',
            apiBase: 'https://api.github.com',
            webBase: 'https://github.com'
        };
        if (!payload.token) throw new Error('Paste a GitHub token first.');
        const result = await window.liveGitHubBridge.connect(payload);
        this.syncLiveGitHubState({
            connected: true,
            authenticated: true,
            user: result.session && result.session.user ? result.session.user : null,
            repo: result.session && result.session.repo ? result.session.repo : null
        });
        if (token) token.value = '';
        this.updateLiveGitHubStatus('Connected as ' + ((result.session && result.session.user && result.session.user.login) || 'GitHub user') + '. You can now create a real repository and push live branches.');
        return result;
    },

    logoutLiveGitHub: async function() {
        if (window.liveGitHubBridge && typeof window.liveGitHubBridge.logout === 'function') {
            try {
                await window.liveGitHubBridge.logout();
            } catch (err) {
                // ignore bridge errors during logout
            }
        }
        this.syncLiveGitHubState({
            connected: false,
            authenticated: false,
            repo: null,
            user: null
        });
        if (window.liveGitHubStore && window.liveGitHubStore.clear) {
            window.liveGitHubStore.clear();
        }
        this.updateLiveGitHubStatus('Live GitHub session cleared.');
    },

    createLiveGitHubRepo: async function() {
        if (!this.isLiveGitHubConnected()) throw new Error('Connect GitHub first.');
        const payload = {
            repoName: (document.getElementById('liveGitHubRepoName') || {}).value || '',
            owner: (document.getElementById('liveGitHubOwner') || {}).value || '',
            description: (document.getElementById('liveGitHubDescription') || {}).value || '',
            private: !!((document.getElementById('liveGitHubPrivate') || {}).checked),
            reuseExisting: !!((document.getElementById('liveGitHubReuse') || {}).checked),
            gameState: window.gameState,
            config: window.configStore && window.configStore.load ? window.configStore.load() : {}
        };
        const result = await window.liveGitHubBridge.createRepo(payload);
        this.syncLiveGitHubState({
            connected: true,
            authenticated: true,
            repo: result.repo
        });
        window.gameState.flags = window.gameState.flags || {};
        window.gameState.flags.remoteOriginConfigured = true;
        this.updateLiveGitHubStatus('Repository ready: ' + result.repo.owner + '/' + result.repo.name + '.');
        return result;
    },

    installLiveGitHubWorkflow: async function() {
        if (!this.isLiveGitHubConnected()) throw new Error('Connect GitHub first.');
        const payload = {
            gameState: window.gameState,
            config: window.configStore && window.configStore.load ? window.configStore.load() : {}
        };
        const result = await window.liveGitHubBridge.installWorkflow(payload);
        this.updateLiveGitHubStatus('Installed GitHub Actions workflow at ' + result.result.workflowPath + '.');
        return result;
    },

    pushLiveGitHubRepo: async function() {
        if (!this.isLiveGitHubConnected()) {
            const branch = (document.getElementById('liveGitHubBranch') || {}).value || ((window.gameState.gitState || {}).currentBranch || 'main');
            const result = await window.gitCommands.push(['-u', 'origin', branch]);
            this.updateLiveGitHubStatus(result.success
                ? 'Simulated push complete for ' + branch + '. Next: create a simulated PR.'
                : ('Simulated push failed: ' + result.message));
            return { simulated: true, result };
        }
        const payload = {
            gameState: window.gameState,
            config: window.configStore && window.configStore.load ? window.configStore.load() : {},
            repoName: this.getLiveGitHubState().repo && this.getLiveGitHubState().repo.name ? this.getLiveGitHubState().repo.name : '',
            owner: this.getLiveGitHubState().repo && this.getLiveGitHubState().repo.owner ? this.getLiveGitHubState().repo.owner : '',
            branchName: (document.getElementById('liveGitHubBranch') || {}).value || '',
            includeWorkflow: !!((document.getElementById('liveGitHubInstallWorkflow') || {}).checked)
        };
        const result = await window.liveGitHubBridge.push(payload);
        window.gameState.flags = window.gameState.flags || {};
        window.gameState.flags.ranPush = true;
        this.updateLiveGitHubStatus('Pushed branches and tags to ' + (result.result && result.result.repo ? (result.result.repo.owner + '/' + result.result.repo.name) : 'GitHub') + '.');
        if (payload.includeWorkflow) {
            try {
                await window.liveGitHubBridge.installWorkflow(payload);
                this.updateLiveGitHubStatus('Pushed to GitHub and installed the CI workflow.');
            } catch (err) {
                this.updateLiveGitHubStatus('Push succeeded, but workflow install failed: ' + err.message);
            }
        }
        return result;
    },

    fetchLiveGitHubRepo: async function() {
        if (!this.isLiveGitHubConnected()) {
            const result = await window.gitCommands.fetch(['origin']);
            this.updateLiveGitHubStatus('Fetched simulated remote refs.');
            return { simulated: true, result };
        }
        const payload = {
            gameState: window.gameState,
            config: window.configStore && window.configStore.load ? window.configStore.load() : {}
        };
        const result = await window.liveGitHubBridge.fetch(payload);
        window.gameState.flags = window.gameState.flags || {};
        window.gameState.flags.ranFetch = true;
        this.updateLiveGitHubStatus('Fetched remote refs from GitHub.');
        return result;
    },

    pullLiveGitHubRepo: async function() {
        if (!this.isLiveGitHubConnected()) {
            const result = await window.gitCommands.pull([]);
            this.updateLiveGitHubStatus(result.success ? 'Pulled from simulated remote.' : 'Simulated pull failed: ' + result.message);
            return { simulated: true, result };
        }
        const payload = {
            gameState: window.gameState,
            config: window.configStore && window.configStore.load ? window.configStore.load() : {}
        };
        const result = await window.liveGitHubBridge.pull(payload);
        window.gameState.flags = window.gameState.flags || {};
        window.gameState.flags.ranPull = true;
        this.updateLiveGitHubStatus('Pulled from GitHub. See terminal output for the real git pull result.');
        return result;
    },

    createLiveGitHubPr: async function() {
        if (!this.isLiveGitHubConnected()) {
            const headBranch = (document.getElementById('liveGitHubBranch') || {}).value || ((window.gameState.gitState || {}).currentBranch || 'main');
            const prs = this.getSimulatedPullRequests();
            const prNumber = prs.length + 1;
            const pr = {
                number: prNumber,
                head: { ref: headBranch, sha: window.gameState.gitState.refs[headBranch] || null },
                base: { ref: 'main', sha: window.gameState.gitState.refs.main || null },
                title: 'Simulated lesson PR',
                state: 'open',
                checks: { status: 'pending', passed: false, failingFiles: [] },
                review: { approved: false, notes: [] },
                createdAt: new Date().toISOString()
            };
            prs.push(pr);
            this.updateLiveGitHubStatus('Created simulated PR #' + pr.number + ' from ' + headBranch + ' → main. Run Review/CI next.');
            this.syncLiveGitHubState({ lastPr: pr });
            return { simulated: true, pr };
        }
        const payload = {
            gameState: window.gameState,
            config: window.configStore && window.configStore.load ? window.configStore.load() : {},
            headBranch: (document.getElementById('liveGitHubBranch') || {}).value || '',
            baseBranch: 'main',
            prTitle: 'Git Wizard Academy lesson submission',
            prBody: 'Created from Live GitHub Mode.'
        };
        const result = await window.liveGitHubBridge.createPullRequest(payload);
        window.gameState.flags = window.gameState.flags || {};
        window.gameState.flags.createdPullRequest = true;
        this.syncLiveGitHubState({
            lastPr: result.pr
        });
        this.updateLiveGitHubStatus('Created PR #' + result.pr.number + '. Install CI, wait for checks, and merge when green.');
        return result;
    },

    runLiveGitHubReviewBot: async function() {
        if (!this.isLiveGitHubConnected()) {
            const state = this.getLiveGitHubState();
            if (!state.lastPr || !state.lastPr.number) throw new Error('Create a pull request first.');
            const prs = this.getSimulatedPullRequests();
            const pr = prs.find(function(item) { return item.number === state.lastPr.number; });
            if (!pr) throw new Error('Simulated PR not found.');
            const ci = this.evaluateSimulatedCi(pr.head.ref);
            pr.checks = {
                status: ci.passed ? 'success' : 'failed',
                passed: ci.passed,
                failingFiles: ci.failingFiles
            };
            pr.review = {
                approved: ci.passed,
                notes: ci.passed ? ['All simulated checks passed.'] : ['CI failed for: ' + ci.failingFiles.join(', ')]
            };
            if (!ci.passed) {
                this.updateLiveGitHubStatus('Simulated review blocked PR #' + pr.number + ': CI failed for ' + ci.failingFiles.join(', ') + '.');
                return { simulated: true, result: { problems: ci.failingFiles, merged: false } };
            }
            const mergeResult = await this.mergeLiveGitHubPr();
            return { simulated: true, result: { problems: [], merged: !!mergeResult } };
        }
        const state = this.getLiveGitHubState();
        if (!state.lastPr || !state.lastPr.number) throw new Error('Create a pull request first.');
        const result = await window.liveGitHubBridge.reviewBot({
            gameState: window.gameState,
            config: window.configStore && window.configStore.load ? window.configStore.load() : {},
            pullNumber: state.lastPr.number
        });
        window.gameState.flags = window.gameState.flags || {};
        window.gameState.flags.reviewedPullRequest = true;
        window.gameState.flags.ciChecksPassed = !!(result && result.result && Array.isArray(result.result.problems) && result.result.problems.length === 0);
        this.updateLiveGitHubStatus(result.result && result.result.problems && result.result.problems.length
            ? 'Review bot left feedback on PR #' + state.lastPr.number + '.'
            : 'Review bot found no blocking issues.');
        return result;
    },

    mergeLiveGitHubPr: async function() {
        if (!this.isLiveGitHubConnected()) {
            const state = this.getLiveGitHubState();
            if (!state.lastPr || !state.lastPr.number) throw new Error('Create a pull request first.');
            const prs = this.getSimulatedPullRequests();
            const pr = prs.find(function(item) { return item.number === state.lastPr.number; });
            if (!pr) throw new Error('Simulated PR not found.');
            if (!pr.checks || !pr.checks.passed) throw new Error('Cannot merge simulated PR #' + pr.number + ': checks are not green.');
            const base = pr.base && pr.base.ref ? pr.base.ref : 'main';
            const source = pr.head && pr.head.ref ? pr.head.ref : '';
            if (!source || !window.gameState.gitState.refs[source]) throw new Error('Source branch is missing.');
            window.gameState.gitState.refs[base] = window.gameState.gitState.refs[source];
            pr.state = 'merged';
            pr.mergedAt = new Date().toISOString();
            this.updateLiveGitHubStatus('Merged simulated PR #' + pr.number + ' into ' + base + '.');
            return { simulated: true, pr };
        }
        const state = this.getLiveGitHubState();
        if (!state.lastPr || !state.lastPr.number) throw new Error('Create a pull request first.');
        const result = await window.liveGitHubBridge.mergePullRequest({
            gameState: window.gameState,
            config: window.configStore && window.configStore.load ? window.configStore.load() : {},
            pullNumber: state.lastPr.number,
            mergeMethod: 'merge'
        });
        window.gameState.flags = window.gameState.flags || {};
        window.gameState.flags.ciChecksPassed = true;
        window.gameState.flags.mergedWhenChecksPass = true;
        this.updateLiveGitHubStatus('Merged PR #' + state.lastPr.number + ' into the main branch.');
        return result;
    },

    buildExportPayload: function(mode) {
        return {
            mode: mode || 'clean',
            generatedAt: new Date().toISOString(),
            currentLevel: window.gameState.currentLevel,
            lessonTitle: window.lessons && window.lessons[window.gameState.currentLevel] ? window.lessons[window.gameState.currentLevel].title : '',
            gameState: {
                currentLevel: window.gameState.currentLevel,
                playerLevel: window.gameState.playerLevel,
                completedLevels: window.gameState.completedLevels,
                commandsUsed: window.gameState.commandsUsed,
                commits: window.gameState.commits,
                branches: window.gameState.branches,
                merges: window.gameState.merges,
                conflicts: window.gameState.conflicts,
                certificates: window.gameState.certificates,
                liveGitHub: window.gameState.liveGitHub,
                tierProgress: window.gameState.tierProgress,
                flags: window.gameState.flags,
                gitState: window.gameState.gitState
            },
            fileSystem: window.fileSystemModule && window.fileSystemModule.export ? window.fileSystemModule.export() : null,
            config: window.configStore && window.configStore.load ? window.configStore.load() : {}
        };
    },

    downloadExportPackage: function(mode) {
        const payload = this.buildExportPayload(mode);
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'git-wizard-export-' + (mode || 'clean') + '.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    },

    exportRepo: async function(mode) {
        const status = document.getElementById('exportRepoStatus');
        const payload = this.buildExportPayload(mode);

        if (window.exportRepoBridge && typeof window.exportRepoBridge.exportRepo === 'function') {
            try {
                if (status) status.textContent = 'Exporting repository with real Git CLI...';
                const result = await window.exportRepoBridge.exportRepo(payload);
                if (status) {
                    status.textContent = result && result.archivePath
                        ? 'Export complete. Archive created at ' + result.archivePath
                        : 'Export complete.';
                }
                return result;
            } catch (err) {
                if (status) status.textContent = 'Export failed: ' + (err && err.message ? err.message : String(err));
                throw err;
            }
        }

        this.downloadExportPackage(mode);
        if (status) {
            status.textContent = 'This browser build cannot invoke child_process directly. The simulated repo state package was downloaded instead. Use the Node export module to turn it into a real Git repository.';
        }
        return { downloaded: true, payload };
    },

    // Initialize game
    init: function() {
        // Ensure FS is loaded (persisted separately)
        if (window.fileSystemModule && window.fileSystemModule.load) {
            window.fileSystemModule.load();
        }

        // Load saved lesson/player state
        const loadedState = window.lessonStore && window.lessonStore.load
            ? window.lessonStore.load()
            : (function() {
                const saved = localStorage.getItem('gwa_gameState');
                if (!saved) return null;
                try { return JSON.parse(saved); } catch (e) { return null; }
              })();
        if (loadedState) {
            Object.assign(window.gameState, loadedState);
        }

        // Load repository + fs snapshot if available
        const repoSnapshot = window.repoStore && window.repoStore.load ? window.repoStore.load() : null;
        if (repoSnapshot && repoSnapshot.gitState) {
            window.gameState.gitState = repoSnapshot.gitState;
        }
        if (repoSnapshot && repoSnapshot.fsSnapshot && window.fileSystemModule && window.fileSystemModule.import) {
            window.fileSystemModule.import(repoSnapshot.fsSnapshot);
        }
        const savedCertificates = window.certificateStore && window.certificateStore.load ? window.certificateStore.load() : null;
        if (Array.isArray(savedCertificates)) {
            window.gameState.certificates = savedCertificates.slice();
        }
        const savedLiveGitHub = window.liveGitHubStore && window.liveGitHubStore.load ? window.liveGitHubStore.load() : null;
        if (savedLiveGitHub && typeof savedLiveGitHub === 'object') {
            window.gameState.liveGitHub = Object.assign({
                connected: false,
                authenticated: false,
                repo: null,
                user: null,
                bridgeUrl: 'http://127.0.0.1:31556'
            }, savedLiveGitHub);
        }

        // Back-compat defaults
        if (!Number.isFinite(window.gameState.playerLevel) || window.gameState.playerLevel < 1) window.gameState.playerLevel = 1;
        if (!Number.isFinite(window.gameState.totalXP)) window.gameState.totalXP = 0;
        if (!Number.isFinite(window.gameState.xpForCurrentLevel)) window.gameState.xpForCurrentLevel = 0;
        if (!Number.isFinite(window.gameState.xpRequiredForLevel) || window.gameState.xpRequiredForLevel < 50) window.gameState.xpRequiredForLevel = 300;
        if (!Array.isArray(window.gameState.completedLevels)) window.gameState.completedLevels = [];
        if (!Array.isArray(window.gameState.achievements)) window.gameState.achievements = [];
        if (!window.gameState.tierProgress || typeof window.gameState.tierProgress !== 'object') window.gameState.tierProgress = {};
        if (!Array.isArray(window.gameState.commandHistory)) window.gameState.commandHistory = [];
        if (!window.gameState.flags) window.gameState.flags = {};
        if (typeof window.gameState.introSeen !== 'boolean') window.gameState.introSeen = false;
        if (!window.gameState.gitState || typeof window.gameState.gitState !== 'object') window.gameState.gitState = {};
        if (!window.gameState.gitState.remotes) window.gameState.gitState.remotes = {};
        if (!window.gameState.gitState.remotes.origin) {
            window.gameState.gitState.remotes.origin = {
                name: 'origin',
                fetchUrl: 'https://example.com/git-wizard-origin.git',
                pushUrl: 'https://example.com/git-wizard-origin.git',
                branches: {}
            };
        }
        if (!window.gameState.gitState.remotes.upstream) {
            window.gameState.gitState.remotes.upstream = {
                name: 'upstream',
                fetchUrl: 'https://example.com/git-wizard-upstream.git',
                pushUrl: 'https://example.com/git-wizard-upstream.git',
                branches: {}
            };
        }
        if (!window.gameState.gitState.remoteRefs) window.gameState.gitState.remoteRefs = {};
        if (!window.gameState.gitState.tracking) window.gameState.gitState.tracking = {};
        if (!Array.isArray(window.gameState.gitState.pullRequests)) window.gameState.gitState.pullRequests = [];

        this.syncGlobalEnvironmentConfig();

        // Daily streak (very simple: keep streak if played yesterday; reset if gap)
        const today = new Date();
        const todayKey = today.toISOString().slice(0,10);
        const last = window.gameState.lastPlayedDate;
        if (last) {
            const lastDate = new Date(last + "T00:00:00");
            const diffDays = Math.floor((today - lastDate) / (1000*60*60*24));
            if (diffDays === 1) window.gameState.streak = (window.gameState.streak || 0) + 1;
            else if (diffDays > 1) window.gameState.streak = 0;
        } else {
            window.gameState.streak = window.gameState.streak || 0;
        }
        window.gameState.lastPlayedDate = todayKey;

        // Render UI
        const levelIndex = Number.isFinite(window.gameState.currentLevel) ? window.gameState.currentLevel : 0;
        const lesson = (window.lessons && window.lessons[levelIndex]) ? window.lessons[levelIndex] : null;
        const hasRestorableObjectives =
            !!lesson &&
            Array.isArray(window.gameState.currentObjectives) &&
            window.gameState.currentObjectives.length === lesson.objectives.length;

        if (hasRestorableObjectives) {
            // Resume exactly where the learner left off (do not reset FS/git state).
            this.renderLessonContent(levelIndex);
            this.renderObjectives();
            this.updateObjectivesPanelState();
            this.renderLevelNav();
            this.updateStats();
            this.renderAchievements();
            this.renderCertificateButton();
            this.renderLiveGitHubState();
            this.saveGame();
        } else {
            // Fresh load/new learner path.
            this.renderLevelNav();
            this.renderAchievements();
            this.loadLevel(levelIndex);
            this.updateStats();
            this.renderAchievements();
            this.renderLiveGitHubState();
            this.saveGame();
        }
    },

    renderLessonContent: function(levelIndex) {
        const lesson = (window.lessons && window.lessons[levelIndex]) ? window.lessons[levelIndex] : null;
        const lessonContent = document.getElementById('lessonContent');
        if (!lesson || !lessonContent) return;

        let storyHtml = '';
        if (window.storyArc && window.storyArc.renderStoryPanel) {
            storyHtml = window.storyArc.renderStoryPanel(levelIndex);
        }
        const contentWithoutObjectives = String(lesson.content || '')
            .replace(/<div class="objective-box">[\s\S]*?<\/div>/g, '')
            .replace(/\s+$/, '');
        lessonContent.innerHTML = (storyHtml || '') + contentWithoutObjectives;
    },

    syncGlobalEnvironmentConfig: function() {
        const fs = window.fileSystemModule;
        if (!fs) return;
        const cfg = window.configStore && window.configStore.load ? window.configStore.load() : {};
        fs.writeFile('.gitconfig', buildGlobalGitConfigText(cfg));
    },
    
    // Add XP and check for level up
    addXP: function(amount) {
        window.gameState.totalXP += amount;
        window.gameState.xpForCurrentLevel += amount;
        
        // Level up check
        while (window.gameState.xpForCurrentLevel >= window.gameState.xpRequiredForLevel) {
            const xpThreshold = window.gameState.xpRequiredForLevel;
            window.gameState.xpForCurrentLevel -= xpThreshold;
            window.gameState.playerLevel += 1;
            // scale requirement gently
            window.gameState.xpRequiredForLevel = Math.round(window.gameState.xpRequiredForLevel * 1.12 + 25);
            this.levelUp(xpThreshold);
        }
        
        this.updateStats();
        this.saveGame();
    },
    
    // Trigger level up
    levelUp: function(xpThreshold) {
        const modal = document.getElementById('levelCompleteModal');
        document.getElementById('modalTitle').textContent = '🎉 Level Up!';
        document.getElementById('modalSubtitle').textContent = 'You reached Rank ' + window.gameState.playerLevel + '!';
        document.getElementById('modalLore').textContent = '';
        const xpValue = Number.isFinite(xpThreshold) ? xpThreshold : window.gameState.xpRequiredForLevel;
        document.getElementById('modalXP').textContent = '+' + xpValue + ' XP';
        if (modal) modal.classList.add('show');
    },
    
    // Update all stats display
    updateStats: function() {
        const levelEl = document.getElementById('currentLevel');
        const titleEl = document.getElementById('currentTitle');
        const xpEl = document.getElementById('currentXP');
        const xpBar = document.getElementById('xpBar');
        const commitsEl = document.getElementById('commitsCount');
        const branchesEl = document.getElementById('branchesCount');
        const mergesEl = document.getElementById('mergesCount');
        const conflictsEl = document.getElementById('conflictsCount');
        const commandsEl = document.getElementById('commandsUsed');
        const streakEl = document.getElementById('streakCount');

        const rankTitles = [
            "Novice Initiate",
            "Beginner Apprentice",
            "Intermediate Adept",
            "Super Sorcerer",
            "Grand Wizard"
        ];
        const titleForLevel = (lvl) => {
            if (lvl <= 1) return rankTitles[0];
            if (lvl <= 5) return rankTitles[1];
            if (lvl <= 10) return rankTitles[2];
            if (lvl <= 20) return rankTitles[3];
            return rankTitles[4];
        };

        
        if (levelEl) levelEl.textContent = window.gameState.playerLevel;
        if (titleEl) titleEl.textContent = titleForLevel(window.gameState.playerLevel);
        if (xpEl) xpEl.textContent = window.gameState.totalXP;
        
        const xpPercent = (window.gameState.xpForCurrentLevel / window.gameState.xpRequiredForLevel) * 100;
        if (xpBar) xpBar.style.width = Math.min(xpPercent, 100) + '%';
        
        if (commitsEl) commitsEl.textContent = window.gameState.commits;
        if (branchesEl) branchesEl.textContent = window.gameState.branches;
        if (mergesEl) mergesEl.textContent = window.gameState.merges;
        if (conflictsEl) conflictsEl.textContent = window.gameState.conflicts;
        if (commandsEl) commandsEl.textContent = window.gameState.commandsUsed;
        if (streakEl) streakEl.textContent = window.gameState.streak || 0;
    },
    
// js/game-engine.js - Update the loadLevel function
// Find the loadLevel function and replace the git state reset with:

    loadLevel: function(levelIndex) {
        window.gameState.currentLevel = levelIndex;
        const lesson = (window.lessons && window.lessons[levelIndex]) ? window.lessons[levelIndex] : null;
        if (!lesson) return;

        if (this._bossIntroTimer) {
            clearTimeout(this._bossIntroTimer);
            this._bossIntroTimer = null;
        }
        const bossOverlay = document.getElementById('bossOverlay');
        if (bossOverlay) bossOverlay.classList.remove('show', 'minimized');

        // Level switches should not leak completion flags from previous levels/sessions.
        window.gameState.flags = {};
        
        // Reset git state for level
        window.gameState.gitState = {
            branches: lesson.initialGitState.branches ? [...lesson.initialGitState.branches] : ['main'],
            currentBranch: lesson.initialGitState.currentBranch || 'main',
            commits: lesson.initialGitState.commits ? [...lesson.initialGitState.commits] : [],
            staged: [],
            trackedFiles: {},  // Track committed files
            remotes: {
                origin: {
                    name: 'origin',
                    fetchUrl: 'https://example.com/git-wizard-origin.git',
                    pushUrl: 'https://example.com/git-wizard-origin.git',
                    branches: {}
                },
                upstream: {
                    name: 'upstream',
                    fetchUrl: 'https://example.com/git-wizard-upstream.git',
                    pushUrl: 'https://example.com/git-wizard-upstream.git',
                    branches: {}
                }
            },
            remoteRefs: {},
            tracking: {},
            pullRequests: []
        };


        // Seed file system for this level (so lessons with pre-made commits actually have files)
        if (window.fileSystemModule) {
            // New level = clean sandbox
            window.fileSystemModule.reset();
            this.syncGlobalEnvironmentConfig();

            const fs = window.fileSystemModule;
            const seedFiles = (lesson.initialWorkspaceFiles && typeof lesson.initialWorkspaceFiles === 'object')
                ? lesson.initialWorkspaceFiles
                : {};

            Object.keys(seedFiles).forEach(function(filename) {
                fs.createFile(filename, seedFiles[filename]);
            });

            // If lesson starts with a repo, create a minimal .git structure
            const hasRepo = (lesson.initialGitState && (lesson.initialGitState.commits && lesson.initialGitState.commits.length > 0)) ||
                           (lesson.initialGitState && lesson.initialGitState.branches && lesson.initialGitState.branches.length > 0 && levelIndex > 0);

            if (hasRepo) {
                fs.createDirectory('.git');
                fs.createFile('.git/config', '[core]\n\trepositoryformatversion = 0\n\tbare = false\n\tlogallrefupdates = true');
                fs.createFile('.git/HEAD', 'ref: refs/heads/' + (lesson.initialGitState.currentBranch || 'main'));
                fs.createDirectory('.git/refs');
                fs.createDirectory('.git/refs/heads');
                fs.createDirectory('.git/objects');

                // Create placeholder working files referenced by commits
                const files = new Set();
                (lesson.initialGitState.commits || []).forEach(c => (c.files || []).forEach(f => files.add(f)));
                files.forEach(f => {
                    if (!fs.exists(f)) {
                        const content = (f.toLowerCase().includes('readme') ? '# ' + (lesson.title || 'Project') + '\n\nWelcome to Git Wizard Academy.\n'
                                      : f.toLowerCase().endsWith('.js') ? '// ' + f + '\nconsole.log("Hello from ' + f + '");\n'
                                      : 'Sample content for ' + f + '\n');
                        fs.createFile(f, content);
                    }
                    // Track as committed
                    window.gameState.gitState.trackedFiles[f] = window.gitCommands && window.gitCommands._hash ? window.gitCommands._hash(fs.readFile(f)?.content || '') : true;
                });

                // Seed realistic commit metadata, snapshots, and refs for prepared repositories.
                const hash = (window.gitCommands && window.gitCommands._hash)
                    ? window.gitCommands._hash
                    : function (s) {
                        s = String(s || '');
                        let h = 5381;
                        for (let i = 0; i < s.length; i++) h = (((h << 5) + h) + s.charCodeAt(i)) >>> 0;
                        return h.toString(16);
                      };

                const shaFromSeed = function(seed) {
                    let hex = hash(seed);
                    while (hex.length < 40) hex += hash(hex + ':' + seed + ':' + hex.length);
                    return hex.slice(0, 40);
                };

                const snapshotsByBranch = {};
                const headsByBranch = {};
                const commitBySha = {};
                const seededCommits = [];
                const initialBranches = lesson.initialGitState.branches ? [...lesson.initialGitState.branches] : ['main'];
                initialBranches.forEach(function(branch) {
                    snapshotsByBranch[branch] = {};
                    headsByBranch[branch] = null;
                });

                (lesson.initialGitState.commits || []).forEach(function(c, idx) {
                    const branchName = c.branch || lesson.initialGitState.currentBranch || 'main';
                    const parentSha = headsByBranch[branchName] || null;
                    const parentSnapshot = parentSha && commitBySha[parentSha]
                        ? JSON.parse(JSON.stringify(commitBySha[parentSha].snapshot || {}))
                        : {};
                    const nextSnapshot = JSON.parse(JSON.stringify(parentSnapshot));

                    (c.files || []).forEach(function(fileName) {
                        const existing = fs.readFile(fileName);
                        nextSnapshot[fileName] = existing ? String(existing.content || '') : '';
                    });

                    const tree = {};
                    Object.keys(nextSnapshot).forEach(function(fileName) {
                        tree[fileName] = hash(nextSnapshot[fileName]);
                    });

                    const author = c.author || 'You';
                    const authorMatch = String(author).match(/^(.*?)(?:\s*<([^>]+)>)?$/);
                    const authorName = authorMatch && authorMatch[1] ? authorMatch[1].trim() : 'You';
                    const authorEmail = authorMatch && authorMatch[2] ? authorMatch[2].trim() : 'you@example.com';
                    const timestamp = c.date ? new Date(c.date).toISOString() : new Date(Date.now() + idx * 1000).toISOString();
                    const sha = shaFromSeed(branchName + ':' + idx + ':' + (c.message || 'Seed commit') + ':' + JSON.stringify(tree) + ':' + parentSha);

                    const commit = {
                        id: 'seed' + (idx + 1),
                        sha: sha,
                        shortSha: sha.slice(0, 7),
                        message: c.message || 'Seed commit',
                        author: authorName + ' <' + authorEmail + '>',
                        authorName: authorName,
                        authorEmail: authorEmail,
                        files: c.files || [],
                        branch: branchName,
                        date: timestamp,
                        timestamp: timestamp,
                        parent: parentSha,
                        parents: parentSha ? [parentSha] : [],
                        tree: tree,
                        snapshot: nextSnapshot,
                        parentSnapshot: parentSnapshot
                    };

                    snapshotsByBranch[branchName] = JSON.parse(JSON.stringify(nextSnapshot));
                    headsByBranch[branchName] = sha;
                    commitBySha[sha] = commit;
                    seededCommits.push(commit);
                });

                window.gameState.gitState.commits = seededCommits;
                window.gameState.gitState.commitBySha = commitBySha;
                window.gameState.gitState.refs = Object.assign({}, headsByBranch);
                window.gameState.gitState.remotes.origin.branches = Object.assign({}, headsByBranch);
                Object.keys(headsByBranch).forEach(function(branchName) {
                    window.gameState.gitState.remoteRefs['refs/remotes/origin/' + branchName] = headsByBranch[branchName];
                    window.gameState.gitState.tracking[branchName] = { remote: 'origin', merge: 'refs/heads/' + branchName };
                });
                window.gameState.gitState.headRef = 'refs/heads/' + (lesson.initialGitState.currentBranch || 'main');
                window.gameState.gitState.head = headsByBranch[lesson.initialGitState.currentBranch || 'main'] || null;
                window.gameState.gitState.index = {};
                window.gameState.gitState.staged = [];
                const currentSnapshot = snapshotsByBranch[lesson.initialGitState.currentBranch || 'main'] || {};
                const currentTree = {};
                Object.keys(currentSnapshot).forEach(function(fileName) {
                    currentTree[fileName] = hash(currentSnapshot[fileName]);
                });
                window.gameState.gitState.trackedFiles = currentTree;
                Object.keys(currentSnapshot).forEach(function(fileName) {
                    fs.writeFile(fileName, currentSnapshot[fileName]);
                });

                // Special prepared conflict scenario for Merge Monster:
                // pre-diverged main/feature branches that will conflict on merge.
                if (lesson.conflictScenario) {
                    const hash = (window.gitCommands && window.gitCommands._hash)
                        ? window.gitCommands._hash
                        : function (s) {
                            s = String(s || '');
                            let h = 5381;
                            for (let i = 0; i < s.length; i++) h = (((h << 5) + h) + s.charCodeAt(i)) >>> 0;
                            return h.toString(16);
                          };

                    const mkSha = function(seed) {
                        let hex = hash(seed);
                        while (hex.length < 40) hex += hash(hex + ':' + seed + ':' + hex.length);
                        return hex.slice(0, 40);
                    };

                    const treeOf = function(snapshot) {
                        const t = {};
                        Object.keys(snapshot).forEach(function (f) { t[f] = hash(snapshot[f]); });
                        return t;
                    };

                    const baseSnapshot = {
                        'README.md': '# Conflict Drill\n\nTwo branches are about to diverge.\n',
                        'app.js': 'const mode = \"shared\";\nconsole.log(mode);\n'
                    };
                    const mainSnapshot = {
                        'README.md': baseSnapshot['README.md'],
                        'app.js': 'const mode = \"main\";\nconsole.log(mode + \" timeline\");\n'
                    };
                    const featureSnapshot = {
                        'README.md': baseSnapshot['README.md'],
                        'app.js': 'const mode = \"feature\";\nconsole.log(mode + \" timeline\");\n'
                    };

                    const baseSha = mkSha('seed-conflict-base');
                    const mainSha = mkSha('seed-conflict-main');
                    const featureSha = mkSha('seed-conflict-feature');

                    const baseCommit = {
                        sha: baseSha,
                        shortSha: baseSha.slice(0, 7),
                        message: 'Base timeline',
                        author: 'You <you@example.com>',
                        authorName: 'You',
                        authorEmail: 'you@example.com',
                        branch: 'main',
                        date: new Date().toISOString(),
                        timestamp: new Date().toISOString(),
                        files: ['README.md', 'app.js'],
                        parent: null,
                        parents: [],
                        tree: treeOf(baseSnapshot),
                        snapshot: baseSnapshot,
                        parentSnapshot: {}
                    };
                    const mainCommit = {
                        sha: mainSha,
                        shortSha: mainSha.slice(0, 7),
                        message: 'Main branch edit',
                        author: 'You <you@example.com>',
                        authorName: 'You',
                        authorEmail: 'you@example.com',
                        branch: 'main',
                        date: new Date().toISOString(),
                        timestamp: new Date().toISOString(),
                        files: ['app.js'],
                        parent: baseSha,
                        parents: [baseSha],
                        tree: treeOf(mainSnapshot),
                        snapshot: mainSnapshot,
                        parentSnapshot: baseSnapshot
                    };
                    const featureCommit = {
                        sha: featureSha,
                        shortSha: featureSha.slice(0, 7),
                        message: 'Feature branch edit',
                        author: 'You <you@example.com>',
                        authorName: 'You',
                        authorEmail: 'you@example.com',
                        branch: 'feature',
                        date: new Date().toISOString(),
                        timestamp: new Date().toISOString(),
                        files: ['app.js'],
                        parent: baseSha,
                        parents: [baseSha],
                        tree: treeOf(featureSnapshot),
                        snapshot: featureSnapshot,
                        parentSnapshot: baseSnapshot
                    };

                    window.gameState.gitState.branches = ['main', 'feature'];
                    window.gameState.gitState.currentBranch = 'main';
                    window.gameState.gitState.refs = { main: mainSha, feature: featureSha };
                    window.gameState.gitState.headRef = 'refs/heads/main';
                    window.gameState.gitState.head = mainSha;
                    window.gameState.gitState.commitBySha = {};
                    [baseCommit, mainCommit, featureCommit].forEach(function(c) {
                        window.gameState.gitState.commitBySha[c.sha] = c;
                    });
                    window.gameState.gitState.commits = [baseCommit, mainCommit, featureCommit];
                    window.gameState.gitState.index = {};
                    window.gameState.gitState.staged = [];
                    window.gameState.gitState.mergeInProgress = false;
                    window.gameState.gitState.conflictFiles = [];
                    window.gameState.gitState.trackedFiles = treeOf(mainSnapshot);

                    fs.writeFile('README.md', mainSnapshot['README.md']);
                    fs.writeFile('app.js', mainSnapshot['app.js']);
                    fs.writeFile('.git/HEAD', 'ref: refs/heads/main');
                }
            }
        }
        
        window.gameState.currentObjectives = lesson.objectives ? [...lesson.objectives] : [];
        window.gameState.levelReadyToProceed = false;
        window.gameState.levelContext = {
            startCommitTotal: window.gameState.commits || 0,
            startMergeTotal: window.gameState.merges || 0,
            startBranchCount: (window.gameState.gitState && Array.isArray(window.gameState.gitState.branches))
                ? window.gameState.gitState.branches.length
                : 1,
            startBranchName: (window.gameState.gitState && window.gameState.gitState.currentBranch)
                ? window.gameState.gitState.currentBranch
                : 'main',
            levelStartedAt: new Date().toISOString()
        };
        window.gameState.flags.visitedBranches = {};
        if (window.gameState.gitState && window.gameState.gitState.currentBranch) {
            window.gameState.flags.visitedBranches[window.gameState.gitState.currentBranch] = true;
        }
        
        // Update UI
        this.renderLessonContent(levelIndex);
        
        this.renderObjectives();
        this.updateObjectivesPanelState();
        this.renderCertificateButton();
        this.renderLiveGitHubState();
        this.renderLevelNav();
        this.updateStats();
        
        // Clear terminal
        if (window.ui && window.ui.clearTerminal) {
            window.ui.clearTerminal();
        } else {
            const terminalHistory = document.getElementById('terminalHistory');
            if (terminalHistory) terminalHistory.innerHTML = '';
        }
        
        // Boss fight?
        if (lesson.boss) {
            setTimeout(function() { gameEngine.startBossFight(lesson.boss); }, 1000);
        }

        if (window.ui && window.ui.requestLevelGuide) {
            setTimeout(function() { window.ui.requestLevelGuide(levelIndex); }, 220);
        } else if (window.ui && window.ui.showLevelGuide) {
            setTimeout(function() { window.ui.showLevelGuide(levelIndex); }, 220);
        }
        if (window.ui && window.ui.playLevelFlare) {
            setTimeout(function() { window.ui.playLevelFlare(levelIndex); }, 80);
        }
        
        this.renderCertificateButton();
        this.renderLiveGitHubState();
        this.saveGame();
    },    
    // Render objectives for current level
    renderObjectives: function() {
        const lesson = window.lessons[window.gameState.currentLevel];
        const objList = document.getElementById('currentObjectiveList');
        if (!objList) return;
        
        objList.innerHTML = '';
        lesson.objectives.forEach(function(obj, index) {
            const li = document.createElement('li');
            li.innerHTML = '<div class="objective-checkbox ' + 
                           (window.gameState.currentObjectives[index] === 'complete' ? 'complete' : '') + '">' + 
                           (window.gameState.currentObjectives[index] === 'complete' ? '✓' : '') + 
                           '</div><span>' + obj + '</span>';
            objList.appendChild(li);
        });
        this.updateObjectivesPanelState();
    },
    
    // Check if objectives are complete based on game state
    checkObjectives: function() {
        const lesson = window.lessons[window.gameState.currentLevel];
        window.gameState.flags = window.gameState.flags || {};
        
        lesson.objectives.forEach(function(obj, index) {
            if (window.gameState.currentObjectives[index] === 'complete') return;
            
            var complete = false;
            var objLower = obj.toLowerCase();
            const flags = window.gameState.flags;
            let strictApplied = false;
            const currentLevel = Number(window.gameState.currentLevel);
            const campaignLevel = Number.isFinite(currentLevel) && currentLevel >= 0 && currentLevel <= 9;

            if (campaignLevel) {
                if (window.objectiveRules && window.objectiveRules.evaluateObjective) {
                    const strict = window.objectiveRules.evaluateObjective(currentLevel, index, window.gameState);
                    strictApplied = true;
                    complete = strict === true;
                }
            } else if (window.objectiveRules && window.objectiveRules.evaluateObjective) {
                const strict = window.objectiveRules.evaluateObjective(window.gameState.currentLevel, index, window.gameState);
                if (strict !== null) {
                    strictApplied = true;
                    complete = strict;
                }
            }
            
            if (!strictApplied && !complete && objLower.includes('config') && (flags.configuredIdentity || window.gameState.commandHistory.some(function(c) { return c.includes('config') && (c.includes('user.name') || c.includes('user.email')); }))) {
                complete = true;
            } else if (!strictApplied && !complete && objLower.includes('init') && (flags.repoInited || (window.fileSystemModule && window.fileSystemModule.exists('.git/config')))) {
                complete = true;
            } else if (!strictApplied && !complete && (objLower.includes('stage') || objLower.includes('staging area')) && window.gameState.gitState && window.gameState.gitState.index && Object.keys(window.gameState.gitState.index).length > 0) {
                complete = true;
            } else if (!strictApplied && !complete && objLower.includes('first commit') && window.gameState.commits >= 1) {
                complete = true;
            } else if (!strictApplied && !complete && objLower.includes('commit') && window.gameState.commits >= 1) {
                complete = true;
            } else if (!strictApplied && !complete && objLower.includes('branch') && window.gameState.gitState.branches.length > 1) {
                complete = true;
            } else if (!strictApplied && !complete && objLower.includes('switch') && window.gameState.commandHistory.some(function(c) { return c.includes('checkout') || c.includes('switch'); })) {
                complete = true;
            } else if (!strictApplied && !complete && objLower.includes('merge conflict') && flags.conflictResolved) {
                complete = true;
            } else if (!strictApplied && !complete && objLower.includes('create a merge conflict') && flags.conflictCreated) {
                complete = true;
            } else if (!strictApplied && !complete && objLower.includes('identify') && objLower.includes('conflict') && flags.conflictMarkersIdentified) {
                complete = true;
            } else if (!strictApplied && !complete && objLower.includes('complete a merge') && flags.mergeCompleted) {
                complete = true;
            } else if (!strictApplied && !complete && objLower.includes('merge') && window.gameState.merges >= 1) {
                complete = true;
            } else if (!strictApplied && !complete && objLower.includes('status') && window.gameState.commandHistory.some(function(c) { return c.includes('status'); })) {
                complete = true;
            } else if (!strictApplied && !complete && objLower.includes('log') && window.gameState.commandHistory.some(function(c) { return c.includes('log'); })) {
                complete = true;
            } else if (!strictApplied && !complete && objLower.includes('stash') && localStorage.getItem('gwa_stash') === 'true') {
                complete = true;
            } else if (!strictApplied && !complete && objLower.includes('tag') && localStorage.getItem('gwa_tag') === 'true') {
                complete = true;
            } else if (!strictApplied && !complete && objLower.includes('rebase') && localStorage.getItem('gwa_rebase') === 'true') {
                complete = true;
            } else if (!strictApplied && !complete && objLower.includes('cherry') && localStorage.getItem('gwa_cherrypick') === 'true') {
                complete = true;
            }
            
            if (complete) {
                window.gameState.currentObjectives[index] = 'complete';
                gameEngine.renderObjectives();
                gameEngine.checkLevelComplete();
            }
        });
    },
    
    // Check if level is complete
    checkLevelComplete: function() {
        const allComplete = window.gameState.currentObjectives.every(function(o) { return o === 'complete'; });
        if (!allComplete) {
            window.gameState.levelReadyToProceed = false;
            this.updateObjectivesPanelState();
            return;
        }

        window.gameState.levelReadyToProceed = true;
        const lesson = (window.lessons && window.lessons[window.gameState.currentLevel]) ? window.lessons[window.gameState.currentLevel] : null;
        if (lesson && lesson.tierIsCapstone) {
            window.gameState.tierProgress = window.gameState.tierProgress || {};
            window.gameState.tierProgress[lesson.tierKey] = {
                levelIndex: window.gameState.currentLevel,
                tierName: lesson.tier,
                completedAt: new Date().toISOString()
            };
        }
        if (window.gameState.completedLevels.indexOf(window.gameState.currentLevel) === -1) {
            window.gameState.completedLevels.push(window.gameState.currentLevel);
        }

        window.gameState.flags = window.gameState.flags || {};
        if (!window.gameState.flags.levelCompletionCelebrated) {
            window.gameState.flags.levelCompletionCelebrated = true;
            if (window.ui && window.ui.celebrateObjectivesPanel) {
                window.ui.celebrateObjectivesPanel();
            }
        }
        this.renderCertificateButton();
        this.renderLiveGitHubState();
        this.updateObjectivesPanelState();
    },
    
    // Render level navigation
    renderLevelNav: function() {
        const nav = document.getElementById('levelNav');
        if (!nav) return;
        
        nav.innerHTML = '';
        
        var maxCompleted = window.gameState.completedLevels.length > 0 ? Math.max.apply(null, window.gameState.completedLevels) : -1;
        
        window.lessons.forEach(function(lesson, index) {
            var btn = document.createElement('div');
            btn.className = 'level-btn ' + (index === window.gameState.currentLevel ? 'active' : '') + 
                           (window.gameState.completedLevels.indexOf(index) !== -1 ? ' completed' : '') +
                           (index > maxCompleted + 1 ? ' locked' : '');
            btn.innerHTML = '<div class="level-icon ' + lesson.iconClass + '">' + lesson.icon + '</div>' +
                           '<div class="level-info"><div class="level-name">' + lesson.title + '</div>' +
                           '<div class="level-desc">' + lesson.description + '</div></div>' +
                           '<div class="level-status">' + (window.gameState.completedLevels.indexOf(index) !== -1 ? '✓' : '') + '</div>';
            btn.onclick = (function(idx) {
                return function() {
                    if (idx <= maxCompleted + 1) {
                        gameEngine.loadLevel(idx);
                    }
                };
            })(index);
            nav.appendChild(btn);
        });
    },
    
    // Render achievements
    renderAchievements: function() {
        const grid = document.getElementById('achievementsGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        window.achievements.forEach(function(ach) {
            var unlocked = ach.condition();
            var div = document.createElement('div');
            div.className = 'achievement ' + (unlocked ? 'unlocked' : 'locked');
            div.innerHTML = '<div class="achievement-icon">' + ach.icon + '</div>' +
                           '<div class="achievement-tooltip"><strong>' + ach.name + '</strong><br>' + ach.desc + '</div>';
            grid.appendChild(div);
            
            if (unlocked && window.gameState.achievements.indexOf(ach.id) === -1) {
                window.gameState.achievements.push(ach.id);
                gameEngine.showAchievementPopup(ach);
            }
        });
    },
    
    // Show achievement popup
    showAchievementPopup: function(achievement) {
        const popup = document.getElementById('achievementPopup');
        const icon = document.getElementById('achievementPopupIcon');
        const title = document.getElementById('achievementPopupTitle');
        const desc = document.getElementById('achievementPopupDesc');
        
        if (icon) icon.textContent = achievement.icon;
        if (title) title.textContent = achievement.name;
        if (desc) desc.textContent = achievement.desc;
        if (popup) popup.classList.add('show');
        
        setTimeout(function() { if (popup) popup.classList.remove('show'); }, 3000);
    },
    
    // Boss fight system
    startBossFight: function(boss) {
        const overlay = document.getElementById('bossOverlay');
        const avatar = document.getElementById('bossAvatar');
        const name = document.getElementById('bossName');
        const dialogue = document.getElementById('bossDialogue');
        const hint = document.getElementById('bossHint');
        
        if (avatar) avatar.textContent = boss.avatar;
        if (name) name.textContent = boss.name;
        if (dialogue) dialogue.innerHTML = '"' + boss.dialogue + '"';
        if (hint) hint.textContent = boss.hint;
        
        window.bossHP = boss.hp || 100;
        this.updateBossHealth();
        
        if (this._bossIntroTimer) {
            clearTimeout(this._bossIntroTimer);
            this._bossIntroTimer = null;
        }

        if (overlay) {
            overlay.classList.remove('minimized');
            overlay.classList.add('show');
        }
        const terminalInput = document.getElementById('terminalInput');
        if (terminalInput) {
            setTimeout(function() {
                terminalInput.focus();
            }, 20);
        }

        // Keep full-screen intro visible for 5-10s, then shrink to top-center status.
        const introMs = 5000 + Math.floor(Math.random() * 5001);
        this._bossIntroTimer = setTimeout(function() {
            if (!overlay || !overlay.classList.contains('show')) return;
            overlay.classList.add('minimized');
            const input = document.getElementById('terminalInput');
            if (input) input.focus();
        }, introMs);
    },
    
    updateBossHealth: function() {
        const healthBar = document.getElementById('bossHealthBar');
        const hpText = document.getElementById('bossHP');
        if (healthBar) healthBar.style.width = window.bossHP + '%';
        if (hpText) hpText.textContent = window.bossHP;
    },
    
    damageBoss: function(amount) {
        window.bossHP -= amount;
        if (window.bossHP < 0) window.bossHP = 0;
        this.updateBossHealth();
        
        if (window.bossHP <= 0) {
            const overlay = document.getElementById('bossOverlay');
            if (this._bossIntroTimer) {
                clearTimeout(this._bossIntroTimer);
                this._bossIntroTimer = null;
            }
            if (overlay) overlay.classList.remove('show', 'minimized');
            this.addXP(100);
            this.showAchievementPopup({ icon: '🏆', name: 'Boss Slayer', desc: 'Defeated a boss!' });
        }
    },
    
    // Save game state
    saveGame: function() {
        if (window.lessonStore && window.lessonStore.save) {
            window.lessonStore.save(window.gameState);
        } else {
            localStorage.setItem('gwa_gameState', JSON.stringify(window.gameState));
        }

        if (window.certificateStore && window.certificateStore.save) {
            window.certificateStore.save(Array.isArray(window.gameState.certificates) ? window.gameState.certificates : []);
        }
        if (window.liveGitHubStore && window.liveGitHubStore.save) {
            window.liveGitHubStore.save(window.gameState.liveGitHub || {});
        }

        if (window.repoStore && window.repoStore.save && window.fileSystemModule && window.fileSystemModule.export) {
            window.repoStore.save({
                gitState: window.gameState.gitState,
                fsSnapshot: window.fileSystemModule.export()
            });
        }

        if (window.fileSystemModule && window.fileSystemModule.save) window.fileSystemModule.save();
    },
    
    // Next level
    nextLevel: function() {
        if (!window.gameState.levelReadyToProceed && window.gameState.currentLevel < window.lessons.length - 1) {
            return;
        }
        const modal = document.getElementById('levelCompleteModal');
        if (modal) modal.classList.remove('show');
        
        if (window.gameState.currentLevel < window.lessons.length - 1) {
            this.loadLevel(window.gameState.currentLevel + 1);
        } else {
            alert('🎉 CONGRATULATIONS! You are now a Git Grand Wizard! 🧙‍♂️');
        }
    },
    
    // Close modal
    closeModal: function() {
        const modal = document.getElementById('levelCompleteModal');
        if (modal) modal.classList.remove('show');
    },

    resetLevel: function(skipConfirm) {
        const okay = skipConfirm || window.confirm('Reset current level progress and workspace?');
        if (!okay) return false;

        this.loadLevel(window.gameState.currentLevel || 0);
        this.updateStats();
        this.renderObjectives();
        this.renderLevelNav();
        this.saveGame();
        return true;
    },

    resetGame: function(skipConfirm) {
        const okay = skipConfirm || window.confirm('Reset the entire game, all levels, and saved state?');
        if (!okay) return false;

        if (window.lessonStore && window.lessonStore.clear) window.lessonStore.clear();
        if (window.repoStore && window.repoStore.clear) window.repoStore.clear();
        [
            'gwa_stash',
            'gwa_tag',
            'gwa_rebase',
            'gwa_interactive_rebase',
            'gwa_cherrypick',
            'gwa_recovery'
        ].forEach(function(key) { localStorage.removeItem(key); });

        if (window.fileSystemModule && window.fileSystemModule.reset) window.fileSystemModule.reset();

        const preservedCertificates = window.certificateStore && window.certificateStore.load
            ? window.certificateStore.load()
            : [];
        window.gameState = createDefaultGameState();
        window.gameState.certificates = Array.isArray(preservedCertificates) ? preservedCertificates.slice() : [];
        const preservedLiveGitHub = window.liveGitHubStore && window.liveGitHubStore.load
            ? window.liveGitHubStore.load()
            : {};
        window.gameState.liveGitHub = Object.assign({
            connected: false,
            authenticated: false,
            repo: null,
            user: null,
            bridgeUrl: 'http://127.0.0.1:31556'
        }, preservedLiveGitHub || {});
        window.gameState.introSeen = false;
        this.syncGlobalEnvironmentConfig();
        this.loadLevel(0);
        this.updateStats();
        this.renderAchievements();
        this.renderLevelNav();
        this.saveGame();
        if (window.ui && window.ui.showIntro) {
            window.ui.showIntro();
        }
        return true;
    }
};

// Export
window.gameEngine = gameEngine;

// Auto-init
document.addEventListener('DOMContentLoaded', function(){
  if (window.gameEngine && window.lessons) {
    window.gameEngine.init();
  }
});

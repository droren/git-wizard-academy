const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { createLiveGitHubService } = require('../js/live-github-server.js');
const { buildExport } = require('../js/export-repo.js');

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function makeState() {
  return {
    gitState: {
      branches: ['main'],
      currentBranch: 'main',
      refs: { main: 'abc' },
      head: 'abc',
      headRef: 'refs/heads/main',
      commits: [{
        sha: 'abc',
        shortSha: 'abc1234',
        message: 'feat: initial live repo',
        authorName: 'Dennis Hjort',
        authorEmail: 'hjort.dennis@gmail.com',
        timestamp: '2026-04-10T10:00:00.000Z',
        branch: 'main',
        parents: [],
        snapshot: {
          'README.md': '# Live GitHub Mode\n'
        }
      }],
      commitBySha: {
        abc: {
          sha: 'abc',
          shortSha: 'abc1234',
          message: 'feat: initial live repo',
          authorName: 'Dennis Hjort',
          authorEmail: 'hjort.dennis@gmail.com',
          timestamp: '2026-04-10T10:00:00.000Z',
          branch: 'main',
          parents: [],
          snapshot: {
            'README.md': '# Live GitHub Mode\n'
          }
        }
      },
      config: {
        global: {
          'user.name': 'Dennis Hjort',
          'user.email': 'hjort.dennis@gmail.com'
        },
        local: {}
      }
    }
  };
}

function response(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    async text() {
      return typeof payload === 'string' ? payload : JSON.stringify(payload);
    },
    async json() {
      return payload;
    }
  };
}

async function run() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gwa-live-gh-test-'));
  const bareRemote = path.join(tempRoot, 'remote.git');
  git(['init', '--bare', bareRemote], tempRoot);

  const requests = [];
  const fetchImpl = async (url, options) => {
    const endpoint = String(url);
    requests.push({ url: endpoint, options: options || {} });
    const method = String((options && options.method) || 'GET').toUpperCase();

    if (endpoint.endsWith('/user')) {
      return response(200, { login: 'dennis', id: 1 });
    }
    if (endpoint.endsWith('/user/repos') && method === 'POST') {
      return response(201, {
        id: 101,
        name: 'git-wizard-live',
        owner: { login: 'dennis' },
        html_url: 'https://github.com/dennis/git-wizard-live',
        clone_url: bareRemote,
        ssh_url: bareRemote,
        default_branch: 'main',
        private: true
      });
    }
    if (endpoint.includes('/contents/.github/workflows/git-wizard-academy-ci.yml') && method === 'GET') {
      return response(404, { message: 'not found' });
    }
    if (endpoint.includes('/contents/.github/workflows/git-wizard-academy-ci.yml') && method === 'PUT') {
      return response(201, { content: { sha: 'workflow123' } });
    }
    if (endpoint.includes('/pulls') && method === 'POST') {
      return response(201, {
        number: 7,
        html_url: 'https://github.com/dennis/git-wizard-live/pull/7',
        head: { ref: 'feature/live-mode', sha: 'prsha123' },
        base: { ref: 'main' },
        state: 'open'
      });
    }
    if (endpoint.includes('/pulls/7/reviews') && method === 'POST') {
      return response(200, { id: 55, state: 'COMMENTED' });
    }
    if (endpoint.includes('/issues/7/comments') && method === 'POST') {
      return response(201, { id: 77, body: 'review bot comment' });
    }
    if (endpoint.includes('/pulls/7/merge') && method === 'PUT') {
      return response(200, { merged: true, sha: 'merge123', message: 'Merged' });
    }
    if (endpoint.includes('/pulls/7') && method === 'GET') {
      return response(200, {
        number: 7,
        html_url: 'https://github.com/dennis/git-wizard-live/pull/7',
        head: { ref: 'feature/live-mode', sha: 'prsha123' },
        base: { ref: 'main' },
        state: 'open'
      });
    }
    if (endpoint.includes('/pulls/7/commits') && method === 'GET') {
      return response(200, [{
        sha: 'c1',
        commit: { message: 'feat: add workflow integration' }
      }]);
    }
    if (endpoint.includes('/commits/prsha123/status') && method === 'GET') {
      return response(200, { state: 'success' });
    }
    if (endpoint.includes('/commits/prsha123/check-runs') && method === 'GET') {
      return response(200, { check_runs: [{ status: 'completed', conclusion: 'success' }] });
    }
    if (endpoint.includes('/repos/dennis/git-wizard-live') && method === 'GET') {
      return response(200, {
        id: 101,
        name: 'git-wizard-live',
        owner: { login: 'dennis' },
        html_url: 'https://github.com/dennis/git-wizard-live',
        clone_url: bareRemote,
        ssh_url: bareRemote,
        default_branch: 'main',
        private: true
      });
    }
    return response(404, { message: 'unhandled mock endpoint', endpoint, method });
  };

  const service = createLiveGitHubService({
    fetchImpl,
    exporter: { buildExport }
  });

  const auth = await service.authenticate('fake-token');
  assert.strictEqual(auth.authenticated, true, 'authentication should succeed');
  assert.strictEqual(auth.user.login, 'dennis', 'user login should be recorded');

  const repo = await service.ensureRepository({
    repoName: 'git-wizard-live',
    reuseExisting: false,
    private: true,
    description: 'Live mode repo'
  });
  assert.strictEqual(repo.name, 'git-wizard-live', 'repo should be created');

  const pushResult = await service.syncLocalRepoToRemote({
    gameState: makeState(),
    config: {
      'user.name': 'Dennis Hjort',
      'user.email': 'hjort.dennis@gmail.com'
    },
    repoName: 'git-wizard-live'
  }, 'full');
  assert.strictEqual(pushResult.pushed, true, 'push should succeed');
  assert(fs.existsSync(bareRemote), 'bare remote should exist');
  const branchRefs = git(['for-each-ref', '--format=%(refname:short)', 'refs/heads'], bareRemote).trim();
  assert(branchRefs.includes('main'), 'push should create the main branch on the remote');

  const workflow = await service.installWorkflow({
    gameState: makeState(),
    config: {
      'user.name': 'Dennis Hjort',
      'user.email': 'hjort.dennis@gmail.com'
    },
    repoName: 'git-wizard-live'
  });
  assert(workflow.result && workflow.result.content, 'workflow installation should return a commit response');

  const pr = await service.createPullRequest({
    gameState: makeState(),
    config: {},
    repoName: 'git-wizard-live',
    headBranch: 'feature/live-mode',
    baseBranch: 'main'
  });
  assert.strictEqual(pr.pr.number, 7, 'PR creation should return the created PR number');

  const review = await service.reviewBot({
    gameState: makeState(),
    config: {},
    repoName: 'git-wizard-live',
    pullNumber: 7
  });
  assert(Array.isArray(review.problems), 'review bot should return a problem list');

  const merge = await service.mergePullRequest({
    gameState: makeState(),
    config: {},
    repoName: 'git-wizard-live',
    pullNumber: 7,
    mergeMethod: 'merge'
  });
  assert.strictEqual(merge.merge.merged, true, 'merge should succeed when checks pass');

  const statusResponses = requests.filter((req) => /\/status$/.test(req.url));
  assert(statusResponses.length >= 1, 'merge should inspect PR status before merging');

  console.log('live-github: all tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

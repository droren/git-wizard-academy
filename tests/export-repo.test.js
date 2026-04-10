const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { exportClean, exportFullHistory, exportWithWorkflow } = require('../js/export-repo.js');

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function makeState() {
  const base = {
    sha: 'base000000000000000000000000000000000001',
    shortSha: 'base000',
    message: 'Initial commit',
    authorName: 'Dennis Hjort',
    authorEmail: 'hjort.dennis@gmail.com',
    timestamp: '2026-04-10T10:00:00.000Z',
    branch: 'main',
    parents: [],
    snapshot: {
      'README.md': '# Export Test\n',
      'app.js': 'console.log("base");\n'
    }
  };
  const feature = {
    sha: 'feat00000000000000000000000000000000002',
    shortSha: 'feat000',
    message: 'Feature work',
    authorName: 'Dennis Hjort',
    authorEmail: 'hjort.dennis@gmail.com',
    timestamp: '2026-04-10T10:05:00.000Z',
    branch: 'feature',
    parents: [base.sha],
    snapshot: {
      'README.md': '# Export Test\n',
      'app.js': 'console.log("feature");\n'
    }
  };
  const main = {
    sha: 'main000000000000000000000000000000000003',
    shortSha: 'main000',
    message: 'Mainline work',
    authorName: 'Dennis Hjort',
    authorEmail: 'hjort.dennis@gmail.com',
    timestamp: '2026-04-10T10:06:00.000Z',
    branch: 'main',
    parents: [base.sha],
    snapshot: {
      'README.md': '# Export Test\n',
      'app.js': 'console.log("main");\n'
    }
  };
  const merge = {
    sha: 'merge0000000000000000000000000000000004',
    shortSha: 'merge00',
    message: 'Merge feature',
    authorName: 'Dennis Hjort',
    authorEmail: 'hjort.dennis@gmail.com',
    timestamp: '2026-04-10T10:10:00.000Z',
    branch: 'main',
    parents: [main.sha, feature.sha],
    snapshot: {
      'README.md': '# Export Test\n',
      'app.js': 'console.log("merged");\n'
    }
  };

  return {
    gitState: {
      branches: ['main', 'feature'],
      currentBranch: 'main',
      headRef: 'refs/heads/main',
      head: merge.sha,
      refs: {
        main: merge.sha,
        feature: feature.sha
      },
      commits: [base, feature, main, merge],
      commitBySha: {
        [base.sha]: base,
        [feature.sha]: feature,
        [main.sha]: main,
        [merge.sha]: merge
      },
      config: {
        local: {},
        global: {
          'user.name': 'Dennis Hjort',
          'user.email': 'hjort.dennis@gmail.com'
        }
      },
      tags: {
        'v1.0.0': {
          name: 'v1.0.0',
          target: merge.sha,
          annotated: true,
          message: 'Release 1.0.0',
          tagger: {
            name: 'Dennis Hjort',
            email: 'hjort.dennis@gmail.com',
            date: '2026-04-10T10:11:00.000Z'
          }
        }
      }
    },
    fsSnapshot: {
      files: {
        'README.md': '# Export Test\n',
        'app.js': 'console.log("merged");\n'
      }
    }
  };
}

function run() {
  const state = makeState();
  const clean = exportClean(state);

  assert(fs.existsSync(clean.repoDir), 'exported repo dir missing');
  assert.strictEqual(git(['status', '--short'], clean.repoDir), '', 'clean export should have clean status');
  assert.strictEqual(git(['branch', '--show-current'], clean.repoDir), 'main', 'clean export should checkout main');
  assert(/Merge feature/.test(git(['log', '--oneline', '--decorate', '--graph', '--all'], clean.repoDir)), 'merge commit missing from log');
  assert.strictEqual(git(['rev-list', '--parents', '-n1', 'HEAD'], clean.repoDir).split(/\s+/).length, 3, 'merge commit should have two parents');
  assert(git(['tag', '--list'], clean.repoDir).split('\n').includes('v1.0.0'), 'annotated tag missing');

  const full = exportFullHistory(state);
  assert.strictEqual(git(['status', '--short'], full.repoDir), '', 'full export should have clean status');

  const workflow = exportWithWorkflow(state);
  assert(fs.existsSync(path.join(workflow.exportRoot, 'origin.git')), 'workflow export should create bare origin');
  assert(/origin/.test(git(['remote', '-v'], workflow.repoDir)), 'workflow export should configure origin remote');
  assert(/origin\/main/.test(git(['branch', '-r'], workflow.repoDir)), 'workflow export should push remote branches');

  const detachedState = makeState();
  detachedState.gitState.headRef = 'HEAD';
  const detached = exportClean(detachedState);
  let detachedSymbolic = false;
  try {
    git(['symbolic-ref', '-q', 'HEAD'], detached.repoDir);
  } catch (err) {
    detachedSymbolic = true;
  }
  assert(detachedSymbolic, 'detached HEAD export should remain detached');
  assert.strictEqual(git(['status', '--short'], detached.repoDir), '', 'detached export should remain clean');

  console.log('export-repo: all tests passed');
}

run();

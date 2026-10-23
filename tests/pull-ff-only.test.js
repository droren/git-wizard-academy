const assert = require('assert');
const { createHarness } = require('./git-commands.fixtures.js');

async function run() {
  const base = 'a'.repeat(40);
  const local = 'b'.repeat(40);
  const remote = 'c'.repeat(40);
  const harness = createHarness({
    files: { '.git/config': '[core]\nrepositoryformatversion = 0\n' },
    gameState: {
      commits: 3,
      merges: 0,
      conflicts: 0,
      branches: 1,
      flags: {},
      gitState: {
        branches: ['main'],
        currentBranch: 'main',
        refs: { main: local },
        head: local,
        commits: [],
        commitBySha: {
          [base]: { sha: base, parents: [], tree: {}, snapshot: {} },
          [local]: { sha: local, parents: [base], tree: {}, snapshot: {} },
          [remote]: { sha: remote, parents: [base], tree: {}, snapshot: {} }
        },
        remotes: {
          origin: {
            name: 'origin',
            fetchUrl: 'https://example.com/origin.git',
            pushUrl: 'https://example.com/origin.git',
            branches: { main: remote }
          }
        },
        remoteRefs: {},
        tracking: { main: { remote: 'origin', merge: 'refs/heads/main' } }
      }
    }
  });

  const result = await harness.git.pull(['--ff-only', 'origin', 'main']);
  assert.strictEqual(result.success, false, 'pull --ff-only must reject a divergent branch instead of creating a merge');
  assert.match(result.message, /Not possible to fast-forward|fast-forward/, 'rejection should explain the fast-forward-only constraint');
  assert.strictEqual(harness.window.gameState.gitState.refs.main, local, 'failed --ff-only pull must not move HEAD');
  console.log('pull-ff-only: all tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

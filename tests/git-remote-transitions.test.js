const assert = require('assert');
const { createHarness } = require('./git-commands.fixtures.js');

async function run() {
  const simulated = createHarness();

  let res = await simulated.git.fetch([]);
  assert.strictEqual(res.success, true, 'simulated fetch should succeed');
  assert.match(res.message, /fetch is simulated/, 'simulated fetch should mention simulator mode');

  res = await simulated.git.pull([]);
  assert.strictEqual(res.success, true, 'simulated pull should succeed');
  assert.match(res.message, /pull is simulated/, 'simulated pull should mention simulator mode');

  res = await simulated.git.push([]);
  assert.strictEqual(res.success, true, 'simulated push should succeed');
  assert.match(res.message, /push is simulated/, 'simulated push should mention simulator mode');

  const calls = [];
  const live = createHarness({
    gameEngine: {
      isLiveGitHubConnected: () => true,
      fetchLiveGitHubRepo: async () => {
        calls.push('fetch');
        return { result: { output: 'remote fetch ok' } };
      },
      pullLiveGitHubRepo: async () => {
        calls.push('pull');
        return { result: { output: 'remote pull ok' } };
      },
      pushLiveGitHubRepo: async () => {
        calls.push('push');
        return { result: { repo: { owner: 'octo', name: 'academy' } } };
      }
    }
  });

  res = await live.git.fetch([]);
  assert.strictEqual(res.success, true, 'live fetch should succeed');
  assert.match(res.message, /remote fetch ok/, 'live fetch output should include upstream response');
  assert.match(res.message, /Live GitHub Mode fetched real GitHub refs/, 'live fetch should include live mode note');

  res = await live.git.pull([]);
  assert.strictEqual(res.success, true, 'live pull should succeed');
  assert.match(res.message, /remote pull ok/, 'live pull output should include upstream response');
  assert.match(res.message, /Live GitHub Mode pulled from GitHub/, 'live pull should include live mode note');

  res = await live.git.push([]);
  assert.strictEqual(res.success, true, 'live push should succeed');
  assert.match(res.message, /Pushed to octo\/academy/, 'live push should reference target repo');
  assert.match(res.message, /Live GitHub Mode pushed real branches and tags/, 'live push should include live mode note');

  assert.deepStrictEqual(calls, ['fetch', 'pull', 'push'], 'live remote operations should call game engine hooks in order');

  console.log('git-remote-transitions: all tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

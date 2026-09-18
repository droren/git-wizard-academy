#!/usr/bin/env sh
set -eu

node --check js/objective-rules.js
node --check js/game-engine.js
node --check js/git-commands.js
node --check js/lessons.js
node --check js/ui.js
node --check js/lesson-guides.js
node --check js/story-arc.js
node --check js/storage-stores.js
node --check js/asset-loader.js
node --check js/dev-logger.js
node --check js/effects.js
node --check js/ambient-engine.js
node --check js/character-system.js
node --check js/export-repo.js
node --check js/export-bridge-server.js
node --check js/live-github-server.js
node --check js/live-github-client.js
node --check js/achievements.js
node --check js/file-system.js
node --check js/repo-model.js
node --check js/shell-commands.js
node --check js/intro-sprite-showcase.js
node --check js/test-bridge.js
node --check js/export-bridge-client.js
node --check export-bridge.js
node --check live-github.js
node tests/objective-rules.test.js
node tests/git-config.test.js
node tests/git-commit-validation.test.js
node tests/dev-logger.test.js
node tests/ambient-engine.test.js
node tests/character-system.test.js
node tests/home-structure.test.js
node tests/asset-loader.test.js
node tests/merge-boss.test.js
node tests/lesson-scenarios.test.js
node tests/story-arc.test.js
node tests/curriculum-integrity.test.js
node tests/tier-certificates.test.js
node tests/export-repo.test.js
node tests/export-bridge.test.js
node tests/live-github.test.js
node tests/git-detached-head.test.js
node tests/git-merge-conflict-lifecycle.test.js
node tests/git-hooks-rejection.test.js
node tests/git-rebase-rewrite.test.js
node tests/git-remote-transitions.test.js
node tests/detached-head.test.js
node tests/git-commands.test.js
node tests/boot-smoke.test.js
node tests/level-1-playthrough.test.js
node tests/commit-any-message.test.js

echo "all checks passed"

#!/usr/bin/env sh
set -eu

node --check js/objective-rules.js
node --check js/game-engine.js
node --check js/git-commands.js
node --check js/lessons.js
node --check js/ui.js
node --check js/lesson-guides.js
node --check js/story-arc.js
node tests/objective-rules.test.js
node tests/lesson-scenarios.test.js
node tests/story-arc.test.js
node tests/curriculum-integrity.test.js

echo "all checks passed"

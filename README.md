# Git Wizard Academy

Git Wizard Academy is a browser-based, story-driven Git learning game.
It blends realistic Git command simulation, guided lessons, boss challenges, and achievement progression inside a single static SPA (`index.html` + JS/CSS).

## Highlights

- Realistic in-browser Git simulation (repo state, refs, commits, index, status, branches, merge conflicts, rebase/cherry-pick/reset/stash flows)
- Fantasy/sci-fi narrative arc woven through all 10 levels
- Cinematic opening crawl with replay support and `Esc` skip
- Mentor-driven campaign framing plus per-chapter guardians/bosses
- XP, achievements, streaks, boss encounters, level objectives
- Persistent state using `localStorage` (lesson progress, repo state, config)
- ANSI-rendered terminal output with `xterm.js` support
- Level intro guided command demos (play/pause/replay/start)
- Optional conflict resolver UI (kept disabled for current conflict lesson flow)
- Dedicated integration harness page (`tests/integration.html`)

## Project Structure

- `index.html`: main app shell and modal overlays
- `css/main.css`: all styling, layout, terminal, overlays, animations
- `js/game-engine.js`: progression, objectives, levels, boss/achievement systems
- `js/git-commands.js`: Git simulation engine and command implementations
- `js/shell-commands.js`: shell command simulation (`ls`, `cat`, `echo`, `nano`, etc.)
- `js/ui.js`: terminal input/output, guide playback, hints, UI orchestration
- `js/lessons.js`: lesson content, objectives, initial scenario setup
- `js/story-arc.js`: prologue crawl, mentor/guardian cast, chapter framing, sequel hooks
- `js/objective-rules.js`: strict objective validation logic
- `js/file-system.js`: in-browser virtual filesystem + persistence
- `js/storage-stores.js`: config/repo/lesson stores
- `js/repo-model.js`: reusable repo model helpers
- `js/test-bridge.js`: postMessage bridge used by integration harness
- `tests/`: test runner, rule/scenario/story tests, browser harness page

## Running Locally

Any static server works. Example:

```sh
python3 -m http.server 8080
```

Then open:

- App: `http://localhost:8080/index.html`
- Integration harness: `http://localhost:8080/tests/integration.html`

## Test Commands

Run full local checks:

```sh
./tests/run-all.sh
```

This executes syntax checks and core suites:

- `tests/objective-rules.test.js`
- `tests/lesson-scenarios.test.js`
- `tests/story-arc.test.js`

## Gameplay Notes

- `Reset Level` resets current level scenario/workspace/objectives.
- `Reset Game` clears campaign progress, restarts from level 1, replays the cinematic intro, and keeps your global Git environment intact.
- `Replay Intro` reopens the opening crawl without cluttering the main interface.
- Global `git config --global ...` settings are mirrored into a virtual `~/.gitconfig` and persist across the whole course.
- Merge Monster (Level 4) is designed as a real conflict-marker workflow:
  1. trigger merge conflict
  2. inspect markers with `cat`/`nano`
  3. manually edit file
  4. `git add` + `git commit`

## Design Goals

- Teach practical Git behavior, not only command memorization.
- Prevent objective bypasses with strict state-based validation.
- Keep progression fun and thematic without sacrificing learning accuracy.
- Prepare learners for real-world workflows (branching, conflict resolution, history analysis).
- Build a bridge from local Git mastery toward a future hosted-repository course instead of overloading the fundamentals game.

## Future Enhancements

- Dedicated repository management mode (PR-style conflict UI scenarios)
- Expanded graph visualization and timeline debugging tools
- More deterministic UI integration tests (Playwright-based)
- Additional lesson-specific validators and anti-shortcut guards

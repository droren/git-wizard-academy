# Release Notes

## 2026-09-19 - Consistent "Level Completed!" Popup

### Fixed

- A "Level Completed! Success" popup now appears on **every** level the first time all of its
  objectives complete. Previously no completion popup was raised at all — only a side "Next Level"
  panel button — which is why levels 1 and 2 seemed to finish silently and the player had to pick
  the next level from the right-hand map.
- The popup is now raised by `checkLevelComplete` through a new `showLevelCompleteModal`, which fills
   a chapter-specific title, a story-arc transition/next-frontier line, an XP badge, a reward chip,
  and a "Next Level →" (or "Finish 🏆" on the last level) action into the existing
   `#levelCompleteModal`. It fires only once per level (guarded by `completedLevelRuns`), so replays,
  re-renders, and save-loads never re-pop it.
- "Level 3: Good-to-Know Branchcraft" no longer completes prematurely. Its final objective,
  "Prepare a merge path", was satisfied by any two commits on two branches. It now requires an actual
   `git merge` (a two-parent merge commit), matching real Git and the level's goal of preparing an
   integration path.
- Level 3's on-screen instructions now include `git merge feature/ui` so the new, stricter objective
  remains reachable for the player.

### Added

- `gameEngine.showLevelCompleteModal(levelIndex)` and the `firstTimeCompletion` capture in
   `checkLevelComplete` (gates one popup per level).
- `#levelCompleteModal` styling: `.modal-reward-chip` and a title "pop" animation on appearance.
- Regression suite `tests/level-completion-popup.test.js`: the popup fires exactly once on first
  completion of a level, not at all before completion, and Level 3 does not become ready before a
   real `git merge`; the new suite is wired into `tests/run-all.sh` (27 suites, all green).

## 2026-09-18 - Commit UX, Guide Readability, and Intro Timing

### Fixed

- Recovered `js/git-commands.js`, which had two missing `}` braces (in `reactCharacter` and a
  detached-`checkout` `if` block) left by a bad merge. The module failed to load and forced a hard
  15-character commit-message gate.
- `git commit -m "..."` now accepts any non-empty message, just like real Git. A blank or
  punctuation-only message is the only hard failure.
- Empty commit messages now surface a floating coaching reason instead of just an error sound.
- Level briefings no longer clip off-screen: the guide modal is viewport-capped with internally
  scrolling story-and-terminal panes.
- The intro crawl no longer vanishes ~10s before "ready to play"; the finale is tied to the
  crawl's `animationend` and the scroll holds opacity long enough to read.
- The lesson panel (character card + "Chronicle of Broken Time" backstory) no longer clips off the
  bottom of its card: a later `.panel { overflow: hidden }` rule had clobbered the intended
  `overflow-y: auto`. The panel is now a viewport-capped flex column with a pinned header and an
  internally scrolling body, so the whole mission is always readable.

### Added

- `validateCommitMessage` returns a `quality` of `good` / `short` / `empty`; the first commit gets a
  special welcome and a short-but-valid commit gets a gentle conventional-style hint.
- `ui.showCommitCoach` and `fireCommitCoach` surface the reason (or a hint) on commit.
- New regression tests: `tests/commit-any-message.test.js`, `tests/level-1-playthrough.test.js`,
  `tests/boot-smoke.test.js`; `tests/git-commit-validation.test.js` updated to the lenient behavior.

## 2026-04-10 - Live GitHub Mode Foundation

### Added

- Local Node bridge for GitHub API workflows in `js/live-github-server.js`
- Browser client for connecting the SPA to a local GitHub bridge in `js/live-github-client.js`
- `live-github.js` launcher for starting the bridge on `http://127.0.0.1:31556`
- Live GitHub UI modal for token auth, repo creation, pushes, pulls, workflow installs, PRs, review bot actions, and logout/reset
- Real git push/fetch/pull delegation from the simulator when Live GitHub Mode is connected
- Regression tests for auth, repo provisioning, workflow install, PR creation, review bot, merge gating, and real local push to a bare remote mirror

### Changed

- Live GitHub sessions are persisted in local bridge storage and excluded from browser-visible lesson state

## 2026-04-10 - Real Repository Export Mode

### Added

- Node-based real repository exporter in `js/export-repo.js`
- Export UI with:
  - Clean Export
  - Full History
  - With Workflow
- Support for real Git CLI reconstruction of commits, branches, tags, merge commits, and a workflow-ready bare remote mirror
- Browser fallback export package download for hosts that do not inject a local export bridge
- Local Node bridge script (`export-bridge.js`) for direct browser-to-CLI export on `http://127.0.0.1:31555`
- Regression tests covering exported `git log`, `git branch`, `git status`, tags, detached HEAD, and workflow remote setup

### Changed

- `git tag` now stores tags in simulated repo state so the exporter can recreate them

## 2026-04-10 - Tiered Progression, Certificates, and Commit Realism

### Added

- Tier metadata for every lesson, with five named progression tiers:
  - Git Knight
  - Advanced Knight
  - Template Knight
  - Git Wizard
  - Grand Git Wizard
- Tier capstone tracking and downloadable HTML certificates that use the learner's stored Git identity
- Persistent certificate storage separate from campaign reset state
- Static validation tests for tier metadata and certificate UI/store wiring

### Changed

- Commit creation now rejects empty, vague, or too-short messages before a commit is recorded
- Basic pre-commit and commit-msg hook simulation now blocks commits when hook files are present and configured to fail
- Objectives sidebar now includes a visible tier note above repo setup guidance

### Test Coverage

- Added `tests/tier-certificates.test.js`
- Expanded lesson and curriculum integrity tests to verify tier metadata and capstone coverage

## 2026-03-11 - Narrative Campaign and Cinematic Intro Pass

### Added

- Cinematic opening crawl with:
  - replay support
  - `Esc` skip
  - automatic replay after `Reset Game`
- Mentor character (`Archivist Vega`) and per-level guardian/boss story metadata
- Lesson intro cadence guidance that separates environment-wide, repository-wide, and branch/workflow-specific habits
- Virtual `~/.gitconfig` mirror for course-wide global settings and alias discovery
- Story-driven guide briefing block in level intro playback modal
- Chapter transition lore in level completion modal
- Explicit late-game teaser hooks for a future GitHub/GitLab/Gitea follow-up course

### Changed

- Story arc upgraded from light flavor text to a full chapter framework across all 10 levels
- Guardians and bosses now use more characterful humanoid presentation
- Level 9-10 content now conceptually frames remotes, repository hosting, review workflows, and change management as the next learning frontier
- `Replay Intro` is now available as a lightweight icon-plus-text control without adding heavy permanent UI chrome
- `Reset Game` now preserves global Git environment settings instead of wiping them

### Test Coverage

- Expanded story arc validation for:
  - mentor metadata
  - guardian coverage across all chapters
  - opening crawl content
  - sequel teaser coverage in late-game chapters
- Expanded curriculum integrity checks for hosted-platform teaser content in Levels 9-10

## 2026-03-03 - Major Realism, Progression, and UX Overhaul

### Added

- Real in-browser Git engine behavior for core workflows:
  - `config`, `init`, `add`, `status`, `commit`, `log`, `branch`, `switch`, `checkout`, `merge`
  - advanced graph-backed flows for `stash`, `reset`, `rebase`, `cherry-pick`
- ANSI terminal support via `xterm.js`
- Storage module split:
  - `configStore`
  - `repoStore`
  - `lessonStore`
- Repo helper module (`repo-model.js`)
- Strict objective rules across all 10 levels (`objective-rules.js`)
- Story arc system with per-level mission framing (`story-arc.js`)
- Guided command intro modal per level (play/pause/replay/start)
- Post-command contextual hint toasts
- Dedicated integration harness page (`tests/integration.html`)
- Cross-origin-safe postMessage test bridge (`js/test-bridge.js`)
- Reset controls:
  - `Reset Level`
  - `Reset Game`
- Prepared scenario seeding for all lessons, including pre-diverged conflict setup for Level 4

### Changed

- Objective completion now uses strict state checks first, fallback heuristics only when no strict rule is defined.
- Level progression baselines now track per-level activity (commits/merges/branch work) to prevent carry-over bypasses.
- Merge Monster overlay now minimizes after timed intro and keeps terminal control available.
- Level 4 conflict flow is now manual marker resolution by design (`cat`/`nano`/edit/add/commit).

### Fixed

- Reload/resume persistence issues wiping level/repo context.
- False positives for early objective completion (`git init`, staged state checks).
- Integration harness cross-origin access failure on `file://` usage.
- Rebase objective edge case where no-op path could block level completion flags.
- Boss encounter input blocking terminal execution.

### Test Coverage

- Added/updated core test suites:
  - objective rule validation
  - lesson scenario integrity
  - story arc coverage
- Unified runner:
  - `./tests/run-all.sh`

### Notes

This release emphasizes educational realism, anti-shortcut progression integrity, and stronger onboarding/UX.
A future release will introduce a dedicated repository management mode with explicit pull request review scenarios.

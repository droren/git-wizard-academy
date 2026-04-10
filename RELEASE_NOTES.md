# Release Notes

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

# Release Notes

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

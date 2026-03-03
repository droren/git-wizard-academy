// js/lesson-guides.js
/**
 * Guided command demos and hint helpers for each level.
 */

(function () {
    const demos = {
        0: {
            title: 'Initiate the Timeline',
            subtitle: 'Configure identity, initialize repo, stage, and commit.',
            steps: [
                { cmd: 'git config --global user.name "Arc Hero"', out: '' },
                { cmd: 'git config --global user.email "hero@academy.dev"', out: '' },
                { cmd: 'git init', out: 'Initialized empty Git repository in .git/' },
                { cmd: 'echo "Hello World" > hello.txt', out: '' },
                { cmd: 'git add hello.txt', out: 'Added 1 file(s)' },
                { cmd: 'git commit -m "First commit"', out: '[main abc1234] First commit' }
            ]
        },
        1: {
            title: 'Read the Three States',
            subtitle: 'Use status and multiple commits to understand workflow.',
            steps: [
                { cmd: 'echo "draft" > draft.txt', out: '' },
                { cmd: 'git add draft.txt', out: 'Added 1 file(s)' },
                { cmd: 'git status', out: 'Changes to be committed:\n  new file:   draft.txt' },
                { cmd: 'git commit -m "Add draft"', out: '[main def5678] Add draft' },
                { cmd: 'git log --oneline', out: 'def5678 Add draft' }
            ]
        },
        2: {
            title: 'Split and Rejoin Timelines',
            subtitle: 'Branch, switch, commit on both lines, then merge.',
            steps: [
                { cmd: 'git switch -c feature', out: "Switched to a new branch 'feature'" },
                { cmd: 'echo "feature" > feature.txt', out: '' },
                { cmd: 'git add feature.txt', out: 'Added 1 file(s)' },
                { cmd: 'git commit -m "feature work"', out: '[feature fed1111] feature work' },
                { cmd: 'git switch main', out: "Switched to branch 'main'" },
                { cmd: 'git merge feature', out: "Merge made by the 'ort' strategy." }
            ]
        },
        3: {
            title: 'Merge Monster Drill',
            subtitle: 'Prepared branches are already diverged. Inspect history, merge, resolve intentionally.',
            steps: [
                { cmd: 'git log --oneline', out: '... prepared branch history ...' },
                { cmd: 'git branch', out: '* main\n  feature' },
                { cmd: 'git switch main', out: "Switched to branch 'main'" },
                { cmd: 'git merge feature', out: 'CONFLICT (content): Merge conflict in app.js' },
                { cmd: 'cat app.js', out: '<<<<<<< main\n...\n=======\n...\n>>>>>>> feature' },
                { cmd: '# Open Resolve Conflict button for side-by-side choices', out: '' },
                { cmd: 'git add app.js && git commit -m "Resolve merge conflict"', out: '[main 1234abc] Resolve merge conflict' }
            ]
        }
    };

    function getDemo(levelIndex) {
        return demos[levelIndex] || {
            title: 'Mission Briefing',
            subtitle: 'Use the objectives panel and command hints to complete this level.',
            steps: [
                { cmd: 'git status', out: 'Inspect the state before acting.' },
                { cmd: 'git log --oneline', out: 'Read the history and plan your next move.' }
            ]
        };
    }

    function getHint(levelIndex, input, result, state) {
        const text = String(input || '').trim();
        const lower = text.toLowerCase();

        if (result && result.success === false) {
            if (lower.startsWith('git merge')) return 'Hint: run `git log --oneline` and inspect conflict markers before resolving.';
            if (lower.startsWith('git commit')) return 'Hint: stage your changes first with `git add <file>`.';
            if (lower.startsWith('git rebase')) return 'Hint: stash or commit pending changes before rebasing.';
            return 'Hint: read the command output carefully; it usually tells the next step.';
        }

        if (lower.startsWith('git init')) return 'Good start. Next: create a file, then `git add` and `git commit`.';
        if (lower.startsWith('git add')) return 'Staged. Run `git status` to verify, then commit.';
        if (lower.startsWith('git commit')) return 'Commit recorded. Use `git log --oneline` to inspect history.';
        if (lower.startsWith('git branch') || lower.startsWith('git switch') || lower.startsWith('git checkout')) return 'Great. Make at least one commit per active branch before merging.';
        if (lower.startsWith('git merge') && result && result.success) return 'Merge succeeded. Verify with `git log --oneline` and `git status`.';

        if (state && state.gitState && state.gitState.mergeInProgress) {
            return 'Conflict active: inspect markers with `cat app.js`, edit via `nano app.js`, then `git add app.js` and commit.';
        }

        return '';
    }

    window.lessonGuides = {
        getDemo,
        getHint
    };
})();

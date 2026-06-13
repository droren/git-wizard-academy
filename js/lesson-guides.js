// js/lesson-guides.js
/**
 * Guided command demos and hint helpers for each level.
 */

(function () {
    const demos = {
        0: {
            title: 'Initiate the Timeline',
            subtitle: 'Set identity in Git, step into your project folder, then initialize, stage, and commit.',
            steps: [
                { cmd: 'pwd', out: '/home/gitwizard' },
                { cmd: 'ls -al', out: '.gitconfig  projects/' },
                { cmd: 'cd ~/projects/level-1', out: '' },
                { cmd: 'git config --global user.name "Arc Hero"', out: '' },
                { cmd: 'git config --global user.email "hero@academy.dev"', out: '' },
                { cmd: 'git init', out: 'Initialized empty Git repository in .git/' },
                { cmd: 'ls -a', out: '.git/  .gitignore  README.md' },
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
                { cmd: 'echo "refine" >> app.js', out: '' },
                { cmd: 'git add app.js && git commit -m "Refine app"', out: '[main 2345def] Refine app' },
                { cmd: 'git log --oneline', out: '2345def Refine app' }
            ]
        },
        2: {
            title: 'Split and Rejoin Timelines',
            subtitle: 'Branch, switch, commit on both lines, then merge.',
            steps: [
                { cmd: 'git switch -c feature', out: "Switched to a new branch 'feature'" },
                { cmd: 'echo "feature" > feature.txt', out: '' },
                { cmd: 'git add feature.txt && git commit -m "feature work"', out: '[feature fed1111] feature work' },
                { cmd: 'git switch main', out: "Switched to branch 'main'" },
                { cmd: 'echo "main" >> app.js', out: '' },
                { cmd: 'git add app.js && git commit -m "main tune"', out: '[main 7890abc] main tune' },
                { cmd: 'git merge feature', out: "Merge made by the 'ort' strategy." }
            ]
        },
        3: {
            title: 'Merge Conflict Boss',
            subtitle: 'Prepared branches are already diverged. Inspect history, merge, then resolve the Goblin King by hand.',
            steps: [
                { cmd: 'git branch', out: '* main\n  feature' },
                { cmd: 'git log --oneline', out: '... pre-diverged history on main and feature ...' },
                { cmd: 'git merge feature', out: 'CONFLICT (content): Merge conflict in app.js' },
                { cmd: 'cat app.js', out: '<<<<<<< main\n...\n=======\n...\n>>>>>>> feature' },
                { cmd: 'nano app.js', out: 'Edit manually: keep const mode = "merged"; console.log(mode + " timeline");' },
                { cmd: 'git add app.js && git commit -m "Resolve merge conflict"', out: '[main 1234abc] Resolve merge conflict' }
            ]
        },
        4: {
            title: 'Archive and Release',
            subtitle: 'Stash interrupted work, inspect stashes, apply, then tag a release.',
            steps: [
                { cmd: 'echo "WIP" >> app.js', out: '' },
                { cmd: 'git stash', out: 'Saved working directory and index state WIP on main' },
                { cmd: 'git stash list', out: 'stash@{0}: WIP on main: ...' },
                { cmd: 'git stash pop', out: 'Dropped refs/stash@{0} (restored files)' },
                { cmd: 'git tag -a v1.0.0 -m "First release"', out: '[ tagged v1.0.0 ]' },
                { cmd: 'git log --oneline', out: '... compact history ...' }
            ]
        },
        5: {
            title: 'Shadow Rewrites',
            subtitle: 'Compare merge/rebase, then perform basic and interactive rebase.',
            steps: [
                { cmd: 'git switch main', out: "Switched to branch 'main'" },
                { cmd: 'git merge feature', out: "Merge made by the 'ort' strategy." },
                { cmd: 'git switch feature', out: "Switched to branch 'feature'" },
                { cmd: 'git rebase main', out: 'Successfully rebased and updated refs/heads/feature' },
                { cmd: 'git rebase -i HEAD~2', out: 'Successfully rebased and edited 2 commit(s)' }
            ]
        },
        6: {
            title: 'Recover the Lost Timeline',
            subtitle: 'Use reflog and safe reset modes to recover confidently.',
            steps: [
                { cmd: 'git reflog', out: 'HEAD@{0} ...\nHEAD@{1} ...' },
                { cmd: 'git reset --soft HEAD~1', out: 'HEAD is now at ...' },
                { cmd: 'git reset HEAD', out: 'Unstaged changes after reset' }
            ]
        },
        7: {
            title: 'Precision Operations',
            subtitle: 'Cherry-pick exact fixes and run bisect to locate regressions.',
            steps: [
                { cmd: 'git switch hotfix', out: "Switched to branch 'hotfix'" },
                { cmd: 'git switch main', out: "Switched to branch 'main'" },
                { cmd: 'git cherry-pick <hotfix-commit>', out: '[main 9abc123] Fix critical bug' },
                { cmd: 'git bisect start', out: 'Bisect started. Good and bad commits needed.' },
                { cmd: 'git bisect run ./test.sh', out: 'Bisect complete! Found the culprit.' }
            ]
        },
        8: {
            title: 'Reality Shaping Toolkit',
            subtitle: 'Use submodules, hooks, and aliases to strengthen local craft before the hosted-platform frontier.',
            steps: [
                { cmd: 'git submodule add https://example.com/lib.git libs/lib', out: "Submodule 'libs/lib' added" },
                { cmd: 'echo "#!/bin/sh" > .git/hooks/pre-commit', out: '' },
                { cmd: 'git config --global alias.co checkout', out: '' },
                { cmd: 'git config --global alias.br branch', out: '' }
            ]
        },
        9: {
            title: 'Grand Wizard Final Exam',
            subtitle: 'Chain branching, rebase, cherry-pick, and merge to stabilize the world graph before the remote frontier opens.',
            steps: [
                { cmd: 'git switch -c feature', out: "Switched to a new branch 'feature'" },
                { cmd: 'git commit -m "Feature timeline"', out: '[feature ...] Feature timeline' },
                { cmd: 'git switch main', out: "Switched to branch 'main'" },
                { cmd: 'git rebase main', out: 'Successfully rebased and updated refs/heads/feature' },
                { cmd: 'git cherry-pick <hotfix-commit>', out: '[main ...] Hotfix commit' },
                { cmd: 'git merge feature', out: "Merge made by the 'ort' strategy." }
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

        if (state && state.gitState && state.gitState.mergeInProgress && !(state.flags && state.flags.conflictMarkersIdentified)) {
            return 'Conflict active: run `cat app.js` or `nano app.js` to identify markers before resolving.';
        }

        if (result && result.success === false) {
            if (lower.startsWith('git merge')) return 'Hint: inspect history with `git log --oneline`, then inspect conflict markers in the file.';
            if (lower.startsWith('git commit')) return 'Hint: stage your changes first with `git add <file>`. Use `git status` to verify.';
            if (lower.startsWith('git rebase')) return 'Hint: commit/stash pending work, then re-run rebase.';
            return 'Hint: read the command output carefully; it usually tells the next step.';
        }

        if (lower.startsWith('git init')) return 'Good start. Next: create a file, then `git add` and `git commit`.';
        if (lower.startsWith('git add')) return 'Staged. Run `git status` to verify, then commit.';
        if (lower.startsWith('git commit')) return 'Commit recorded. Use `git log --oneline` to inspect history.';
        if (lower.startsWith('git branch') || lower.startsWith('git switch') || lower.startsWith('git checkout')) return 'Great. Make at least one commit per active branch before merging.';
        if (lower.startsWith('git merge') && result && result.success) return 'Merge succeeded. Verify with `git log --oneline` and `git status`.';

        if (state && state.gitState && state.gitState.mergeInProgress) {
            return 'Resolve manually: edit conflict markers in `nano app.js`, then `git add app.js` and `git commit`.';
        }

        return '';
    }

    window.lessonGuides = {
        getDemo,
        getHint
    };
})();

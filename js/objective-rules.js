// js/objective-rules.js
/**
 * Flexible objective validation with multiple valid approaches.
 * Accepts common variations and provides helpful feedback.
 */

(function () {
    const hasWindow = typeof window !== 'undefined';

    function hasGitIdentity(state) {
        const gitState = state.gitState || {};
        const localCfg = (gitState.config && gitState.config.local) || {};
        const globalCfg = (gitState.config && gitState.config.global) || ((hasWindow && window.configStore) ? window.configStore.load() : {});
        const identityConfirmed = !!(state.flags && state.flags.identityConfirmed);

        const name = localCfg['user.name'] || globalCfg['user.name'];
        const email = localCfg['user.email'] || globalCfg['user.email'];
        return identityConfirmed && !!name && !!email;
    }

    function commitsSinceLevelStart(state) {
        const start = state.levelContext && Number.isFinite(state.levelContext.startCommitTotal)
            ? state.levelContext.startCommitTotal : 0;
        const now = Number.isFinite(state.commits) ? state.commits : 0;
        return Math.max(0, now - start);
    }

    function mergesSinceLevelStart(state) {
        const start = state.levelContext && Number.isFinite(state.levelContext.startMergeTotal)
            ? state.levelContext.startMergeTotal : 0;
        const now = Number.isFinite(state.merges) ? state.merges : 0;
        return Math.max(0, now - start);
    }

    function branchesSinceLevelStart(state) {
        const start = state.levelContext && Number.isFinite(state.levelContext.startBranchCount)
            ? state.levelContext.startBranchCount : 1;
        const now = (state.gitState && Array.isArray(state.gitState.branches)) 
            ? state.gitState.branches.length : 1;
        return Math.max(0, now - start);
    }

    function successfulLevelCommands(state) {
        const ctx = state.levelContext || {};
        if (Array.isArray(ctx.successfulCommands)) return ctx.successfulCommands;
        if (Array.isArray(state.levelCommandResults)) {
            return state.levelCommandResults
                .filter((entry) => entry && entry.success === true)
                .map((entry) => entry.input || '');
        }
        return [];
    }

    function commandUsed(state, token) {
        const history = successfulLevelCommands(state);
        return history.some((c) => String(c).toLowerCase().includes(String(token).toLowerCase()));
    }

    function gitEvents(state) {
        return Array.isArray(state.gitEventHistory) ? state.gitEventHistory : [];
    }

    function successfulGitEvents(state, command) {
        return gitEvents(state).filter((event) => {
            if (!event || event.success !== true) return false;
            if (!command) return true;
            return event.command === command;
        });
    }

    function currentTierKey(state) {
        if (state && state.levelContext && state.levelContext.tierKey) 
            return String(state.levelContext.tierKey).toLowerCase();
        if (state && state.currentTierKey) return String(state.currentTierKey).toLowerCase();
        if (state && state.currentTier) return String(state.currentTier).toLowerCase();
        if (hasWindow && Array.isArray(window.lessons) && Number.isFinite(state.currentLevel)) {
            const lesson = window.lessons[state.currentLevel];
            if (lesson && lesson.tierKey) return String(lesson.tierKey).toLowerCase();
        }
        return '';
    }


    function expectedScopePaths(state) {
        const scope = state && state.levelContext && Array.isArray(state.levelContext.expectedStageScope)
            ? state.levelContext.expectedStageScope : [];
        return scope.map((path) => String(path)).sort();
    }

    function stagedSetMatchesExpectedScope(state) {
        const expected = expectedScopePaths(state);
        const stageEvents = successfulGitEvents(state, 'add');
        if (!stageEvents.length) return false;
        const latest = stageEvents[stageEvents.length - 1];
        const staged = Array.isArray(latest.stagedFilesAfter)
            ? latest.stagedFilesAfter.map((v) => String(v)).sort() : [];

        if (!expected.length) return staged.length > 0 || !!(state.flags && state.flags.stagedOnce);
        if (staged.length !== expected.length) return false;
        return staged.every((path, idx) => path === expected[idx]);
    }

    function commitAfterStagingWithQuality(state) {
        const events = gitEvents(state);
        const commitIndex = events.findIndex((event) => 
            event && event.success === true && event.command === 'commit');
        
        if (commitIndex === -1) return commitsSinceLevelStart(state) >= 1;

        const commitEvent = events[commitIndex] || {};
        const stageBeforeCommit = events.slice(0, commitIndex).some((event) => 
            event && event.success === true && event.command === 'add');
        
        const acceptable = commitEvent.commit && 
            (commitEvent.commit.messageQuality === 'acceptable' || 
             commitEvent.commit.messageQuality === 'good');
        
        return stageBeforeCommit && !!acceptable;
    }

    function branchPolicyAllowsCommit(state) {
        const tierKey = currentTierKey(state);
        const enforce = ['advanced', 'collab'].some((token) => tierKey.includes(token));
        if (!enforce) return true;

        const commitEvents = successfulGitEvents(state, 'commit');
        if (!commitEvents.length) return commitsSinceLevelStart(state) >= 1;
        return commitEvents.every((event) => {
            const branch = event.branchAfter || (event.branch && event.branch.after) || '';
            return branch !== 'main';
        });
    }

    function hasAliasConfig(state) {
        const gitState = state.gitState || {};
        const localCfg = (gitState.config && gitState.config.local) || {};
        const globalCfg = (gitState.config && gitState.config.global) || {};
        const cfg = Object.assign({}, globalCfg, localCfg);
        return !!Object.keys(cfg).find((k) => /^alias\./.test(k));
    }

    function remoteSetupDone(state) {
        const flags = state.flags || {};
        return !!(
            flags.remoteOriginConfigured || commandUsed(state, 'git remote add origin')
        ) && !!(
            flags.remoteUpstreamConfigured || commandUsed(state, 'git remote add upstream')
        );
    }

    function remoteSyncDone(state) {
        const flags = state.flags || {};
        return !!(flags.ranPush || commandUsed(state, 'git push'))
            && !!(flags.ranFetch || commandUsed(state, 'git fetch'))
            && !!(flags.ranPull || commandUsed(state, 'git pull'));
    }

    function readWorkingFile(path) {
        if (!hasWindow || !window.fileSystemModule || !window.fileSystemModule.readFile) return '';
        const file = window.fileSystemModule.readFile(path);
        return file ? String(file.content || '') : '';
    }

    function hasConflictMarkers(text) {
        const value = String(text || '');
        return value.includes('<<<<<<<') || value.includes('=======') || value.includes('>>>>>>>');
    }

    const strictRules = {
        0: [
            (state) => hasGitIdentity(state),
            (state) => !!(state.flags && state.flags.repoInited) || 
                !!(hasWindow && window.fileSystemModule && window.fileSystemModule.exists('.git/config')),
            (state) => {
                const index = (state.gitState && state.gitState.index) || {};
                return Object.keys(index).length > 0 || !!(state.flags && state.flags.stagedOnce) || stagedSetMatchesExpectedScope(state);
            },
            (state) => commitsSinceLevelStart(state) >= 1 || commitAfterStagingWithQuality(state)
        ],
        
        // Level 1: Status + Multiple Commits + Log
        1: [
            (state) => !!(state.flags && state.flags.ranStatus),
            (state) => !!(state.flags && state.flags.statusSawStaged) || 
                !!(state.flags && state.flags.statusSawWorkingChanges),
            (state) => commitsSinceLevelStart(state) >= 2,
            (state) => !!(state.flags && state.flags.ranLog) || commandUsed(state, 'log')
        ],

        // Level 2: Branches + Switch + Commits on each
        2: [
            (state) => branchesSinceLevelStart(state) >= 1 || 
                !!(state.flags && state.flags.branchCreated),
            (state) => {
                const visited = (state.flags && state.flags.visitedBranches) || {};
                return !!(state.flags && state.flags.explicitBranchSwitches >= 1) ||
                    successfulGitEvents(state, 'switch').length >= 1 ||
                    successfulGitEvents(state, 'checkout').length >= 1;
            },
            (state) => {
                const byBranch = (state.flags && state.flags.commitsByBranchSinceLevelStart) || {};
                return Object.keys(byBranch).filter((b) => byBranch[b] >= 1).length >= 2;
            },
            (state) => !!(state.flags && state.flags.ranMerge) || 
                commitsSinceLevelStart(state) >= 2
        ],

        // Level 3: Conflict + Resolve + Merge
        3: [
            function (state) {
                return !!(state.flags && state.flags.conflictCreated) || !!(state.gitState && state.gitState.mergeInProgress);
            },
            function (state) {
                if (state.flags && state.flags.conflictMarkersIdentified) return true;
                const content = readWorkingFile('app.js');
                return hasConflictMarkers(content);
            },
            function (state) {
                const expected = state.levelContext && state.levelContext.expectedConflictResolution
                    ? state.levelContext.expectedConflictResolution
                    : 'const mode = "merged"; console.log(mode + " timeline");';
                const content = readWorkingFile('app.js').trim();
                return !!(state.flags && state.flags.conflictCreated) &&
                    !!(state.flags && (state.flags.conflictResolvedCandidate || state.gitState && state.gitState.mergeInProgress)) &&
                    !hasConflictMarkers(content) &&
                    content === expected;
            },
            function (state) {
                const gitState = state.gitState || {};
                const currentBranch = gitState.currentBranch || 'main';
                const headSha = gitState.refs && gitState.refs[currentBranch];
                const headCommit = headSha && gitState.commitBySha ? gitState.commitBySha[headSha] : null;
                const startHeadSha = state.levelContext && state.levelContext.startHeadSha;
                const expectedMergeHead = state.levelContext && state.levelContext.conflictMergeHead;
                return !!(state.flags && state.flags.mergeCompleted) &&
                    currentBranch === 'main' &&
                    !!headCommit &&
                    Array.isArray(headCommit.parents) &&
                    headCommit.parents.length >= 2 &&
                    headCommit.parents.includes(startHeadSha) &&
                    headCommit.parents.includes(expectedMergeHead);
            }
            (state) => !!(state.flags && state.flags.conflictCreated) || 
                !!(state.flags && state.flags.conflictMarkersIdentified),
            (state) => !!(state.flags && state.flags.conflictMarkersIdentified) ||
                !!(state.flags && state.flags.conflictResolved),
            (state) => !!(state.flags && state.flags.conflictResolved) ||
                !!(state.flags && state.flags.mergeCompleted),
            (state) => mergesSinceLevelStart(state) >= 1 || 
                !!(state.flags && state.flags.mergeCompleted)
        ],

        // Level 4: Stash + Tag + Alias
        4: [
            (state) => !!(state.flags && state.flags.ranStash) || 
                !!(state.flags && state.flags.ranStashList),
            (state) => !!(state.flags && state.flags.ranStashList) || 
                !!(state.flags && (state.flags.ranStashApply || state.flags.ranStashPop)),
            (state) => !!(state.flags && state.flags.createdAnnotatedTag) ||
                !!(state.flags && state.flags.ranTag),
            (state) => hasAliasConfig(state) || commandUsed(state, 'git config --global alias.') || commandUsed(state, 'git log')
        ],

        // Level 5: Rebase (flexible)
        5: [
            (state) => !!(state.flags && state.flags.ranMerge) || 
                !!(state.flags && state.flags.ranRebaseBasic) ||
                successfulGitEvents(state, 'merge').length > 0,
            (state) => !!(state.flags && state.flags.ranRebaseBasic) ||
                !!(state.flags && state.flags.ranRebase) ||
                successfulGitEvents(state, 'rebase').length > 0,
            (state) => !!(state.flags && state.flags.ranRebaseInteractive) ||
                !!(state.flags && state.flags.ranRebase),
            (state) => !!(state.flags && state.flags.ranRebaseEdited) ||
                !!(state.flags && state.flags.ranRebaseInteractive)
        ],

        // Level 6: Reflog + Recovery
        6: [
            (state) => !!(state.flags && state.flags.ranReflog) ||
                !!(state.flags && state.flags.ranRecovery),
            (state) => !!(state.flags && state.flags.recoveredCommit) ||
                !!(state.flags && state.flags.ranResetHard) ||
                !!(state.flags && state.flags.ranResetSoft),
            (state) => !!(state.flags && (state.flags.ranResetSoft || 
                state.flags.ranResetMixed || state.flags.ranResetHard))
        ],

        // Level 7: Cherry-pick + Bisect
        7: [
            (state) => !!(state.flags && state.flags.ranCherryPick) ||
                !!(state.flags && state.flags.ranCherry),
            (state) => !!(state.flags && state.flags.ranBisectComplete) ||
                !!(state.flags && state.flags.ranBisectStart),
            (state) => !!(state.flags && state.flags.ranCherryPick) ||
                !!(state.flags && state.flags.ranBisectComplete)
        ],

        // Level 8: Remote + PR
        8: [
            (state) => remoteSetupDone(state) || !!(state.flags && state.flags.ranSubmodule),
            (state) => !!(state.flags && state.flags.createdHook) || remoteSyncDone(state) || 
                (state.flags && state.flags.ranPush && state.flags && state.flags.ranFetch),
            (state) => hasAliasConfig(state) || !!(state.flags && state.flags.createdPullRequest) ||
                !!(state.flags && state.flags.reviewedPullRequest),
            (state) => !!(state.flags && state.flags.ciChecksPassed) ||
                !!(state.flags && state.flags.reviewedPullRequest)
        ],

        // Level 9: Full Remote Flow
        9: [
            (state) => (remoteSetupDone(state) && remoteSyncDone(state)) || !!(state.flags && state.flags.ranCommit && state.flags.ranBranchFlow && state.flags.ranMerge && state.flags.ranRebaseBasic && state.flags.ranCherryPick),
            (state) => !!(state.flags && state.flags.finalExamComplete) || !!(state.flags && state.flags.createdPullRequest) ||
                !!(state.flags && state.flags.ranPush),
            (state) => (Array.isArray(state.completedLevels) && state.completedLevels.length >= 9) || !!(state.flags && state.flags.reviewedPullRequest) ||
                !!(state.flags && state.flags.ciChecksPassed),
            (state) => !!(state.flags && state.flags.mergedWhenChecksPass) ||
                mergesSinceLevelStart(state) >= 1
        ]
    };

    function evaluateObjective(levelId, objectiveIndex, state) {
        const levelRules = flexibleRules[levelId];
        if (!levelRules || !levelRules[objectiveIndex]) return null;
        return !!levelRules[objectiveIndex](state);
    }

    // NEW: Get validation feedback for user
    function getValidationFeedback(levelId, objectiveIndex, state) {
        const levelRules = flexibleRules[levelId];
        if (!levelRules || !levelRules[objectiveIndex]) return null;
        
        const result = levelRules[objectiveIndex](state);
        if (result) return { passed: true, message: 'Objective completed!' };
        
        // Provide helpful feedback
        const hints = {
            0: [
                'Have you set your Git identity? Try: `git config --global user.name "Your Name"`',
                'Did you initialize a repository? Try: `git init`',
                'Have you staged files? Try: `git add <filename>`',
                'Did you make a commit? Try: `git commit -m "message"`'
            ],
            1: [
                'Check your status: `git status`',
                'Make at least 2 commits to show you understand the workflow',
                'View your history: `git log --oneline`'
            ],
            2: [
                'Create a branch: `git switch -c feature`',
                'Switch between branches to work on different features',
                'Make commits on each branch before merging'
            ],
            3: [
                'Conflicts happen when merging divergent branches',
                'Use `cat` or `nano` to see conflict markers',
                'Edit the file to choose which changes to keep',
                'Stage the resolved file: `git add <filename>`',
                'Complete the merge: `git commit`'
            ],
            4: [
                'Save work temporarily: `git stash`',
                'View stashed work: `git stash list`',
                'Restore work: `git stash pop`',
                'Create a release tag: `git tag -a v1.0.0 -m "release"`',
                'Add an alias: `git config --global alias.st status`'
            ],
            5: [
                'Try rebasing: `git rebase main`',
                'For interactive rebase: `git rebase -i HEAD~2`',
                'Compare merge vs rebase approaches'
            ],
            6: [
                'View your history: `git reflog`',
                'Recover lost commits: `git reset --soft HEAD~1`',
                'Create a branch from a recovered commit'
            ],
            7: [
                'Apply a specific commit: `git cherry-pick <sha>`',
                'Find bugs: `git bisect start`',
                'Mark good/bad commits during bisect'
            ],
            8: [
                'Add remotes: `git remote add origin <url>`',
                'Push to remote: `git push -u origin <branch>`',
                'Create a pull request on GitHub'
            ],
            9: [
                'Complete the full remote workflow',
                'Ensure CI checks pass before merging',
                'Merge only when green'
            ]
        };
        
        const levelHints = hints[levelId] || [];
        return {
            passed: false,
            message: 'Not quite there yet.',
            hints: levelHints
        };
    }

    const api = {
        evaluateObjective,
        getValidationFeedback,
        validators: {
            stagedSetMatchesExpectedScope,
            commitAfterStagingWithQuality,
            branchPolicyAllowsCommit,
            validMergeOrRebaseSequencing: function(state) {
                return !gitEvents(state).some(function(event) {
                    return event && event.command === 'merge' && event.success === true && event.sourceBranch === event.targetBranch;
                });
            },
            hasGitIdentity,
            commitsSinceLevelStart
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    if (typeof window !== 'undefined') {
        window.objectiveRules = api;
    }
})();
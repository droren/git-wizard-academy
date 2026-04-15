// js/objective-rules.js
/**
 * Strict objective validation rules.
 * Exported for browser runtime and Node test usage.
 */

(function () {
    const hasWindow = typeof window !== 'undefined';
    const BRANCH_PROTECTED_TIERS = ['advanced', 'collab'];

    function hasGitIdentity(state) {
        const gitState = state.gitState || {};
        const localCfg = (gitState.config && gitState.config.local) || {};
        const globalCfg = (gitState.config && gitState.config.global) || ((hasWindow && window.configStore) ? window.configStore.load() : {});

        const name = localCfg['user.name'] || globalCfg['user.name'];
        const email = localCfg['user.email'] || globalCfg['user.email'];
        return !!name && !!email;
    }

    function commitsSinceLevelStart(state) {
        const start = state.levelContext && Number.isFinite(state.levelContext.startCommitTotal)
            ? state.levelContext.startCommitTotal
            : 0;
        const now = Number.isFinite(state.commits) ? state.commits : 0;
        return Math.max(0, now - start);
    }

    function mergesSinceLevelStart(state) {
        const start = state.levelContext && Number.isFinite(state.levelContext.startMergeTotal)
            ? state.levelContext.startMergeTotal
            : 0;
        const now = Number.isFinite(state.merges) ? state.merges : 0;
        return Math.max(0, now - start);
    }

    function branchesSinceLevelStart(state) {
        const start = state.levelContext && Number.isFinite(state.levelContext.startBranchCount)
            ? state.levelContext.startBranchCount
            : 1;
        const now = (state.gitState && Array.isArray(state.gitState.branches)) ? state.gitState.branches.length : 1;
        return Math.max(0, now - start);
    }

    function commandUsed(state, token) {
        const history = Array.isArray(state.commandHistory) ? state.commandHistory : [];
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
        if (state && state.levelContext && state.levelContext.tierKey) return String(state.levelContext.tierKey).toLowerCase();
        if (state && state.currentTierKey) return String(state.currentTierKey).toLowerCase();
        if (state && state.currentTier) return String(state.currentTier).toLowerCase();
        if (hasWindow && Array.isArray(window.lessons) && Number.isFinite(state.currentLevel)) {
            const lesson = window.lessons[state.currentLevel];
            if (lesson && lesson.tierKey) return String(lesson.tierKey).toLowerCase();
        }
        return '';
    }

    function expectedScopePaths(state) {
        const levelContext = state.levelContext || {};
        const direct = Array.isArray(levelContext.expectedStageScope) ? levelContext.expectedStageScope : null;
        const legacy = Array.isArray(levelContext.expectedStagedFiles) ? levelContext.expectedStagedFiles : null;
        return (direct || legacy || []).map((v) => String(v)).sort();
    }

    function stagedSetMatchesExpectedScope(state) {
        const expected = expectedScopePaths(state);
        const stageEvents = successfulGitEvents(state, 'add');
        if (!stageEvents.length) return false;
        const latest = stageEvents[stageEvents.length - 1];
        const staged = Array.isArray(latest.stagedFilesAfter)
            ? latest.stagedFilesAfter.map((v) => String(v)).sort()
            : [];

        if (!expected.length) return staged.length > 0 || !!(state.flags && state.flags.stagedOnce);
        if (staged.length !== expected.length) return false;
        return staged.every((path, idx) => path === expected[idx]);
    }

    function commitAfterStagingWithQuality(state) {
        const events = gitEvents(state);
        const commitIndex = events.findIndex((event) => event && event.success === true && event.command === 'commit');
        if (commitIndex === -1) return commitsSinceLevelStart(state) >= 1;

        const commitEvent = events[commitIndex] || {};
        const stageBeforeCommit = events.slice(0, commitIndex).some((event) => event && event.success === true && event.command === 'add');
        const acceptable = commitEvent.commit && commitEvent.commit.messageQuality === 'acceptable';
        return stageBeforeCommit && !!acceptable;
    }

    function branchPolicyAllowsCommit(state) {
        const tierKey = currentTierKey(state);
        const enforce = BRANCH_PROTECTED_TIERS.some((token) => tierKey.includes(token));
        if (!enforce) return true;

        const commitEvents = successfulGitEvents(state, 'commit');
        if (!commitEvents.length) return commitsSinceLevelStart(state) >= 1;
        return commitEvents.every((event) => {
            const branch = event.branchAfter || (event.branch && event.branch.after) || '';
            return branch !== 'main';
        });
    }

    function validMergeOrRebaseSequencing(state) {
        const events = gitEvents(state);
        const transitionEvents = events.filter((event) =>
            event &&
            event.success === true &&
            (event.command === 'merge' || event.command === 'rebase')
        );

        if (!transitionEvents.length) {
            return !!(state.flags && state.flags.ranMerge && state.flags.ranRebaseBasic);
        }

        const mergeEvent = transitionEvents.find((event) => event.command === 'merge');
        const rebaseEvent = transitionEvents.find((event) => event.command === 'rebase');
        if (!mergeEvent || !rebaseEvent) return false;

        const mergeSource = mergeEvent.sourceBranch;
        const mergeTarget = mergeEvent.targetBranch || mergeEvent.branchBefore;
        const rebaseUpstream = rebaseEvent.upstreamRef;
        const rebaseBranch = rebaseEvent.targetBranch || rebaseEvent.branchBefore;

        if (!mergeSource || !mergeTarget || mergeSource === mergeTarget) return false;
        if (!rebaseUpstream || !rebaseBranch || rebaseUpstream === rebaseBranch) return false;
        return true;
    }

    function hasAliasConfig(state) {
        const gitState = state.gitState || {};
        const localCfg = (gitState.config && gitState.config.local) || {};
        const globalCfg = (gitState.config && gitState.config.global) || {};
        const cfg = Object.assign({}, globalCfg, localCfg);
        return !!(cfg['alias.co'] || cfg['alias.br'] || cfg['alias.st']);
    }

    const strictRules = {
        0: [
            function (state) {
                return hasGitIdentity(state);
            },
            function (state) {
                return !!(state.flags && state.flags.repoInited) || !!(hasWindow && window.fileSystemModule && window.fileSystemModule.exists('.git/config'));
            },
            function (state) {
                return stagedSetMatchesExpectedScope(state);
            },
            function (state) {
                return commitAfterStagingWithQuality(state) && branchPolicyAllowsCommit(state);
            }
        ],
        1: [
            function (state) {
                return !!(state.flags && state.flags.ranStatus);
            },
            function (state) {
                return !!(state.flags && state.flags.statusSawStaged) && !!(state.flags && state.flags.statusSawWorkingChanges);
            },
            function (state) {
                return commitsSinceLevelStart(state) >= 2;
            },
            function (state) {
                return !!(state.flags && state.flags.ranLog);
            }
        ],
        2: [
            function (state) {
                return branchesSinceLevelStart(state) >= 1 || !!(state.flags && state.flags.branchCreated);
            },
            function (state) {
                const visited = (state.flags && state.flags.visitedBranches) || {};
                const count = Object.keys(visited).length;
                const startBranch = state.levelContext && state.levelContext.startBranchName;
                const returnedToStart = !!(startBranch && visited[startBranch] && count >= 2 && state.flags && state.flags.explicitBranchSwitches >= 2);
                return returnedToStart;
            },
            function (state) {
                const byBranch = (state.flags && state.flags.commitsByBranchSinceLevelStart) || {};
                return Object.keys(byBranch).filter((b) => byBranch[b] >= 1).length >= 2;
            },
            function (state) {
                return mergesSinceLevelStart(state) >= 1 || !!(state.flags && state.flags.mergeCompleted);
            }
        ],
        3: [
            function (state) {
                return !!(state.flags && state.flags.conflictCreated);
            },
            function (state) {
                return !!(state.flags && state.flags.conflictMarkersIdentified);
            },
            function (state) {
                return !!(state.flags && state.flags.conflictResolved);
            },
            function (state) {
                return !!(state.flags && state.flags.mergeCompleted);
            }
        ],
        4: [
            function (state) {
                return !!(state.flags && state.flags.ranStash);
            },
            function (state) {
                return !!(state.flags && state.flags.ranStashList) && !!(state.flags && (state.flags.ranStashApply || state.flags.ranStashPop));
            },
            function (state) {
                return !!(state.flags && state.flags.createdAnnotatedTag);
            },
            function (state) {
                return !!(state.flags && state.flags.ranLog) && commandUsed(state, '--oneline');
            }
        ],
        5: [
            function (state) {
                return validMergeOrRebaseSequencing(state);
            },
            function (state) {
                return !!(state.flags && state.flags.ranRebaseBasic);
            },
            function (state) {
                return !!(state.flags && state.flags.ranRebaseInteractive);
            },
            function (state) {
                return !!(state.flags && state.flags.ranRebaseEdited);
            }
        ],
        6: [
            function (state) {
                return !!(state.flags && state.flags.ranReflog);
            },
            function (state) {
                return !!(state.flags && state.flags.recoveredCommit);
            },
            function (state) {
                return !!(state.flags && (state.flags.ranResetSoft || state.flags.ranResetMixed));
            }
        ],
        7: [
            function (state) {
                return !!(state.flags && state.flags.ranCherryPick);
            },
            function (state) {
                return !!(state.flags && state.flags.ranBisectComplete);
            },
            function (state) {
                const visited = (state.flags && state.flags.visitedBranches) || {};
                return !!(state.flags && state.flags.ranCherryPick) && Object.keys(visited).length >= 2;
            }
        ],
        8: [
            function (state) {
                return !!(state.flags && state.flags.ranSubmodule) || commandUsed(state, 'git submodule');
            },
            function (state) {
                return commandUsed(state, '.git/hooks') || !!(state.flags && state.flags.createdHook);
            },
            function (state) {
                return hasAliasConfig(state);
            }
        ],
        9: [
            function (state) {
                const flags = state.flags || {};
                return !!(flags.ranCommit && flags.ranBranchFlow && flags.ranMerge && flags.ranRebaseBasic && flags.ranCherryPick);
            },
            function (state) {
                return !!(state.flags && state.flags.finalExamComplete);
            },
            function (state) {
                const done = Array.isArray(state.completedLevels) ? state.completedLevels : [];
                return !!(state.flags && state.flags.finalExamComplete) && done.length >= 9;
            }
        ]
    };

    function evaluateObjective(levelId, objectiveIndex, state) {
        const levelRules = strictRules[levelId];
        if (!levelRules || !levelRules[objectiveIndex]) return null;
        return !!levelRules[objectiveIndex](state);
    }

    const api = {
        evaluateObjective,
        validators: {
            stagedSetMatchesExpectedScope,
            commitAfterStagingWithQuality,
            branchPolicyAllowsCommit,
            validMergeOrRebaseSequencing
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    if (typeof window !== 'undefined') {
        window.objectiveRules = api;
    }
})();

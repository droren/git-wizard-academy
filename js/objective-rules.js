// js/objective-rules.js
/**
 * Strict objective validation rules.
 * Exported for browser runtime and Node test usage.
 */

(function () {
    const hasWindow = typeof window !== 'undefined';

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
                const index = (state.gitState && state.gitState.index) || {};
                return Object.keys(index).length > 0 || !!(state.flags && state.flags.stagedOnce);
            },
            function (state) {
                return commitsSinceLevelStart(state) >= 1;
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
                return count >= 2;
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
                return !!(state.flags && state.flags.ranMerge) && !!(state.flags && state.flags.ranRebaseBasic);
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

    const api = { evaluateObjective };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    if (typeof window !== 'undefined') {
        window.objectiveRules = api;
    }
})();

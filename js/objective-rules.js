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

    const strictRules = {
        // Must-Know
        0: [
            (state) => hasGitIdentity(state),
            (state) => !!(state.flags && state.flags.repoInited) || !!(hasWindow && window.fileSystemModule && window.fileSystemModule.exists('.git/config')),
            (state) => {
                const index = (state.gitState && state.gitState.index) || {};
                return Object.keys(index).length > 0 || !!(state.flags && state.flags.stagedOnce);
            },
            (state) => commitsSinceLevelStart(state) >= 1
        ],
        1: [
            (state) => !!(state.flags && state.flags.ranStatus),
            (state) => !!(state.flags && state.flags.statusSawStaged) && !!(state.flags && state.flags.statusSawWorkingChanges),
            (state) => commitsSinceLevelStart(state) >= 2,
            (state) => !!(state.flags && state.flags.ranLog) && commandUsed(state, '--oneline')
        ],

        // Good-to-Know
        2: [
            (state) => branchesSinceLevelStart(state) >= 1 || !!(state.flags && state.flags.branchCreated),
            (state) => {
                const visited = (state.flags && state.flags.visitedBranches) || {};
                return Object.keys(visited).length >= 2 && !!(state.flags && state.flags.explicitBranchSwitches >= 2);
            },
            (state) => {
                const byBranch = (state.flags && state.flags.commitsByBranchSinceLevelStart) || {};
                return Object.keys(byBranch).filter((b) => byBranch[b] >= 1).length >= 2;
            },
            (state) => !!(state.flags && state.flags.ranMerge)
        ],
        3: [
            (state) => !!(state.flags && state.flags.conflictCreated),
            (state) => !!(state.flags && state.flags.conflictMarkersIdentified),
            (state) => !!(state.flags && state.flags.conflictResolved),
            (state) => mergesSinceLevelStart(state) >= 1 || !!(state.flags && state.flags.mergeCompleted)
        ],

        // Template Knight
        4: [
            (state) => !!(state.flags && state.flags.ranStash),
            (state) => !!(state.flags && state.flags.ranStashList) && !!(state.flags && (state.flags.ranStashApply || state.flags.ranStashPop)),
            (state) => !!(state.flags && state.flags.createdAnnotatedTag),
            (state) => hasAliasConfig(state) || commandUsed(state, 'git config --global alias.')
        ],
        5: [
            (state) => !!(state.flags && state.flags.ranMerge) && !!(state.flags && state.flags.ranRebaseBasic),
            (state) => !!(state.flags && state.flags.ranRebaseBasic),
            (state) => !!(state.flags && state.flags.ranRebaseInteractive),
            (state) => !!(state.flags && state.flags.ranRebaseEdited)
        ],

        // Git Wizard
        6: [
            (state) => !!(state.flags && state.flags.ranReflog),
            (state) => !!(state.flags && state.flags.recoveredCommit),
            (state) => !!(state.flags && (state.flags.ranResetSoft || state.flags.ranResetMixed))
        ],
        7: [
            (state) => !!(state.flags && state.flags.ranCherryPick),
            (state) => !!(state.flags && state.flags.ranBisectComplete),
            (state) => {
                const visited = (state.flags && state.flags.visitedBranches) || {};
                return !!(state.flags && state.flags.ranCherryPick) && Object.keys(visited).length >= 2;
            }
        ],

        // Grand Git Wizard
        8: [
            (state) => remoteSetupDone(state),
            (state) => remoteSyncDone(state),
            (state) => !!(state.flags && state.flags.createdPullRequest) && !!(state.flags && state.flags.reviewedPullRequest),
            (state) => !!(state.flags && state.flags.ciChecksPassed)
        ],
        9: [
            (state) => remoteSetupDone(state) && remoteSyncDone(state),
            (state) => !!(state.flags && state.flags.createdPullRequest) && !!(state.flags && state.flags.ranPush),
            (state) => !!(state.flags && state.flags.reviewedPullRequest) && !!(state.flags && state.flags.ciChecksPassed),
            (state) => !!(state.flags && state.flags.mergedWhenChecksPass)
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

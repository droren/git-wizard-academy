// js/git-state.js
// State snapshots shared by command telemetry and future repository-state helpers.
(function() {
    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function captureSnapshot(state) {
        state = state || {};
        return {
            currentBranch: state.currentBranch || null,
            branches: Array.isArray(state.branches) ? state.branches.slice() : [],
            index: clone(state.index || {}),
            mergeInProgress: !!state.mergeInProgress
        };
    }

    window.gitStateTools = { captureSnapshot };
})();

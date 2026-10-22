// js/git-core.js
// Pure-ish primitives shared by the browser Git simulator. Keep command/UI code out.
(function() {
    function getModel() {
        return window.repoModel || {};
    }

    function hashContent(str) {
        const model = getModel();
        if (model.hashContent) return model.hashContent(str);
        str = String(str || '');
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) + str.charCodeAt(i);
            hash = hash >>> 0;
        }
        return hash.toString(16);
    }

    function toSha(seed) {
        const model = getModel();
        if (model.toSha) return model.toSha(seed);
        let hex = hashContent(seed || '0');
        while (hex.length < 40) {
            hex += hashContent(hex + ':' + seed + ':' + hex.length);
        }
        return hex.slice(0, 40);
    }

    function deepClone(value) {
        const model = getModel();
        if (model.deepClone) return model.deepClone(value);
        return JSON.parse(JSON.stringify(value));
    }

    window.gitCore = { hashContent, toSha, deepClone };
})();

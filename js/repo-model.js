// js/repo-model.js
/**
 * Repo model helpers used by command engine.
 */

(function () {
    function hashContent(str) {
        str = String(str || '');
        let h = 5381;
        for (let i = 0; i < str.length; i++) {
            h = ((h << 5) + h) + str.charCodeAt(i);
            h = h >>> 0;
        }
        return h.toString(16);
    }

    function toSha(seed) {
        let hex = hashContent(seed || '0');
        while (hex.length < 40) {
            hex += hashContent(hex + ':' + seed + ':' + hex.length);
        }
        return hex.slice(0, 40);
    }

    function deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function listWorkingFiles(fs) {
        const entries = fs.listDirectory('.');
        const out = {};
        entries.forEach((e) => {
            if (e.type !== 'file' || e.name === '.git') return;
            const file = fs.readFile(e.name);
            const content = file ? String(file.content || '') : '';
            out[e.name] = { content, hash: hashContent(content) };
        });
        return out;
    }

    function getAncestors(commitBySha, startSha) {
        const seen = new Set();
        const queue = [startSha];
        while (queue.length) {
            const sha = queue.shift();
            if (!sha || seen.has(sha)) continue;
            seen.add(sha);
            const commit = commitBySha[sha];
            if (!commit) continue;
            (commit.parents || []).forEach((p) => queue.push(p));
        }
        return seen;
    }

    function findMergeBase(commitBySha, a, b) {
        if (!a || !b) return null;
        const aAnc = getAncestors(commitBySha, a);
        const queue = [b];
        const visited = new Set();

        while (queue.length) {
            const cur = queue.shift();
            if (!cur || visited.has(cur)) continue;
            visited.add(cur);
            if (aAnc.has(cur)) return cur;
            const c = commitBySha[cur];
            if (c) (c.parents || []).forEach((p) => queue.push(p));
        }

        return null;
    }

    window.repoModel = {
        hashContent,
        toSha,
        deepClone,
        listWorkingFiles,
        getAncestors,
        findMergeBase
    };
})();

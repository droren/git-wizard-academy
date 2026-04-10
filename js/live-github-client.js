// js/live-github-client.js
/**
 * Browser-side client for the Live GitHub Mode bridge.
 * Keeps GitHub credentials and API calls behind a local Node process.
 */

(function () {
    function createClient(baseUrl) {
        const root = String(baseUrl || 'http://127.0.0.1:31556').replace(/\/$/, '');

        async function request(pathname, options) {
            const res = await fetch(root + pathname, Object.assign({
                headers: {
                    'Content-Type': 'application/json'
                }
            }, options || {}));
            const text = await res.text();
            let payload = null;
            try {
                payload = text ? JSON.parse(text) : {};
            } catch (err) {
                payload = { ok: false, error: text };
            }
            if (!res.ok) {
                const error = new Error(payload && payload.error ? payload.error : res.statusText || 'Live GitHub request failed');
                error.status = res.status;
                error.payload = payload;
                throw error;
            }
            return payload;
        }

        return {
            baseUrl: root,
            health: function () {
                return request('/health', { method: 'GET' });
            },
            session: function () {
                return request('/session', { method: 'GET' });
            },
            connect: function (payload) {
                return request('/auth', {
                    method: 'POST',
                    body: JSON.stringify(payload || {})
                });
            },
            logout: function () {
                return request('/logout', { method: 'POST', body: '{}' });
            },
            createRepo: function (payload) {
                return request('/repo/create', {
                    method: 'POST',
                    body: JSON.stringify(payload || {})
                });
            },
            bootstrapRepo: function (payload) {
                return request('/repo/bootstrap', {
                    method: 'POST',
                    body: JSON.stringify(payload || {})
                });
            },
            push: function (payload) {
                return request('/push', {
                    method: 'POST',
                    body: JSON.stringify(payload || {})
                });
            },
            fetch: function (payload) {
                return request('/fetch', {
                    method: 'POST',
                    body: JSON.stringify(payload || {})
                });
            },
            pull: function (payload) {
                return request('/pull', {
                    method: 'POST',
                    body: JSON.stringify(payload || {})
                });
            },
            installWorkflow: function (payload) {
                return request('/workflow/install', {
                    method: 'POST',
                    body: JSON.stringify(payload || {})
                });
            },
            createPullRequest: function (payload) {
                return request('/pr/create', {
                    method: 'POST',
                    body: JSON.stringify(payload || {})
                });
            },
            reviewPullRequest: function (payload) {
                return request('/pr/review', {
                    method: 'POST',
                    body: JSON.stringify(payload || {})
                });
            },
            mergePullRequest: function (payload) {
                return request('/pr/merge', {
                    method: 'POST',
                    body: JSON.stringify(payload || {})
                });
            },
            reviewBot: function (payload) {
                return request('/pr/review-bot', {
                    method: 'POST',
                    body: JSON.stringify(payload || {})
                });
            },
            status: function (payload) {
                const query = encodeURIComponent(JSON.stringify(payload || {}));
                return request('/status?payload=' + query, { method: 'GET' });
            }
        };
    }

    window.liveGitHubBridge = createClient('http://127.0.0.1:31556');
})();

// js/export-bridge-client.js
/**
 * Browser client for the local export bridge.
 * Falls back gracefully when the bridge is not running.
 */

(function () {
    const DEFAULT_URL = 'http://127.0.0.1:31555';

    function getBaseUrl() {
        try {
            return localStorage.getItem('gwa_export_bridge_url') || window.GWA_EXPORT_BRIDGE_URL || DEFAULT_URL;
        } catch (e) {
            return DEFAULT_URL;
        }
    }

    async function exportRepo(payload) {
        const baseUrl = getBaseUrl().replace(/\/+$/, '');
        const res = await fetch(baseUrl + '/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload || {})
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
            throw new Error((data && data.error) || ('Export bridge error (' + res.status + ')'));
        }

        if (data.downloadUrl) {
            const downloadUrl = data.downloadUrl.startsWith('http')
                ? data.downloadUrl
                : baseUrl + data.downloadUrl;
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = data.archiveName || 'git-wizard-export.zip';
            document.body.appendChild(a);
            a.click();
            a.remove();
        }

        return data;
    }

    async function health() {
        const baseUrl = getBaseUrl().replace(/\/+$/, '');
        const res = await fetch(baseUrl + '/health', { method: 'GET' });
        return res.ok;
    }

    window.exportRepoBridge = {
        getBaseUrl,
        health,
        exportRepo
    };
})();

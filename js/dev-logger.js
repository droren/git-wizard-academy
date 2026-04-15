// js/dev-logger.js
/**
 * Session-level debug logger for reproducible bug capture.
 */

(function () {
    const DevLogger = {
        logs: [],

        log: function (event, data) {
            const snapshot = (typeof window !== 'undefined' && window.gameState)
                ? JSON.parse(JSON.stringify(window.gameState))
                : {};
            this.logs.push({
                time: new Date().toISOString(),
                event: event,
                data: data || {},
                state: snapshot
            });
        },

        export: function () {
            return JSON.stringify(this.logs, null, 2);
        },

        clear: function () {
            this.logs = [];
        }
    };

    window.DevLogger = DevLogger;
})();

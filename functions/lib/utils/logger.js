"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.LogLevel = void 0;
const Sentry = require("@sentry/node");
const functions = require("firebase-functions");
// Initialize Sentry for Firebase Functions
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.FUNCTIONS_EMULATOR === 'true' ? 'development' : 'production',
        tracesSampleRate: 1.0,
    });
}
var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "debug";
    LogLevel["INFO"] = "info";
    LogLevel["WARN"] = "warn";
    LogLevel["ERROR"] = "error";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
/**
 * Structured logger for Firebase Functions with Sentry integration
 */
exports.logger = {
    /**
     * Log debug messages (only in development)
     */
    debug: (message, context) => {
        if (process.env.FUNCTIONS_EMULATOR === 'true') {
            functions.logger.debug(message, context);
        }
    },
    /**
     * Log informational messages
     */
    info: (message, context) => {
        functions.logger.info(message, context);
        if (process.env.FUNCTIONS_EMULATOR !== 'true') {
            Sentry.captureMessage(message, {
                level: 'info',
                extra: context,
            });
        }
    },
    /**
     * Log warning messages
     */
    warn: (message, context) => {
        functions.logger.warn(message, context);
        if (process.env.FUNCTIONS_EMULATOR !== 'true') {
            Sentry.captureMessage(message, {
                level: 'warning',
                extra: context,
            });
        }
    },
    /**
     * Log error messages and exceptions
     */
    error: (error, context) => {
        const errorObj = typeof error === 'string' ? new Error(error) : error;
        functions.logger.error(errorObj.message, Object.assign(Object.assign({}, context), { stack: errorObj.stack }));
        if (process.env.FUNCTIONS_EMULATOR !== 'true') {
            Sentry.captureException(errorObj, {
                extra: context,
            });
        }
    },
    /**
     * Set user context for error tracking
     */
    setUser: (user) => {
        if (process.env.FUNCTIONS_EMULATOR !== 'true') {
            Sentry.setUser(user);
        }
    },
    /**
     * Clear user context
     */
    clearUser: () => {
        if (process.env.FUNCTIONS_EMULATOR !== 'true') {
            Sentry.setUser(null);
        }
    },
    /**
     * Wrap a Firebase Function with error tracking
     */
    wrapFunction: (functionName, fn) => {
        return (async (...args) => {
            try {
                return await fn(...args);
            }
            catch (error) {
                exports.logger.error(error, { functionName });
                throw error;
            }
        });
    },
};
//# sourceMappingURL=logger.js.map
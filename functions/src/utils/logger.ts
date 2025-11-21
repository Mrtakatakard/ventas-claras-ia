import * as Sentry from '@sentry/node'
import * as functions from 'firebase-functions'

// Initialize Sentry for Firebase Functions
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.FUNCTIONS_EMULATOR === 'true' ? 'development' : 'production',
        tracesSampleRate: 1.0,
    })
}

export enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
}

interface LogContext {
    userId?: string
    functionName?: string
    [key: string]: any
}

/**
 * Structured logger for Firebase Functions with Sentry integration
 */
export const logger = {
    /**
     * Log debug messages (only in development)
     */
    debug: (message: string, context?: LogContext) => {
        if (process.env.FUNCTIONS_EMULATOR === 'true') {
            functions.logger.debug(message, context)
        }
    },

    /**
     * Log informational messages
     */
    info: (message: string, context?: LogContext) => {
        functions.logger.info(message, context)

        if (process.env.FUNCTIONS_EMULATOR !== 'true') {
            Sentry.captureMessage(message, {
                level: 'info',
                extra: context,
            })
        }
    },

    /**
     * Log warning messages
     */
    warn: (message: string, context?: LogContext) => {
        functions.logger.warn(message, context)

        if (process.env.FUNCTIONS_EMULATOR !== 'true') {
            Sentry.captureMessage(message, {
                level: 'warning',
                extra: context,
            })
        }
    },

    /**
     * Log error messages and exceptions
     */
    error: (error: Error | string, context?: LogContext) => {
        const errorObj = typeof error === 'string' ? new Error(error) : error
        functions.logger.error(errorObj.message, { ...context, stack: errorObj.stack })

        if (process.env.FUNCTIONS_EMULATOR !== 'true') {
            Sentry.captureException(errorObj, {
                extra: context,
            })
        }
    },

    /**
     * Set user context for error tracking
     */
    setUser: (user: { id: string; email?: string }) => {
        if (process.env.FUNCTIONS_EMULATOR !== 'true') {
            Sentry.setUser(user)
        }
    },

    /**
     * Clear user context
     */
    clearUser: () => {
        if (process.env.FUNCTIONS_EMULATOR !== 'true') {
            Sentry.setUser(null)
        }
    },

    /**
     * Wrap a Firebase Function with error tracking
     */
    wrapFunction: <T extends (...args: any[]) => any>(
        functionName: string,
        fn: T
    ): T => {
        return (async (...args: Parameters<T>) => {
            try {
                return await fn(...args)
            } catch (error) {
                logger.error(error as Error, { functionName })
                throw error
            }
        }) as T
    },
}

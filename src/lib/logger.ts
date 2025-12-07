import * as Sentry from '@sentry/nextjs'

/**
 * Structured logger for frontend with Sentry integration
 */
export const logger = {
    /**
     * Log informational messages
     */
    info: (message: string, context?: Record<string, any>) => {
        console.info(message, context)
        if (process.env.NODE_ENV === 'production') {
            Sentry.captureMessage(message, {
                level: 'info',
                extra: context,
            })
        }
    },

    /**
     * Log warning messages
     */
    warn: (message: string, context?: Record<string, any>) => {
        console.warn(message, context)
        if (process.env.NODE_ENV === 'production') {
            Sentry.captureMessage(message, {
                level: 'warning',
                extra: context,
            })
        }
    },

    /**
     * Log error messages and exceptions
     */
    error: (error: Error | string, context?: Record<string, any>) => {
        const errorObj = typeof error === 'string' ? new Error(error) : error
        console.error(errorObj, context)

        if (process.env.NODE_ENV === 'production') {
            Sentry.captureException(errorObj, {
                extra: context,
            })
        }
    },

    /**
     * Log debug messages (only in development)
     */
    debug: (message: string, context?: Record<string, any>) => {
        if (process.env.NODE_ENV !== 'production') {
            console.debug(message, context)
        }
    },

    /**
     * Set user context for error tracking
     */
    setUser: (user: { id: string; email?: string; name?: string }) => {
        if (process.env.NODE_ENV === 'production') {
            Sentry.setUser(user)
        }
    },

    /**
     * Clear user context
     */
    clearUser: () => {
        if (process.env.NODE_ENV === 'production') {
            Sentry.setUser(null)
        }
    },
}

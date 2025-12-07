import { logger } from './logger';

/**
 * Basic alert when Sentry error rate exceeds threshold
 * @param errorCount Number of errors detected in the time window
 */
export function checkErrorRate(errorCount: number) {
    const THRESHOLD = 5; // errors per minute

    if (errorCount > THRESHOLD) {
        // Here you could integrate with Firebase Cloud Monitoring or send a Slack webhook
        logger.error(`[ALERT] High Sentry error rate detected: ${errorCount} errors/min`);
    }
}

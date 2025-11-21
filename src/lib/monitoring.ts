/**
 * Simple wrapper to log performance metrics
 * In a real setup, this would integrate with the Firebase Performance Monitoring SDK
 */
export function logMetric(name: string, value: number) {
    if (typeof performance !== "undefined") {
        performance.mark(name);
        // Placeholder for Firebase Performance SDK integration
        // import { getPerformance, trace } from "firebase/performance";
        // const perf = getPerformance();
        // const t = trace(perf, name);
        // t.start();
        // ... work ...
        // t.stop();
    }
}

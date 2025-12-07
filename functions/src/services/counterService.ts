import { db } from '../config/firebase';
import * as functions from 'firebase-functions';

/**
 * Service for managing sequential counters in Firestore.
 * Used for generating invoice numbers, quote numbers, etc.
 */
export const counterService = {
    /**
     * Gets the next sequential number for a given counter type.
     * Uses a Firestore transaction to ensure uniqueness.
     *
     * @param counterType - Type of counter (e.g., 'invoices', 'quotes')
     * @param userId - User ID to scope the counter
     * @param prefix - Optional prefix for the number (e.g., 'INV', 'QT')
     * @param padding - Number of digits to pad (default: 6)
     * @return Formatted number string (e.g., 'INV-000001')
     */
    async getNextNumber(
        counterType: string,
        userId: string,
        prefix: string = '',
        padding: number = 6
    ): Promise<string> {
        const counterRef = db.collection('counters').doc(`${userId}_${counterType}`);

        try {
            const nextValue = await db.runTransaction(async (transaction) => {
                const counterDoc = await transaction.get(counterRef);

                let currentValue = 0;
                if (counterDoc.exists) {
                    currentValue = counterDoc.data()?.current || 0;
                }

                const nextValue = currentValue + 1;

                // Update or create the counter document
                transaction.set(counterRef, {
                    current: nextValue,
                    lastUpdated: new Date(),
                    userId: userId,
                    type: counterType,
                }, { merge: true });

                return nextValue;
            });

            // Format the number with padding
            const paddedNumber = String(nextValue).padStart(padding, '0');
            return prefix ? `${prefix}-${paddedNumber}` : paddedNumber;
        } catch (error) {
            console.error(`Error getting next ${counterType} number:`, error);
            throw new functions.https.HttpsError(
                'internal',
                `Failed to generate ${counterType} number`
            );
        }
    },

    /**
     * Initializes a counter for a user if it doesn't exist.
     * Useful for setting up counters for existing users.
     *
     * @param counterType - Type of counter
     * @param userId - User ID
     * @param startValue - Starting value (default: 0)
     */
    async initializeCounter(
        counterType: string,
        userId: string,
        startValue: number = 0
    ): Promise<void> {
        const counterRef = db.collection('counters').doc(`${userId}_${counterType}`);
        const counterDoc = await counterRef.get();

        if (!counterDoc.exists) {
            await counterRef.set({
                current: startValue,
                lastUpdated: new Date(),
                userId: userId,
                type: counterType,
            });
        }
    },
};

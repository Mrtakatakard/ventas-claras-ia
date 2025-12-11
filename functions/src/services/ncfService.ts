import { db } from '../config/firebase';
import { NCFSequence } from '../types';
import * as functions from 'firebase-functions';

export const ncfService = {
    // Get all active sequences for a user
    getSequences: async (userId: string): Promise<NCFSequence[]> => {
        const snapshot = await db.collection('ncfSequences')
            .where('userId', '==', userId)
            .where('isActive', '==', true)
            .get();

        return snapshot.docs.map(doc => doc.data() as NCFSequence);
    },

    // Create or update a sequence
    createSequence: async (userId: string, data: Omit<NCFSequence, 'id' | 'userId' | 'isActive' | 'updatedAt'>): Promise<string> => {
        const id = db.collection('ncfSequences').doc().id;
        const newSequence: NCFSequence = {
            ...data,
            id,
            userId,
            isActive: true,
            updatedAt: new Date(),
        };

        await db.collection('ncfSequences').doc(id).set(newSequence);
        return id;
    },

    // Get next NCF and increment sequence
    getNextNCF: async (userId: string, typeCode: string): Promise<string> => {
        // If "Sin NCF", return empty string
        if (!typeCode || typeCode === 'Sin NCF') return '';

        return await db.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(
                db.collection('ncfSequences')
                    .where('userId', '==', userId)
                    .where('typeCode', '==', typeCode)
                    .where('isActive', '==', true)
                    .limit(1)
            );

            if (snapshot.empty) {
                // If checking for specific type and not found, throw error
                throw new functions.https.HttpsError('not-found', `No hay secuencia activa para el tipo de NCF: ${typeCode}`);
            }

            const doc = snapshot.docs[0];
            const sequence = doc.data() as NCFSequence;

            if (sequence.currentNumber > sequence.endNumber) {
                throw new functions.https.HttpsError('failed-precondition', `La secuencia de NCF ${sequence.name} (${typeCode}) se ha agotado.`);
            }

            // Expiration check (if applicable)
            if (sequence.expirationDate && new Date(sequence.expirationDate) < new Date()) {
                throw new functions.https.HttpsError('failed-precondition', `La secuencia de NCF ${sequence.name} ha expirado.`);
            }

            // Format: Prefix + 8 digits padded
            const ncf = `${sequence.prefix}${sequence.currentNumber.toString().padStart(8, '0')}`;

            // Increment
            transaction.update(doc.ref, {
                currentNumber: sequence.currentNumber + 1,
                updatedAt: new Date()
            });

            return ncf;
        });
    },

    // Check if sequences are running low
    checkLowStock: async (userId: string): Promise<string[]> => {
        const sequences = await ncfService.getSequences(userId);
        const alerts: string[] = [];

        for (const seq of sequences) {
            const remaining = seq.endNumber - seq.currentNumber;
            // Alert if less than 50 or 10% remaining
            const threshold = Math.max(50, (seq.endNumber - seq.startNumber) * 0.1);

            if (remaining < threshold) {
                alerts.push(`La secuencia ${seq.name} (${seq.typeCode}) se está agotando. Quedan ${remaining} comprobantes.`);
            }
        }

        return alerts;
    }
};

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { ncfService } from '../services/ncfService';
import { createNCFSequenceSchema } from '../schema';

export const getNCFSequences = onCall({ cors: true, maxInstances: 1 }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }
    return await ncfService.getSequences(request.auth.uid);
});

export const createNCFSequence = onCall({ cors: true, maxInstances: 1 }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }
    try {
        const data = createNCFSequenceSchema.parse(request.data);
        const sequenceData = {
            ...data,
            currentNumber: data.currentNumber || data.startNumber,
        };
        return await ncfService.createSequence(request.auth.uid, sequenceData);
    } catch (error: any) {
        if (error.issues) {
            throw new HttpsError('invalid-argument', 'Validation error', error.issues);
        }
        throw error;
    }
});

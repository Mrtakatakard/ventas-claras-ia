import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { ncfService } from '../services/ncfService';
import { createNCFSequenceSchema } from '../schema';

export const ncf = onCall({ cors: true, maxInstances: 1, cpu: 0.5 }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { action, data } = request.data;
    const userId = request.auth.uid;

    try {
        switch (action) {
            case 'getSequences':
                return await ncfService.getSequences(userId);

            case 'create': {
                const validatedData = createNCFSequenceSchema.parse(data);
                const sequenceData = {
                    ...validatedData,
                    currentNumber: validatedData.currentNumber || validatedData.startNumber,
                };
                return await ncfService.createSequence(userId, sequenceData);
            }

            default:
                throw new HttpsError('invalid-argument', `Unknown action: ${action}`);
        }
    } catch (error: any) {
        console.error(`Error in ncf controller (${action}):`, error);
        if (error.issues) {
            throw new HttpsError('invalid-argument', 'Validation error', error.issues);
        }
        throw error;
    }
});

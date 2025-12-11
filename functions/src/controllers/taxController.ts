import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { taxService } from '../services/taxService';
import { createTaxSchema } from '../schema';

export const taxes = onCall({ cors: true, maxInstances: 1, cpu: 0.5 }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { action, data } = request.data;
    const userId = request.auth.uid;

    try {
        switch (action) {
            case 'getTaxes':
                return await taxService.getTaxes(userId);

            case 'create': {
                const validatedData = createTaxSchema.parse(data);
                return await taxService.createTax(userId, validatedData);
            }

            case 'delete':
                return await taxService.deleteTax(userId, data.id);

            default:
                throw new HttpsError('invalid-argument', `Unknown action: ${action}`);
        }
    } catch (error: any) {
        console.error(`Error in taxes controller (${action}):`, error);
        if (error.issues) {
            throw new HttpsError('invalid-argument', 'Validation error', error.issues);
        }
        throw error;
    }
});

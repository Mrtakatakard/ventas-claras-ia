import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { quoteService } from '../services/quoteService';
import { createQuoteSchema, updateQuoteSchema } from '../schema';

export const quotes = onCall({ cors: true, maxInstances: 1, cpu: 0.5 }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { action, data } = request.data;
    const userId = request.auth.uid;

    try {
        switch (action) {
            case 'create': {
                const input = createQuoteSchema.parse(data);
                return await quoteService.createQuote(input, userId);
            }

            case 'update': {
                const { id, ...updateData } = data;
                const input = updateQuoteSchema.parse({ id, ...updateData });
                const { id: _id, ...cleanData } = input;
                return await quoteService.updateQuote(id, cleanData, userId);
            }

            case 'delete':
                return await quoteService.deleteQuote(data.id, userId);

            case 'convertToInvoice':
                return await quoteService.convertQuoteToInvoice(data.id, userId);

            default:
                throw new HttpsError('invalid-argument', `Unknown action: ${action}`);
        }
    } catch (error: any) {
        console.error(`Error in quotes controller (${action}):`, error);
        if (error.issues) {
            throw new HttpsError('invalid-argument', 'Validation error', error.issues);
        }
        throw error;
    }
});

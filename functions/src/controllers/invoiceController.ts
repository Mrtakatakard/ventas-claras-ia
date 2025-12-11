import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as invoiceService from '../services/invoiceService';
import { createInvoiceSchema, updateInvoiceSchema, addPaymentSchema } from '../schema';

export const invoices = onCall({ cors: true, maxInstances: 1, cpu: 0.5 }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { action, data } = request.data;
    const userId = request.auth.uid;

    try {
        switch (action) {
            case 'create': {
                const validatedData = createInvoiceSchema.parse(data);
                return await invoiceService.createInvoice(validatedData, userId);
            }

            case 'update': {
                const { id, ...updateData } = data;
                const validatedData = updateInvoiceSchema.parse({ id, ...updateData });
                const { id: _id, ...cleanData } = validatedData;
                return await invoiceService.updateInvoice(id, cleanData, userId);
            }

            case 'delete':
                return await invoiceService.deleteInvoice(data.id, userId);

            case 'getReceivables':
                return await invoiceService.getReceivables(userId);

            case 'addPayment': {
                const validatedData = addPaymentSchema.parse(data);
                const { invoiceId, ...paymentData } = validatedData;

                const servicePaymentData = {
                    amount: paymentData.amount,
                    paymentDate: paymentData.date,
                    method: paymentData.method,
                    note: paymentData.note,
                    imageUrl: paymentData.imageUrl,
                };

                return await invoiceService.addPayment(invoiceId, servicePaymentData, userId);
            }

            default:
                throw new HttpsError('invalid-argument', `Unknown action: ${action}`);
        }
    } catch (error: any) {
        console.error(`Error in invoices controller (${action}):`, error);
        if (error.issues) {
            throw new HttpsError('invalid-argument', 'Validation error', error.issues);
        }
        throw error;
    }
});

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as invoiceService from "../services/invoiceService";
import { createInvoiceSchema, updateInvoiceSchema, addPaymentSchema } from "../schema";

export const createInvoice = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }
    try {
        const data = createInvoiceSchema.parse(request.data);
        return await invoiceService.createInvoice(data, request.auth.uid);
    } catch (error: any) {
        if (error.issues) {
            throw new HttpsError("invalid-argument", "Validation error", error.issues);
        }
        throw error;
    }
});

export const updateInvoice = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }
    try {
        const { id, ...data } = request.data;
        // Validate partial update data
        const validatedData = updateInvoiceSchema.parse({ id, ...data });
        // We only pass the data part to the service, id is separate
        const { id: _id, ...updateData } = validatedData;
        return await invoiceService.updateInvoice(id, updateData, request.auth.uid);
    } catch (error: any) {
        if (error.issues) {
            throw new HttpsError("invalid-argument", "Validation error", error.issues);
        }
        throw error;
    }
});

export const deleteInvoice = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }
    return await invoiceService.deleteInvoice(request.data.id, request.auth.uid);
});

export const getReceivables = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }
    return await invoiceService.getReceivables(request.auth.uid);
});

export const addPayment = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }
    try {
        const validatedData = addPaymentSchema.parse(request.data);
        const { invoiceId, ...paymentData } = validatedData;

        // Map the flat payment data to the structure expected by the service
        // The service expects: Omit<Payment, 'id' | 'receiptNumber' | 'currency' | 'status'>
        // Our Zod schema validates: amount, date, method, note, imageUrl

        const servicePaymentData = {
            amount: paymentData.amount,
            paymentDate: paymentData.date,
            method: paymentData.method,
            note: paymentData.note,
            imageUrl: paymentData.imageUrl
        };

        return await invoiceService.addPayment(invoiceId, servicePaymentData, request.auth.uid);
    } catch (error: any) {
        if (error.issues) {
            throw new HttpsError("invalid-argument", "Validation error", error.issues);
        }
        throw error;
    }
});

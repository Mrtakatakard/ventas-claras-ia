import { onCall, HttpsError } from "firebase-functions/v2/https";
import { quoteService } from "../services/quoteService";
import { createQuoteSchema, updateQuoteSchema } from "../schema";

export const createQuote = onCall({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }
    try {
        const data = createQuoteSchema.parse(request.data);
        return await quoteService.createQuote(data, request.auth.uid);
    } catch (error: any) {
        if (error.issues) {
            throw new HttpsError("invalid-argument", "Validation error", error.issues);
        }
        throw error;
    }
});

export const updateQuote = onCall({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }
    try {
        const { id, ...data } = request.data;
        const validatedData = updateQuoteSchema.parse({ id, ...data });
        const { id: _id, ...updateData } = validatedData;
        return await quoteService.updateQuote(id, updateData, request.auth.uid);
    } catch (error: any) {
        if (error.issues) {
            throw new HttpsError("invalid-argument", "Validation error", error.issues);
        }
        throw error;
    }
});

export const deleteQuote = onCall({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }
    return await quoteService.deleteQuote(request.data.id, request.auth.uid);
});

export const convertQuoteToInvoice = onCall({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }
    return await quoteService.convertQuoteToInvoice(request.data.quoteId, request.auth.uid);
});

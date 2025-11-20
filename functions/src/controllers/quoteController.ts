import { onCall, CallableRequest } from "firebase-functions/v2/https";
import { quoteService } from "../services/quoteService";
import { Quote } from "../types";

export const createQuote = onCall(async (request: CallableRequest<Omit<Quote, 'id' | 'createdAt' | 'isActive'>>) => {
    if (!request.auth) {
        throw new Error("Unauthenticated");
    }
    return await quoteService.createQuote(request.data, request.auth.uid);
});

export const updateQuote = onCall(async (request: CallableRequest<{ id: string; data: Partial<Quote> }>) => {
    if (!request.auth) {
        throw new Error("Unauthenticated");
    }
    return await quoteService.updateQuote(request.data.id, request.data.data, request.auth.uid);
});

export const deleteQuote = onCall(async (request: CallableRequest<{ id: string }>) => {
    if (!request.auth) {
        throw new Error("Unauthenticated");
    }
    return await quoteService.deleteQuote(request.data.id, request.auth.uid);
});

export const convertQuoteToInvoice = onCall(async (request: CallableRequest<{ quoteId: string }>) => {
    if (!request.auth) {
        throw new Error("Unauthenticated");
    }
    return await quoteService.convertQuoteToInvoice(request.data.quoteId, request.auth.uid);
});

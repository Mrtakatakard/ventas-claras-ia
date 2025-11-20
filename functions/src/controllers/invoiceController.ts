import { onCall, CallableRequest } from "firebase-functions/v2/https";
import { invoiceService } from "../services/invoiceService";
import { Invoice, Payment } from "../types";

export const createInvoice = onCall(async (request: CallableRequest<Omit<Invoice, 'id' | 'createdAt' | 'isActive'>>) => {
    if (!request.auth) {
        throw new Error("Unauthenticated");
    }
    return await invoiceService.createInvoice(request.data, request.auth.uid);
});

export const updateInvoice = onCall(async (request: CallableRequest<{ id: string; data: Partial<Invoice> }>) => {
    if (!request.auth) {
        throw new Error("Unauthenticated");
    }
    return await invoiceService.updateInvoice(request.data.id, request.data.data, request.auth.uid);
});

export const deleteInvoice = onCall(async (request: CallableRequest<{ id: string }>) => {
    if (!request.auth) {
        throw new Error("Unauthenticated");
    }
    return await invoiceService.deleteInvoice(request.data.id, request.auth.uid);
});

export const getReceivables = onCall(async (request: CallableRequest<void>) => {
    if (!request.auth) {
        throw new Error("Unauthenticated");
    }
    return await invoiceService.getReceivables(request.auth.uid);
});

export const addPayment = onCall(async (request: CallableRequest<{ invoiceId: string; paymentData: Omit<Payment, 'id' | 'receiptNumber' | 'currency' | 'status'> }>) => {
    if (!request.auth) {
        throw new Error("Unauthenticated");
    }
    return await invoiceService.addPayment(request.data.invoiceId, request.data.paymentData, request.auth.uid);
});

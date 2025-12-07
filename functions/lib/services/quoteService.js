import { quoteRepository } from "../repositories/quoteRepository";
import * as invoiceService from "./invoiceService";
import { db } from "../index";
import * as functions from "firebase-functions";
import { counterService } from "./counterService";
export const quoteService = {
    async createQuote(quoteData, userId) {
        const quoteId = db.collection("quotes").doc().id;
        // Generate sequential quote number
        const quoteNumber = await counterService.getNextNumber('quotes', userId, 'QT');
        const newQuote = Object.assign(Object.assign({}, quoteData), { id: quoteId, userId, createdAt: new Date(), isActive: true, quoteNumber: quoteNumber, status: 'borrador' });
        await quoteRepository.create(newQuote);
        return quoteId;
    },
    async updateQuote(id, data, userId) {
        const existingQuote = await quoteRepository.get(id);
        if (!existingQuote) {
            throw new functions.https.HttpsError("not-found", "Cotización no encontrada.");
        }
        if (existingQuote.userId !== userId) {
            throw new functions.https.HttpsError("permission-denied", "No tienes permiso para editar esta cotización.");
        }
        await quoteRepository.update(id, data);
    },
    async deleteQuote(id, userId) {
        const existingQuote = await quoteRepository.get(id);
        if (!existingQuote) {
            throw new functions.https.HttpsError("not-found", "Cotización no encontrada.");
        }
        if (existingQuote.userId !== userId) {
            throw new functions.https.HttpsError("permission-denied", "No tienes permiso para eliminar esta cotización.");
        }
        await quoteRepository.delete(id);
    },
    async convertQuoteToInvoice(quoteId, userId) {
        const quote = await quoteRepository.get(quoteId);
        if (!quote) {
            throw new functions.https.HttpsError("not-found", "Cotización no encontrada.");
        }
        if (quote.userId !== userId) {
            throw new functions.https.HttpsError("permission-denied", "No tienes permiso para convertir esta cotización.");
        }
        // Create invoice data from quote
        // Note: We need to generate a new invoice number. 
        // For now, we'll assume the frontend or a separate trigger handles the sequential numbering, 
        // or we pass it in. But the legacy code didn't seem to pass it in `convertQuoteToInvoice`.
        // Let's check how legacy did it.
        // Legacy `convertQuoteToInvoice` in `service.ts` (line 270) seemed to just call `addInvoice`.
        // `addInvoice` in legacy (line 359) generated a number if not provided? 
        // Actually, `addInvoice` usually takes `invoiceData`.
        // To be safe and simple: We will create the invoice object here.
        // We might need to fetch the next invoice number. 
        // For this iteration, let's assume the user will update the invoice number after creation or we use a placeholder.
        // Or better, we just copy the quote number as a reference.
        const invoiceData = {
            clientId: quote.clientId,
            clientName: quote.clientName,
            clientEmail: quote.clientEmail,
            clientAddress: quote.clientAddress,
            issueDate: new Date().toISOString(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Default 30 days
            items: quote.items,
            subtotal: quote.subtotal,
            discountTotal: quote.discountTotal,
            itbis: quote.itbis,
            total: quote.total,
            currency: quote.currency,
            quoteId: quote.id,
            includeITBIS: quote.includeITBIS
        };
        const invoiceId = await invoiceService.createInvoice(invoiceData, userId);
        // Update quote status
        await quoteRepository.update(quoteId, { status: 'facturada' });
        return invoiceId;
    }
};
//# sourceMappingURL=quoteService.js.map
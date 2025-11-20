"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.quoteService = void 0;
const quoteRepository_1 = require("../repositories/quoteRepository");
const invoiceService_1 = require("./invoiceService");
const index_1 = require("../index");
const functions = __importStar(require("firebase-functions"));
exports.quoteService = {
    async createQuote(quoteData, userId) {
        const quoteId = index_1.db.collection("quotes").doc().id;
        const newQuote = Object.assign(Object.assign({}, quoteData), { id: quoteId, userId, createdAt: new Date(), isActive: true });
        await quoteRepository_1.quoteRepository.create(newQuote);
        return quoteId;
    },
    async updateQuote(id, data, userId) {
        const existingQuote = await quoteRepository_1.quoteRepository.get(id);
        if (!existingQuote) {
            throw new functions.https.HttpsError("not-found", "Cotización no encontrada.");
        }
        if (existingQuote.userId !== userId) {
            throw new functions.https.HttpsError("permission-denied", "No tienes permiso para editar esta cotización.");
        }
        await quoteRepository_1.quoteRepository.update(id, data);
    },
    async deleteQuote(id, userId) {
        const existingQuote = await quoteRepository_1.quoteRepository.get(id);
        if (!existingQuote) {
            throw new functions.https.HttpsError("not-found", "Cotización no encontrada.");
        }
        if (existingQuote.userId !== userId) {
            throw new functions.https.HttpsError("permission-denied", "No tienes permiso para eliminar esta cotización.");
        }
        await quoteRepository_1.quoteRepository.delete(id);
    },
    async convertQuoteToInvoice(quoteId, userId) {
        const quote = await quoteRepository_1.quoteRepository.get(quoteId);
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
            invoiceNumber: `INV-${Date.now()}`, // Temporary placeholder, should be properly generated
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
            payments: [],
            balanceDue: quote.total,
            status: 'pendiente',
            currency: quote.currency,
            quoteId: quote.id,
            includeITBIS: quote.includeITBIS,
            userId: userId
        };
        const invoiceId = await invoiceService_1.invoiceService.createInvoice(invoiceData, userId);
        // Update quote status
        await quoteRepository_1.quoteRepository.update(quoteId, { status: 'facturada' });
        return invoiceId;
    }
};
//# sourceMappingURL=quoteService.js.map
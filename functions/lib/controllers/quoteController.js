"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertQuoteToInvoice = exports.deleteQuote = exports.updateQuote = exports.createQuote = void 0;
const https_1 = require("firebase-functions/v2/https");
const quoteService_1 = require("../services/quoteService");
exports.createQuote = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new Error("Unauthenticated");
    }
    return await quoteService_1.quoteService.createQuote(request.data, request.auth.uid);
});
exports.updateQuote = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new Error("Unauthenticated");
    }
    return await quoteService_1.quoteService.updateQuote(request.data.id, request.data.data, request.auth.uid);
});
exports.deleteQuote = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new Error("Unauthenticated");
    }
    return await quoteService_1.quoteService.deleteQuote(request.data.id, request.auth.uid);
});
exports.convertQuoteToInvoice = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new Error("Unauthenticated");
    }
    return await quoteService_1.quoteService.convertQuoteToInvoice(request.data.quoteId, request.auth.uid);
});
//# sourceMappingURL=quoteController.js.map
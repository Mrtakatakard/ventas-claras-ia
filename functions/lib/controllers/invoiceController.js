"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPayment = exports.getReceivables = exports.deleteInvoice = exports.updateInvoice = exports.createInvoice = void 0;
const https_1 = require("firebase-functions/v2/https");
const invoiceService_1 = require("../services/invoiceService");
exports.createInvoice = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new Error("Unauthenticated");
    }
    return await invoiceService_1.invoiceService.createInvoice(request.data, request.auth.uid);
});
exports.updateInvoice = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new Error("Unauthenticated");
    }
    return await invoiceService_1.invoiceService.updateInvoice(request.data.id, request.data.data, request.auth.uid);
});
exports.deleteInvoice = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new Error("Unauthenticated");
    }
    return await invoiceService_1.invoiceService.deleteInvoice(request.data.id, request.auth.uid);
});
exports.getReceivables = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new Error("Unauthenticated");
    }
    return await invoiceService_1.invoiceService.getReceivables(request.auth.uid);
});
exports.addPayment = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new Error("Unauthenticated");
    }
    return await invoiceService_1.invoiceService.addPayment(request.data.invoiceId, request.data.paymentData, request.auth.uid);
});
//# sourceMappingURL=invoiceController.js.map
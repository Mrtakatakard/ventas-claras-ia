"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPayment = exports.getReceivables = exports.deleteInvoice = exports.updateInvoice = exports.createInvoice = void 0;
const https_1 = require("firebase-functions/v2/https");
const invoiceService = require("../services/invoiceService");
const schema_1 = require("../schema");
exports.createInvoice = (0, https_1.onCall)({ cors: true, maxInstances: 1 }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
    }
    try {
        const data = schema_1.createInvoiceSchema.parse(request.data);
        return await invoiceService.createInvoice(data, request.auth.uid);
    }
    catch (error) {
        if (error.issues) {
            throw new https_1.HttpsError('invalid-argument', 'Validation error', error.issues);
        }
        throw error;
    }
});
exports.updateInvoice = (0, https_1.onCall)({ cors: true, maxInstances: 1 }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
    }
    try {
        const _a = request.data, { id } = _a, data = __rest(_a, ["id"]);
        // Validate partial update data
        const validatedData = schema_1.updateInvoiceSchema.parse(Object.assign({ id }, data));
        // We only pass the data part to the service, id is separate
        const { id: _id } = validatedData, updateData = __rest(validatedData, ["id"]);
        return await invoiceService.updateInvoice(id, updateData, request.auth.uid);
    }
    catch (error) {
        if (error.issues) {
            throw new https_1.HttpsError('invalid-argument', 'Validation error', error.issues);
        }
        throw error;
    }
});
exports.deleteInvoice = (0, https_1.onCall)({ cors: true, maxInstances: 1 }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
    }
    return await invoiceService.deleteInvoice(request.data.id, request.auth.uid);
});
exports.getReceivables = (0, https_1.onCall)({ cors: true, maxInstances: 1 }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
    }
    return await invoiceService.getReceivables(request.auth.uid);
});
exports.addPayment = (0, https_1.onCall)({ cors: true, maxInstances: 1 }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
    }
    try {
        const validatedData = schema_1.addPaymentSchema.parse(request.data);
        const { invoiceId } = validatedData, paymentData = __rest(validatedData, ["invoiceId"]);
        // Map the flat payment data to the structure expected by the service
        // The service expects: Omit<Payment, 'id' | 'receiptNumber' | 'currency' | 'status'>
        // Our Zod schema validates: amount, date, method, note, imageUrl
        const servicePaymentData = {
            amount: paymentData.amount,
            paymentDate: paymentData.date,
            method: paymentData.method,
            note: paymentData.note,
            imageUrl: paymentData.imageUrl,
        };
        return await invoiceService.addPayment(invoiceId, servicePaymentData, request.auth.uid);
    }
    catch (error) {
        if (error.issues) {
            throw new https_1.HttpsError('invalid-argument', 'Validation error', error.issues);
        }
        throw error;
    }
});
//# sourceMappingURL=invoiceController.js.map
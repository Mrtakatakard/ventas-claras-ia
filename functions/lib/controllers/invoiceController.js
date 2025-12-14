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
exports.invoices = void 0;
const https_1 = require("firebase-functions/v2/https");
const invoiceService = require("../services/invoiceService");
const schema_1 = require("../schema");
exports.invoices = (0, https_1.onCall)({ cors: true, maxInstances: 1, cpu: 0.5 }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const { action, data } = request.data;
    const userId = request.auth.uid;
    try {
        switch (action) {
            case 'create': {
                const { allowBackorder } = data, invoiceData = __rest(data, ["allowBackorder"]);
                const validatedData = schema_1.createInvoiceSchema.parse(invoiceData);
                return await invoiceService.createInvoice(validatedData, userId, allowBackorder);
            }
            case 'update': {
                const { id, allowBackorder } = data, updateData = __rest(data, ["id", "allowBackorder"]);
                const validatedData = schema_1.updateInvoiceSchema.parse(Object.assign({ id }, updateData));
                const { id: _id } = validatedData, cleanData = __rest(validatedData, ["id"]);
                return await invoiceService.updateInvoice(id, cleanData, userId, allowBackorder);
            }
            case 'delete':
                return await invoiceService.deleteInvoice(data.id, userId);
            case 'getReceivables':
                return await invoiceService.getReceivables(userId);
            case 'addPayment': {
                const validatedData = schema_1.addPaymentSchema.parse(data);
                const { invoiceId } = validatedData, paymentData = __rest(validatedData, ["invoiceId"]);
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
                throw new https_1.HttpsError('invalid-argument', `Unknown action: ${action}`);
        }
    }
    catch (error) {
        console.error(`Error in invoices controller (${action}):`, error);
        if (error.issues) {
            throw new https_1.HttpsError('invalid-argument', 'Validation error', error.issues);
        }
        throw error;
    }
});
//# sourceMappingURL=invoiceController.js.map
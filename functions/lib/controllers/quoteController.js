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
exports.quotes = void 0;
const https_1 = require("firebase-functions/v2/https");
const quoteService_1 = require("../services/quoteService");
const schema_1 = require("../schema");
exports.quotes = (0, https_1.onCall)({ cors: true, maxInstances: 1, cpu: 0.5 }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const { action, data } = request.data;
    const userId = request.auth.uid;
    try {
        switch (action) {
            case 'create': {
                const input = schema_1.createQuoteSchema.parse(data);
                return await quoteService_1.quoteService.createQuote(input, userId);
            }
            case 'update': {
                const { id } = data, updateData = __rest(data, ["id"]);
                const input = schema_1.updateQuoteSchema.parse(Object.assign({ id }, updateData));
                const { id: _id } = input, cleanData = __rest(input, ["id"]);
                return await quoteService_1.quoteService.updateQuote(id, cleanData, userId);
            }
            case 'delete':
                return await quoteService_1.quoteService.deleteQuote(data.id, userId);
            case 'convertToInvoice':
                return await quoteService_1.quoteService.convertQuoteToInvoice(data.id, userId);
            default:
                throw new https_1.HttpsError('invalid-argument', `Unknown action: ${action}`);
        }
    }
    catch (error) {
        console.error(`Error in quotes controller (${action}):`, error);
        if (error.issues) {
            throw new https_1.HttpsError('invalid-argument', 'Validation error', error.issues);
        }
        throw error;
    }
});
//# sourceMappingURL=quoteController.js.map
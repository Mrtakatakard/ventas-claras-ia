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
exports.convertQuoteToInvoice = exports.deleteQuote = exports.updateQuote = exports.createQuote = void 0;
const https_1 = require("firebase-functions/v2/https");
const quoteService_1 = require("../services/quoteService");
const schema_1 = require("../schema");
exports.createQuote = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be logged in.");
    }
    try {
        const data = schema_1.createQuoteSchema.parse(request.data);
        return await quoteService_1.quoteService.createQuote(data, request.auth.uid);
    }
    catch (error) {
        if (error.issues) {
            throw new https_1.HttpsError("invalid-argument", "Validation error", error.issues);
        }
        throw error;
    }
});
exports.updateQuote = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be logged in.");
    }
    try {
        const _a = request.data, { id } = _a, data = __rest(_a, ["id"]);
        const validatedData = schema_1.updateQuoteSchema.parse(Object.assign({ id }, data));
        const { id: _id } = validatedData, updateData = __rest(validatedData, ["id"]);
        return await quoteService_1.quoteService.updateQuote(id, updateData, request.auth.uid);
    }
    catch (error) {
        if (error.issues) {
            throw new https_1.HttpsError("invalid-argument", "Validation error", error.issues);
        }
        throw error;
    }
});
exports.deleteQuote = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be logged in.");
    }
    return await quoteService_1.quoteService.deleteQuote(request.data.id, request.auth.uid);
});
exports.convertQuoteToInvoice = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be logged in.");
    }
    return await quoteService_1.quoteService.convertQuoteToInvoice(request.data.quoteId, request.auth.uid);
});
//# sourceMappingURL=quoteController.js.map
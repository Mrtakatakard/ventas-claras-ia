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
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { quoteService } from "../services/quoteService";
import { createQuoteSchema, updateQuoteSchema } from "../schema";
export const createQuote = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }
    try {
        const data = createQuoteSchema.parse(request.data);
        return await quoteService.createQuote(data, request.auth.uid);
    }
    catch (error) {
        if (error.issues) {
            throw new HttpsError("invalid-argument", "Validation error", error.issues);
        }
        throw error;
    }
});
export const updateQuote = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }
    try {
        const _a = request.data, { id } = _a, data = __rest(_a, ["id"]);
        const validatedData = updateQuoteSchema.parse(Object.assign({ id }, data));
        const { id: _id } = validatedData, updateData = __rest(validatedData, ["id"]);
        return await quoteService.updateQuote(id, updateData, request.auth.uid);
    }
    catch (error) {
        if (error.issues) {
            throw new HttpsError("invalid-argument", "Validation error", error.issues);
        }
        throw error;
    }
});
export const deleteQuote = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }
    return await quoteService.deleteQuote(request.data.id, request.auth.uid);
});
export const convertQuoteToInvoice = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }
    return await quoteService.convertQuoteToInvoice(request.data.quoteId, request.auth.uid);
});
//# sourceMappingURL=quoteController.js.map
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
import * as functions from "firebase-functions";
import { productService } from "../services/productService";
export const createProduct = functions.https.onCall(async (request) => {
    if (!request.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }
    return await productService.createProduct(request.data, request.auth.uid);
});
export const updateProduct = functions.https.onCall(async (request) => {
    if (!request.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }
    const _a = request.data, { id } = _a, data = __rest(_a, ["id"]);
    return await productService.updateProduct(id, data, request.auth.uid);
});
export const deleteProduct = functions.https.onCall(async (request) => {
    if (!request.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }
    const { id } = request.data;
    return await productService.deleteProduct(id, request.auth.uid);
});
export const checkProductCodeExists = functions.https.onCall(async (request) => {
    if (!request.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }
    const { code, excludeId } = request.data;
    return await productService.checkProductCodeExists(code, request.auth.uid, excludeId);
});
export const batchCreateProducts = functions.https.onCall(async (request) => {
    if (!request.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }
    const { products } = request.data;
    return await productService.batchCreateProducts(products, request.auth.uid);
});
//# sourceMappingURL=productController.js.map
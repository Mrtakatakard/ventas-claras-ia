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
exports.batchCreateProducts = exports.checkProductCodeExists = exports.deleteProduct = exports.updateProduct = exports.createProduct = void 0;
const https_1 = require("firebase-functions/v2/https");
const productService_1 = require("../services/productService");
exports.createProduct = (0, https_1.onCall)({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
    }
    return await productService_1.productService.createProduct(request.data, request.auth.uid);
});
exports.updateProduct = (0, https_1.onCall)({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const _a = request.data, { id } = _a, data = __rest(_a, ["id"]);
    return await productService_1.productService.updateProduct(id, data, request.auth.uid);
});
exports.deleteProduct = (0, https_1.onCall)({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const { id } = request.data;
    return await productService_1.productService.deleteProduct(id, request.auth.uid);
});
exports.checkProductCodeExists = (0, https_1.onCall)({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const { code, excludeId } = request.data;
    return await productService_1.productService.checkProductCodeExists(code, request.auth.uid, excludeId);
});
exports.batchCreateProducts = (0, https_1.onCall)({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const { products } = request.data;
    return await productService_1.productService.batchCreateProducts(products, request.auth.uid);
});
//# sourceMappingURL=productController.js.map
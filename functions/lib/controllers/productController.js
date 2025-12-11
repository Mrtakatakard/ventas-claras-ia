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
exports.products = void 0;
const https_1 = require("firebase-functions/v2/https");
const productService_1 = require("../services/productService");
const schema_1 = require("../schema");
const logger = require("firebase-functions/logger");
exports.products = (0, https_1.onCall)({ cors: true, maxInstances: 1, cpu: 0.5 }, async (request) => {
    var _a;
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const { action, data } = request.data;
    const userId = request.auth.uid;
    try {
        switch (action) {
            case 'create': {
                logger.info('Creating product with data:', JSON.stringify(data));
                const validation = schema_1.createProductSchema.safeParse(data);
                if (!validation.success) {
                    logger.error('Validation failed:', validation.error);
                    throw new https_1.HttpsError('invalid-argument', 'Invalid product data: ' + JSON.stringify(validation.error.flatten()));
                }
                return await productService_1.productService.createProduct(validation.data, userId);
            }
            case 'update': {
                const { id } = data, updateData = __rest(data, ["id"]);
                logger.info(`Updating product ${id} with data:`, JSON.stringify(updateData));
                const validation = schema_1.updateProductSchema.safeParse(updateData);
                if (!validation.success) {
                    logger.error('Validation failed:', validation.error);
                    throw new https_1.HttpsError('invalid-argument', 'Invalid product update data: ' + JSON.stringify(validation.error.flatten()));
                }
                return await productService_1.productService.updateProduct(id, validation.data, userId);
            }
            case 'delete':
                logger.info(`Deleting product ${data.id}`);
                return await productService_1.productService.deleteProduct(data.id, userId);
            case 'checkCode':
                return await productService_1.productService.checkProductCodeExists(data.code, userId, data.excludeId);
            case 'batchCreate':
                logger.info(`Batch creating ${(_a = data.products) === null || _a === void 0 ? void 0 : _a.length} products`);
                return await productService_1.productService.batchCreateProducts(data.products, userId);
            default:
                throw new https_1.HttpsError('invalid-argument', `Unknown action: ${action}`);
        }
    }
    catch (error) {
        console.error(`Error in products controller (${action}):`, error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'Internal error in products controller: ' + error.message);
    }
});
//# sourceMappingURL=productController.js.map
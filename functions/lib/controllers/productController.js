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
const schema_1 = require("../schema");
const logger = require("firebase-functions/logger");
exports.createProduct = (0, https_1.onCall)({ cors: true, maxInstances: 1 }, async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
        }
        // Log incoming data for debugging (excluding sensitive info if any)
        logger.info('Creating product with data:', JSON.stringify(request.data));
        const validation = schema_1.createProductSchema.safeParse(request.data);
        if (!validation.success) {
            logger.error('Validation failed:', validation.error);
            throw new https_1.HttpsError('invalid-argument', 'Invalid product data: ' + JSON.stringify(validation.error.flatten()));
        }
        return await productService_1.productService.createProduct(validation.data, request.auth.uid);
    }
    catch (error) {
        logger.error('Error creating product:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        // Return internal error with message for debugging (remove specific message in prod if sensitive)
        throw new https_1.HttpsError('internal', 'Internal error creating product: ' + error.message);
    }
});
exports.updateProduct = (0, https_1.onCall)({ cors: true, maxInstances: 1 }, async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
        }
        const _a = request.data, { id } = _a, data = __rest(_a, ["id"]);
        logger.info(`Updating product ${id} with data:`, JSON.stringify(data));
        const validation = schema_1.updateProductSchema.safeParse(data);
        if (!validation.success) {
            logger.error('Validation failed:', validation.error);
            throw new https_1.HttpsError('invalid-argument', 'Invalid product update data: ' + JSON.stringify(validation.error.flatten()));
        }
        return await productService_1.productService.updateProduct(id, validation.data, request.auth.uid);
    }
    catch (error) {
        logger.error('Error updating product:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'Internal error updating product: ' + error.message);
    }
});
exports.deleteProduct = (0, https_1.onCall)({ cors: true, maxInstances: 1 }, async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
        }
        const { id } = request.data;
        logger.info(`Deleting product ${id}`);
        return await productService_1.productService.deleteProduct(id, request.auth.uid);
    }
    catch (error) {
        logger.error('Error deleting product:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'Internal error deleting product: ' + error.message);
    }
});
exports.checkProductCodeExists = (0, https_1.onCall)({ cors: true, maxInstances: 1 }, async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
        }
        const { code, excludeId } = request.data;
        // Lightweight log for this frequent check
        // logger.debug(`Checking code: ${code}`); 
        return await productService_1.productService.checkProductCodeExists(code, request.auth.uid, excludeId);
    }
    catch (error) {
        logger.error('Error checking product code:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'Internal error checking product code: ' + error.message);
    }
});
exports.batchCreateProducts = (0, https_1.onCall)({ cors: true, maxInstances: 1 }, async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
        }
        const { products } = request.data;
        logger.info(`Batch creating ${products === null || products === void 0 ? void 0 : products.length} products`);
        return await productService_1.productService.batchCreateProducts(products, request.auth.uid);
    }
    catch (error) {
        logger.error('Error batch creating products:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'Internal error batch creating products: ' + error.message);
    }
});
//# sourceMappingURL=productController.js.map
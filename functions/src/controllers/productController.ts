import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { productService } from '../services/productService';

export const createProduct = onCall({ cors: true }, async (request: CallableRequest) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }
    return await productService.createProduct(request.data, request.auth.uid);
});

export const updateProduct = onCall({ cors: true }, async (request: CallableRequest) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }
    const { id, ...data } = request.data;
    return await productService.updateProduct(id, data, request.auth.uid);
});

export const deleteProduct = onCall({ cors: true }, async (request: CallableRequest) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }
    const { id } = request.data;
    return await productService.deleteProduct(id, request.auth.uid);
});

export const checkProductCodeExists = onCall({ cors: true }, async (request: CallableRequest) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }
    const { code, excludeId } = request.data;
    return await productService.checkProductCodeExists(code, request.auth.uid, excludeId);
});

export const batchCreateProducts = onCall({ cors: true }, async (request: CallableRequest) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }
    const { products } = request.data;
    return await productService.batchCreateProducts(products, request.auth.uid);
});

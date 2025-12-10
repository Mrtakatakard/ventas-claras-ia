import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { productService } from '../services/productService';
import { createProductSchema, updateProductSchema } from '../schema';
import * as logger from 'firebase-functions/logger';

export const createProduct = onCall({ cors: true, maxInstances: 1 }, async (request: CallableRequest) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be logged in.');
        }

        // Log incoming data for debugging (excluding sensitive info if any)
        logger.info('Creating product with data:', JSON.stringify(request.data));

        const validation = createProductSchema.safeParse(request.data);
        if (!validation.success) {
            logger.error('Validation failed:', validation.error);
            throw new HttpsError('invalid-argument', 'Invalid product data: ' + JSON.stringify(validation.error.flatten()));
        }

        return await productService.createProduct(validation.data as any, request.auth.uid);
    } catch (error: any) {
        logger.error('Error creating product:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        // Return internal error with message for debugging (remove specific message in prod if sensitive)
        throw new HttpsError('internal', 'Internal error creating product: ' + error.message);
    }
});

export const updateProduct = onCall({ cors: true, maxInstances: 1 }, async (request: CallableRequest) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be logged in.');
        }
        const { id, ...data } = request.data;

        logger.info(`Updating product ${id} with data:`, JSON.stringify(data));

        const validation = updateProductSchema.safeParse(data);

        if (!validation.success) {
            logger.error('Validation failed:', validation.error);
            throw new HttpsError('invalid-argument', 'Invalid product update data: ' + JSON.stringify(validation.error.flatten()));
        }
        return await productService.updateProduct(id, validation.data as any, request.auth.uid);
    } catch (error: any) {
        logger.error('Error updating product:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'Internal error updating product: ' + error.message);
    }
});

export const deleteProduct = onCall({ cors: true, maxInstances: 1 }, async (request: CallableRequest) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be logged in.');
        }
        const { id } = request.data;
        logger.info(`Deleting product ${id}`);
        return await productService.deleteProduct(id, request.auth.uid);
    } catch (error: any) {
        logger.error('Error deleting product:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'Internal error deleting product: ' + error.message);
    }
});

export const checkProductCodeExists = onCall({ cors: true, maxInstances: 1 }, async (request: CallableRequest) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be logged in.');
        }
        const { code, excludeId } = request.data;
        // Lightweight log for this frequent check
        // logger.debug(`Checking code: ${code}`); 
        return await productService.checkProductCodeExists(code, request.auth.uid, excludeId);
    } catch (error: any) {
        logger.error('Error checking product code:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'Internal error checking product code: ' + error.message);
    }
});

export const batchCreateProducts = onCall({ cors: true, maxInstances: 1 }, async (request: CallableRequest) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be logged in.');
        }
        const { products } = request.data;
        logger.info(`Batch creating ${products?.length} products`);
        return await productService.batchCreateProducts(products, request.auth.uid);
    } catch (error: any) {
        logger.error('Error batch creating products:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'Internal error batch creating products: ' + error.message);
    }
});

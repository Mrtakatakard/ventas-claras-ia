import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { productService } from '../services/productService';
import { createProductSchema, updateProductSchema } from '../schema';
import * as logger from 'firebase-functions/logger';

export const products = onCall({ cors: true, maxInstances: 1, cpu: 0.5 }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { action, data } = request.data;
    const userId = request.auth.uid;

    try {
        switch (action) {
            case 'create': {
                logger.info('Creating product with data:', JSON.stringify(data));
                const validation = createProductSchema.safeParse(data);
                if (!validation.success) {
                    logger.error('Validation failed:', validation.error);
                    throw new HttpsError('invalid-argument', 'Invalid product data: ' + JSON.stringify(validation.error.flatten()));
                }
                return await productService.createProduct(validation.data as any, userId);
            }

            case 'update': {
                const { id, ...updateData } = data;
                logger.info(`Updating product ${id} with data:`, JSON.stringify(updateData));
                const validation = updateProductSchema.safeParse(updateData);
                if (!validation.success) {
                    logger.error('Validation failed:', validation.error);
                    throw new HttpsError('invalid-argument', 'Invalid product update data: ' + JSON.stringify(validation.error.flatten()));
                }
                return await productService.updateProduct(id, validation.data as any, userId);
            }

            case 'delete':
                logger.info(`Deleting product ${data.id}`);
                return await productService.deleteProduct(data.id, userId);

            case 'checkCode':
                return await productService.checkProductCodeExists(data.code, userId, data.excludeId);

            case 'batchCreate':
                logger.info(`Batch creating ${data.products?.length} products`);
                return await productService.batchCreateProducts(data.products, userId);

            default:
                throw new HttpsError('invalid-argument', `Unknown action: ${action}`);
        }
    } catch (error: any) {
        console.error(`Error in products controller (${action}):`, error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'Internal error in products controller: ' + error.message);
    }
});

import * as functions from "firebase-functions";
import { productService } from "../services/productService";
import { CallableRequest } from "firebase-functions/v2/https";

export const createProduct = functions.https.onCall(async (request: CallableRequest) => {
    if (!request.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }
    return await productService.createProduct(request.data, request.auth.uid);
});

export const updateProduct = functions.https.onCall(async (request: CallableRequest) => {
    if (!request.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }
    const { id, ...data } = request.data;
    return await productService.updateProduct(id, data, request.auth.uid);
});

export const deleteProduct = functions.https.onCall(async (request: CallableRequest) => {
    if (!request.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }
    const { id } = request.data;
    return await productService.deleteProduct(id, request.auth.uid);
});

export const checkProductCodeExists = functions.https.onCall(async (request: CallableRequest) => {
    if (!request.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }
    const { code, excludeId } = request.data;
    return await productService.checkProductCodeExists(code, request.auth.uid, excludeId);
});

export const batchCreateProducts = functions.https.onCall(async (request: CallableRequest) => {
    if (!request.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }
    const { products } = request.data;
    return await productService.batchCreateProducts(products, request.auth.uid);
});

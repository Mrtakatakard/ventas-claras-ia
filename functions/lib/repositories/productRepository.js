"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productRepository = void 0;
const firebase_1 = require("../config/firebase");
const COLLECTION_NAME = 'products';
exports.productRepository = {
    async create(product) {
        await firebase_1.db.collection(COLLECTION_NAME).doc(product.id).set(product);
        return product;
    },
    async update(id, data) {
        await firebase_1.db.collection(COLLECTION_NAME).doc(id).update(data);
    },
    async delete(id) {
        await firebase_1.db.collection(COLLECTION_NAME).doc(id).update({ isActive: false });
    },
    async get(id) {
        const doc = await firebase_1.db.collection(COLLECTION_NAME).doc(id).get();
        if (!doc.exists)
            return null;
        return doc.data();
    },
    async findByCode(code, userId) {
        const snapshot = await firebase_1.db.collection(COLLECTION_NAME)
            .where('userId', '==', userId)
            .where('code', '==', code)
            .where('isActive', '==', true)
            .get();
        return snapshot.docs.map((doc) => doc.data());
    },
    async searchByName(term, userId) {
        // Simple case-sensitive prefix search as Firestore doesn't support full-text natively
        // For production, consider Algolia or TypeSense
        const endTerm = term.replace(/.$/, c => String.fromCharCode(c.charCodeAt(0) + 1));
        const snapshot = await firebase_1.db.collection(COLLECTION_NAME)
            .where('userId', '==', userId)
            .where('isActive', '==', true)
            .where('name', '>=', term)
            .where('name', '<', endTerm)
            .limit(10)
            .get();
        return snapshot.docs.map((doc) => doc.data());
    },
};
//# sourceMappingURL=productRepository.js.map
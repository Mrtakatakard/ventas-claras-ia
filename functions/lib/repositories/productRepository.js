"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productRepository = void 0;
const firebase_1 = require("../config/firebase");
const COLLECTION_NAME = "products";
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
            .where("userId", "==", userId)
            .where("code", "==", code)
            .where("isActive", "==", true)
            .get();
        return snapshot.docs.map(doc => doc.data());
    }
};
//# sourceMappingURL=productRepository.js.map
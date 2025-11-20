"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productRepository = void 0;
const index_1 = require("../index");
const COLLECTION_NAME = "products";
exports.productRepository = {
    async create(product) {
        await index_1.db.collection(COLLECTION_NAME).doc(product.id).set(product);
        return product;
    },
    async update(id, data) {
        await index_1.db.collection(COLLECTION_NAME).doc(id).update(data);
    },
    async delete(id) {
        await index_1.db.collection(COLLECTION_NAME).doc(id).update({ isActive: false });
    },
    async get(id) {
        const doc = await index_1.db.collection(COLLECTION_NAME).doc(id).get();
        if (!doc.exists)
            return null;
        return doc.data();
    },
    async findByCode(code, userId) {
        const snapshot = await index_1.db.collection(COLLECTION_NAME)
            .where("userId", "==", userId)
            .where("code", "==", code)
            .where("isActive", "==", true)
            .get();
        return snapshot.docs.map(doc => doc.data());
    }
};
//# sourceMappingURL=productRepository.js.map
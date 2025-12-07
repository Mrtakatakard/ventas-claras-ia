import { db } from "../index";
const COLLECTION_NAME = "products";
export const productRepository = {
    async create(product) {
        await db.collection(COLLECTION_NAME).doc(product.id).set(product);
        return product;
    },
    async update(id, data) {
        await db.collection(COLLECTION_NAME).doc(id).update(data);
    },
    async delete(id) {
        await db.collection(COLLECTION_NAME).doc(id).update({ isActive: false });
    },
    async get(id) {
        const doc = await db.collection(COLLECTION_NAME).doc(id).get();
        if (!doc.exists)
            return null;
        return doc.data();
    },
    async findByCode(code, userId) {
        const snapshot = await db.collection(COLLECTION_NAME)
            .where("userId", "==", userId)
            .where("code", "==", code)
            .where("isActive", "==", true)
            .get();
        return snapshot.docs.map(doc => doc.data());
    }
};
//# sourceMappingURL=productRepository.js.map
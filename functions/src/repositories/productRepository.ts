import { db } from "../index";
import { Product } from "../types";

const COLLECTION_NAME = "products";

export const productRepository = {
    async create(product: Product): Promise<Product> {
        await db.collection(COLLECTION_NAME).doc(product.id).set(product);
        return product;
    },

    async update(id: string, data: Partial<Product>): Promise<void> {
        await db.collection(COLLECTION_NAME).doc(id).update(data);
    },

    async delete(id: string): Promise<void> {
        await db.collection(COLLECTION_NAME).doc(id).update({ isActive: false });
    },

    async get(id: string): Promise<Product | null> {
        const doc = await db.collection(COLLECTION_NAME).doc(id).get();
        if (!doc.exists) return null;
        return doc.data() as Product;
    },

    async findByCode(code: string, userId: string): Promise<Product[]> {
        const snapshot = await db.collection(COLLECTION_NAME)
            .where("userId", "==", userId)
            .where("code", "==", code)
            .where("isActive", "==", true)
            .get();
        return snapshot.docs.map(doc => doc.data() as Product);
    }
};

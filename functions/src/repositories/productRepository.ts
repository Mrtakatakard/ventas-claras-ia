import { db } from '../config/firebase';
import { Product } from '../types';

const COLLECTION_NAME = 'products';

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
            .where('userId', '==', userId)
            .where('code', '==', code)
            .where('isActive', '==', true)
            .get();
        return snapshot.docs.map((doc) => doc.data() as Product);
    },

    async searchByName(term: string, userId: string): Promise<Product[]> {
        // Simple case-sensitive prefix search as Firestore doesn't support full-text natively
        // For production, consider Algolia or TypeSense
        const endTerm = term.replace(/.$/, c => String.fromCharCode(c.charCodeAt(0) + 1));

        const snapshot = await db.collection(COLLECTION_NAME)
            .where('userId', '==', userId)
            .where('isActive', '==', true)
            .where('name', '>=', term)
            .where('name', '<', endTerm)
            .limit(10)
            .get();

        return snapshot.docs.map((doc) => doc.data() as Product);
    },
};

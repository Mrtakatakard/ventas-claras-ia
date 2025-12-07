import { db } from '../config/firebase';
import { Category } from '../types';

const COLLECTION_NAME = 'categories';

export const categoryRepository = {
    async create(category: Category): Promise<void> {
        await db.collection(COLLECTION_NAME).doc(category.id).set(category);
    },

    async findByName(name: string, userId: string): Promise<Category | null> {
        const snapshot = await db.collection(COLLECTION_NAME)
            .where('userId', '==', userId)
            .where('name', '==', name)
            .limit(1)
            .get();

        if (snapshot.empty) return null;
        return snapshot.docs[0].data() as Category;
    },

    async getAll(userId: string): Promise<Category[]> {
        const snapshot = await db.collection(COLLECTION_NAME)
            .where('userId', '==', userId)
            .where('isActive', '==', true)
            .get();
        return snapshot.docs.map((doc) => doc.data() as Category);
    },
};

import { db } from "../index";
const COLLECTION_NAME = "categories";
export const categoryRepository = {
    async create(category) {
        await db.collection(COLLECTION_NAME).doc(category.id).set(category);
    },
    async findByName(name, userId) {
        const snapshot = await db.collection(COLLECTION_NAME)
            .where("userId", "==", userId)
            .where("name", "==", name)
            .limit(1)
            .get();
        if (snapshot.empty)
            return null;
        return snapshot.docs[0].data();
    },
    async getAll(userId) {
        const snapshot = await db.collection(COLLECTION_NAME)
            .where("userId", "==", userId)
            .where("isActive", "==", true)
            .get();
        return snapshot.docs.map(doc => doc.data());
    }
};
//# sourceMappingURL=categoryRepository.js.map
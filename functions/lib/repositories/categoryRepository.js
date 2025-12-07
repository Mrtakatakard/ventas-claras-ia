"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryRepository = void 0;
const firebase_1 = require("../config/firebase");
const COLLECTION_NAME = 'categories';
exports.categoryRepository = {
    async create(category) {
        await firebase_1.db.collection(COLLECTION_NAME).doc(category.id).set(category);
    },
    async findByName(name, userId) {
        const snapshot = await firebase_1.db.collection(COLLECTION_NAME)
            .where('userId', '==', userId)
            .where('name', '==', name)
            .limit(1)
            .get();
        if (snapshot.empty)
            return null;
        return snapshot.docs[0].data();
    },
    async getAll(userId) {
        const snapshot = await firebase_1.db.collection(COLLECTION_NAME)
            .where('userId', '==', userId)
            .where('isActive', '==', true)
            .get();
        return snapshot.docs.map((doc) => doc.data());
    },
};
//# sourceMappingURL=categoryRepository.js.map
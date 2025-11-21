import { db } from "../index";
const COLLECTION_NAME = "quotes";
export const quoteRepository = {
    async create(quote) {
        await db.collection(COLLECTION_NAME).doc(quote.id).set(quote);
    },
    async update(id, data) {
        await db.collection(COLLECTION_NAME).doc(id).update(data);
    },
    async delete(id) {
        await db.collection(COLLECTION_NAME).doc(id).delete();
    },
    async get(id) {
        const doc = await db.collection(COLLECTION_NAME).doc(id).get();
        return doc.exists ? doc.data() : null;
    }
};
//# sourceMappingURL=quoteRepository.js.map
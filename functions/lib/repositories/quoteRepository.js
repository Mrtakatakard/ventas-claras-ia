"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quoteRepository = void 0;
const firebase_1 = require("../config/firebase");
const COLLECTION_NAME = "quotes";
exports.quoteRepository = {
    async create(quote) {
        await firebase_1.db.collection(COLLECTION_NAME).doc(quote.id).set(quote);
    },
    async update(id, data) {
        await firebase_1.db.collection(COLLECTION_NAME).doc(id).update(data);
    },
    async delete(id) {
        await firebase_1.db.collection(COLLECTION_NAME).doc(id).delete();
    },
    async get(id) {
        const doc = await firebase_1.db.collection(COLLECTION_NAME).doc(id).get();
        return doc.exists ? doc.data() : null;
    }
};
//# sourceMappingURL=quoteRepository.js.map
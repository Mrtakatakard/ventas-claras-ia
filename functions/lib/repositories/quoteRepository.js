"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quoteRepository = void 0;
const index_1 = require("../index");
const COLLECTION_NAME = "quotes";
exports.quoteRepository = {
    async create(quote) {
        await index_1.db.collection(COLLECTION_NAME).doc(quote.id).set(quote);
    },
    async update(id, data) {
        await index_1.db.collection(COLLECTION_NAME).doc(id).update(data);
    },
    async delete(id) {
        await index_1.db.collection(COLLECTION_NAME).doc(id).delete();
    },
    async get(id) {
        const doc = await index_1.db.collection(COLLECTION_NAME).doc(id).get();
        return doc.exists ? doc.data() : null;
    }
};
//# sourceMappingURL=quoteRepository.js.map
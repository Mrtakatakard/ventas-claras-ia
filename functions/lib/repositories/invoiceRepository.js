"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoiceRepository = void 0;
const index_1 = require("../index");
const COLLECTION_NAME = "invoices";
exports.invoiceRepository = {
    async create(invoice) {
        await index_1.db.collection(COLLECTION_NAME).doc(invoice.id).set(invoice);
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
    },
    async getReceivables(userId) {
        const snapshot = await index_1.db.collection(COLLECTION_NAME)
            .where("userId", "==", userId)
            .where("balanceDue", ">", 0)
            .get();
        return snapshot.docs.map(doc => doc.data());
    }
};
//# sourceMappingURL=invoiceRepository.js.map
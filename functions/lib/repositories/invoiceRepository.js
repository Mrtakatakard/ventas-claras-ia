import { db } from "../index";
const COLLECTION_NAME = "invoices";
export const invoiceRepository = {
    async create(invoice) {
        await db.collection(COLLECTION_NAME).doc(invoice.id).set(invoice);
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
    },
    async getReceivables(userId) {
        const snapshot = await db.collection(COLLECTION_NAME)
            .where("userId", "==", userId)
            .where("balanceDue", ">", 0)
            .get();
        return snapshot.docs.map(doc => doc.data());
    }
};
//# sourceMappingURL=invoiceRepository.js.map
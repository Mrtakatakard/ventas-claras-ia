import { db } from "../index";
import { Invoice } from "../types";

const COLLECTION_NAME = "invoices";

export const invoiceRepository = {
    async create(invoice: Invoice): Promise<void> {
        await db.collection(COLLECTION_NAME).doc(invoice.id).set(invoice);
    },

    async update(id: string, data: Partial<Invoice>): Promise<void> {
        await db.collection(COLLECTION_NAME).doc(id).update(data);
    },

    async delete(id: string): Promise<void> {
        await db.collection(COLLECTION_NAME).doc(id).delete();
    },

    async get(id: string): Promise<Invoice | null> {
        const doc = await db.collection(COLLECTION_NAME).doc(id).get();
        return doc.exists ? (doc.data() as Invoice) : null;
    },

    async getReceivables(userId: string): Promise<Invoice[]> {
        const snapshot = await db.collection(COLLECTION_NAME)
            .where("userId", "==", userId)
            .where("balanceDue", ">", 0)
            .get();
        return snapshot.docs.map(doc => doc.data() as Invoice);
    }
};

import { db } from "../index";
import { Quote } from "../types";

const COLLECTION_NAME = "quotes";

export const quoteRepository = {
    async create(quote: Quote): Promise<void> {
        await db.collection(COLLECTION_NAME).doc(quote.id).set(quote);
    },

    async update(id: string, data: Partial<Quote>): Promise<void> {
        await db.collection(COLLECTION_NAME).doc(id).update(data);
    },

    async delete(id: string): Promise<void> {
        await db.collection(COLLECTION_NAME).doc(id).delete();
    },

    async get(id: string): Promise<Quote | null> {
        const doc = await db.collection(COLLECTION_NAME).doc(id).get();
        return doc.exists ? (doc.data() as Quote) : null;
    }
};

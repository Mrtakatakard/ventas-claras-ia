import * as admin from "firebase-admin";
import { Client } from "../types";

const db = admin.firestore();

export const ClientRepository = {
    async create(client: Omit<Client, "id">): Promise<Client> {
        const docRef = db.collection("clients").doc();
        const newClient: Client = {
            id: docRef.id,
            ...client,
        };
        await docRef.set(newClient);
        return newClient;
    },

    async update(id: string, data: Partial<Client>): Promise<void> {
        await db.collection("clients").doc(id).update(data);
    },

    async get(id: string): Promise<Client | null> {
        const doc = await db.collection("clients").doc(id).get();
        if (!doc.exists) return null;
        return doc.data() as Client;
    },

    async delete(id: string): Promise<void> {
        // Soft delete
        await db.collection("clients").doc(id).update({ isActive: false });
    }
};

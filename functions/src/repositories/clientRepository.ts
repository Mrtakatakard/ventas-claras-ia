import { db } from '../config/firebase';
import { Client } from '../types';

export const ClientRepository = {
    async create(client: Omit<Client, 'id'>): Promise<Client> {
        const docRef = db.collection('clients').doc();
        const newClient: Client = {
            id: docRef.id,
            ...client,
        };
        await docRef.set(newClient);
        return newClient;
    },

    async update(id: string, data: Partial<Client>): Promise<void> {
        await db.collection('clients').doc(id).update(data);
    },

    async get(id: string): Promise<Client | null> {
        const doc = await db.collection('clients').doc(id).get();
        if (!doc.exists) return null;
        return doc.data() as Client;
    },

    async delete(id: string): Promise<void> {
        // Soft delete
        await db.collection('clients').doc(id).update({ isActive: false });
    },

    async findByPhone(phone: string, userId: string): Promise<Client | null> {
        const snapshot = await db.collection('clients')
            .where('userId', '==', userId)
            .where('phone', '==', phone)
            .where('isActive', '==', true)
            .limit(1)
            .get();

        if (snapshot.empty) return null;
        return snapshot.docs[0].data() as Client;
    },
};

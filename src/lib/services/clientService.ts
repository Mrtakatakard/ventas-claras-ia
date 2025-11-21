import { doc, writeBatch, collection, query, where, limit, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { Client, ClientType } from "../types";
import { COLLECTIONS } from "../constants";
import {
    getDocuments,
    getDocument,
    getDocumentsForAdmin,
    addDocument,
    updateDocument,
    deleteDocument,
    getCollection
} from "../firebase/firestore-utils";

// Clients
export const getClients = (userId: string) => getDocuments<Client>(COLLECTIONS.CLIENTS, userId);
export const getClient = (id: string) => getDocument<Client>(COLLECTIONS.CLIENTS, id);

export const getAllClientsForAdmin = async () => {
    const clients = await getDocumentsForAdmin<Client>(COLLECTIONS.CLIENTS);
    return clients;
};

export const batchAddClients = async (clients: Omit<Client, 'id'>[], userId: string) => {
    const batch = writeBatch(db);
    const clientsCollection = getCollection(COLLECTIONS.CLIENTS);
    clients.forEach(clientData => {
        const docRef = doc(clientsCollection);
        batch.set(docRef, { ...clientData, userId, createdAt: new Date(), isActive: true });
    });
    await batch.commit();
}

// Client Types
export const addClientType = (data: Omit<ClientType, 'id' | 'createdAt' | 'isActive'>, userId: string) =>
    addDocument<Omit<ClientType, 'id' | 'createdAt' | 'isActive'>>(COLLECTIONS.CLIENT_TYPES, data, userId);

export const getClientTypes = (userId: string) => getDocuments<ClientType>(COLLECTIONS.CLIENT_TYPES, userId);

export const updateClientType = (id: string, data: Partial<ClientType>) =>
    updateDocument<Partial<ClientType>>(COLLECTIONS.CLIENT_TYPES, id, data);

export const deleteClientType = async (id: string) => {
    const clientsRef = collection(db, COLLECTIONS.CLIENTS);
    const q = query(clientsRef, where("clientTypeId", "==", id), limit(1));
    const snapshot = await getDocs(q);

    const activeClients = snapshot.docs.filter(doc => doc.data().isActive !== false);

    if (activeClients.length > 0) {
        throw new Error("No se puede eliminar porque este tipo de cliente está asignado a uno o más clientes activos.");
    }
    await deleteDocument(COLLECTIONS.CLIENT_TYPES, id);
};

import { ClientRepository } from '../repositories/clientRepository';
import { Client } from '../types';
import { HttpsError } from 'firebase-functions/v2/https';

export const ClientService = {
    async createClient(data: any, userId: string): Promise<Client> {
        // Basic Validation
        if (!data.name || !data.phone) {
            throw new HttpsError('invalid-argument', 'El nombre y el teléfono son obligatorios.');
        }

        const newClient: Omit<Client, 'id'> = {
            name: data.name,
            phone: data.phone,
            birthday: data.birthday || '',
            email: data.email || '',
            addresses: data.addresses || [],
            clientTypeId: data.clientTypeId || '',
            clientTypeName: data.clientTypeName || '',
            userId: userId,
            createdAt: new Date(),
            isActive: true,
            reminders: [],
            followUpChecks: {
                gaveSample: false,
                askedForReferrals: false,
                addedValue: false,
                invitedToChallenge: false,
                addedToBroadcast: false,
                gavePlan: false,
            },
        };

        return await ClientRepository.create(newClient);
    },

    async updateClient(id: string, data: any, userId: string): Promise<void> {
        const client = await ClientRepository.get(id);

        if (!client) {
            throw new HttpsError('not-found', 'Cliente no encontrado.');
        }

        if (client.userId !== userId) {
            throw new HttpsError('permission-denied', 'No tienes permiso para editar este cliente.');
        }

        // Prevent overwriting critical fields
        delete data.id;
        delete data.userId;
        delete data.createdAt;

        await ClientRepository.update(id, data);
    },

    async deleteClient(id: string, userId: string): Promise<void> {
        const client = await ClientRepository.get(id);

        if (!client) {
            throw new HttpsError('not-found', 'Cliente no encontrado.');
        }

        if (client.userId !== userId) {
            throw new HttpsError('permission-denied', 'No tienes permiso para eliminar este cliente.');
        }

        await ClientRepository.delete(id);
    },
};

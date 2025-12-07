"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientService = void 0;
const clientRepository_1 = require("../repositories/clientRepository");
const https_1 = require("firebase-functions/v2/https");
exports.ClientService = {
    async createClient(data, userId) {
        // Basic Validation
        if (!data.name || !data.phone) {
            throw new https_1.HttpsError('invalid-argument', 'El nombre y el teléfono son obligatorios.');
        }
        const newClient = {
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
        return await clientRepository_1.ClientRepository.create(newClient);
    },
    async updateClient(id, data, userId) {
        const client = await clientRepository_1.ClientRepository.get(id);
        if (!client) {
            throw new https_1.HttpsError('not-found', 'Cliente no encontrado.');
        }
        if (client.userId !== userId) {
            throw new https_1.HttpsError('permission-denied', 'No tienes permiso para editar este cliente.');
        }
        // Prevent overwriting critical fields
        delete data.id;
        delete data.userId;
        delete data.createdAt;
        await clientRepository_1.ClientRepository.update(id, data);
    },
    async deleteClient(id, userId) {
        const client = await clientRepository_1.ClientRepository.get(id);
        if (!client) {
            throw new https_1.HttpsError('not-found', 'Cliente no encontrado.');
        }
        if (client.userId !== userId) {
            throw new https_1.HttpsError('permission-denied', 'No tienes permiso para eliminar este cliente.');
        }
        await clientRepository_1.ClientRepository.delete(id);
    },
};
//# sourceMappingURL=clientService.js.map
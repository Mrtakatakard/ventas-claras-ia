import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { ClientService } from '../services/clientService';

export const createClient = onCall({ cors: true }, async (request: CallableRequest) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
    }

    return await ClientService.createClient(request.data, request.auth.uid);
});

export const updateClient = onCall({ cors: true }, async (request: CallableRequest) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
    }

    const { id, ...data } = request.data;
    if (!id) {
        throw new HttpsError('invalid-argument', 'El ID del cliente es obligatorio.');
    }

    await ClientService.updateClient(id, data, request.auth.uid);
    return { success: true };
});

export const deleteClient = onCall({ cors: true }, async (request: CallableRequest) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
    }

    const { id } = request.data;
    if (!id) {
        throw new HttpsError('invalid-argument', 'El ID del cliente es obligatorio.');
    }

    await ClientService.deleteClient(id, request.auth.uid);
    return { success: true };
});

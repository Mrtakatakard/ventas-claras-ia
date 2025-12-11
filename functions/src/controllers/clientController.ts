import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { ClientService } from '../services/clientService';

export const clients = onCall({ cors: true, maxInstances: 1, cpu: 0.5 }, async (request: CallableRequest) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
    }

    const { action, data } = request.data;

    try {
        switch (action) {
            case 'create':
                return await ClientService.createClient(data, request.auth.uid);

            case 'update': {
                const { id, ...updateData } = data;
                if (!id) throw new HttpsError('invalid-argument', 'El ID del cliente es obligatorio para actualizar.');
                await ClientService.updateClient(id, updateData, request.auth.uid);
                return { success: true };
            }

            case 'delete': {
                const { id } = data;
                if (!id) throw new HttpsError('invalid-argument', 'El ID del cliente es obligatorio para eliminar.');
                await ClientService.deleteClient(id, request.auth.uid);
                return { success: true };
            }

            default:
                throw new HttpsError('invalid-argument', `Acción desconocida: ${action}`);
        }
    } catch (error: any) {
        console.error(`Error in clients controller (${action}):`, error);
        throw error;
    }
});

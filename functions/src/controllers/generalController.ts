
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { db } from "../config/firebase";

export const general = onCall({ cors: true, maxInstances: 5 }, async (request: CallableRequest) => {
    const { action, data } = request.data;

    // Note: contactRequest might come from external source (landing), so we need to ensure the payload structure matches.
    // If the landing sends { name, email... } directly, this refactor might BREAK it if it expects a specific function name.
    // However, given the user instruction, we are consolidating.
    // We assume the landing page can be updated or we check safely.
    // Actually, for `searchRnc`, we control the client.

    // Safety check for Action
    if (!action) {
        throw new HttpsError('invalid-argument', 'Action is required');
    }

    try {
        switch (action) {
            case 'contactRequest':
                return handleContactRequest(data);
            default:
                throw new HttpsError('invalid-argument', `Unknown action: ${action}`);
        }
    } catch (error: any) {
        logger.error(`Error in general controller (${action})`, error);
        throw error;
    }
});

async function handleContactRequest(data: any) {
    const { name, email, company, message } = data;

    if (!name || !email || !company || !message) {
        throw new HttpsError('invalid-argument', 'Todos los campos son requeridos.');
    }

    if (typeof email !== 'string' || !email.includes('@')) {
        throw new HttpsError('invalid-argument', 'El correo electrónico no es válido.');
    }

    logger.info(`Nueva solicitud de contacto de: ${email}`);

    try {
        await db.collection('contactRequests').add({
            name,
            email,
            company,
            message,
            status: 'new',
            createdAt: new Date(),
        });
        return { success: true, message: 'Solicitud recibida.' };
    } catch (error) {
        logger.error('Error al guardar la solicitud de contacto:', error);
        throw new HttpsError('internal', 'Ocurrió un error al procesar tu solicitud.');
    }
}

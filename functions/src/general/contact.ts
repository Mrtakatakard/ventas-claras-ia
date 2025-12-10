
/**
 * @fileoverview Cloud Function to handle contact form submissions from the landing page.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { db } from '../config/firebase';

// This is a public-facing function.
// It's configured with `cors: true` to be callable from the landing page.
export const contactRequest = onCall({ cors: true, maxInstances: 1 }, async (request) => {
    const { name, email, company, message } = request.data;

    // Basic validation
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

        logger.info(`Solicitud de ${email} guardada exitosamente en Firestore.`);
        return { success: true, message: 'Solicitud recibida.' };
    } catch (error) {
        logger.error('Error al guardar la solicitud de contacto:', error);
        throw new HttpsError('internal', 'Ocurrió un error al procesar tu solicitud.');
    }
});

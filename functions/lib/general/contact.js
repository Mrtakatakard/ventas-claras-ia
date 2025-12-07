"use strict";
/**
 * @fileoverview Cloud Function to handle contact form submissions from the landing page.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactRequest = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const firebase_1 = require("../config/firebase");
// This is a public-facing function.
// It's configured with `cors: true` to be callable from the landing page.
exports.contactRequest = (0, https_1.onCall)({ cors: true }, async (request) => {
    const { name, email, company, message } = request.data;
    // Basic validation
    if (!name || !email || !company || !message) {
        throw new https_1.HttpsError("invalid-argument", "Todos los campos son requeridos.");
    }
    if (typeof email !== 'string' || !email.includes('@')) {
        throw new https_1.HttpsError("invalid-argument", "El correo electrónico no es válido.");
    }
    logger.info(`Nueva solicitud de contacto de: ${email}`);
    try {
        await firebase_1.db.collection("contactRequests").add({
            name,
            email,
            company,
            message,
            status: 'new',
            createdAt: new Date(),
        });
        logger.info(`Solicitud de ${email} guardada exitosamente en Firestore.`);
        return { success: true, message: "Solicitud recibida." };
    }
    catch (error) {
        logger.error("Error al guardar la solicitud de contacto:", error);
        throw new https_1.HttpsError("internal", "Ocurrió un error al procesar tu solicitud.");
    }
});
//# sourceMappingURL=contact.js.map
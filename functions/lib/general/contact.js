"use strict";
/**
 * @fileoverview Cloud Function to handle contact form submissions from the landing page.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactRequest = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const db = admin.firestore();
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
        await db.collection("contactRequests").add({
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
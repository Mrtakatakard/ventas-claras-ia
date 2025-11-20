"use strict";
/**
 * @fileoverview Cloud Function to handle team member invitations.
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
exports.inviteTeamMember = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const db = admin.firestore();
const auth = admin.auth();
exports.inviteTeamMember = (0, https_1.onCall)(async (request) => {
    var _a;
    // Ensure the user is authenticated before proceeding.
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Debes estar autenticado para realizar esta acción.");
    }
    const { name, email, role, planId } = request.data;
    const inviterUid = request.auth.uid; // Now guaranteed to exist.
    // Authorization check: only admins or superAdmins can invite
    const inviterProfileRef = db.collection("users").doc(inviterUid);
    const inviterProfileSnap = await inviterProfileRef.get();
    const inviterRole = (_a = inviterProfileSnap.data()) === null || _a === void 0 ? void 0 : _a.role;
    if (!inviterProfileSnap.exists || !['admin', 'superAdmin'].includes(inviterRole)) {
        throw new https_1.HttpsError('permission-denied', 'No tienes permiso para invitar a nuevos miembros.');
    }
    // Input validation
    if (!name || !email || !role) {
        throw new https_1.HttpsError("invalid-argument", "Faltan los datos de nombre, email o rol.");
    }
    logger.info(`Iniciando invitación para ${email} por ${request.auth.token.email} (UID: ${inviterUid})`);
    try {
        // 1. Create user in Firebase Auth
        const userRecord = await auth.createUser({
            email: email,
            emailVerified: false,
            displayName: name,
            disabled: false,
        });
        logger.info(`Usuario de Auth creado: ${userRecord.uid}`);
        // 2. Create user profile in Firestore
        const userProfileRef = db.collection("users").doc(userRecord.uid);
        await userProfileRef.set({
            name: name,
            email: email,
            role: role,
            status: 'pending', // User is pending until they log in for the first time
            planId: planId || 'pro', // Use the passed plan or default to 'pro'
            invitedBy: inviterUid, // Link to the inviting admin
            createdAt: new Date(),
            isActive: true, // Ensure the user is active by default
        });
        logger.info(`Perfil de Firestore creado para ${userRecord.uid} con invitedBy: ${inviterUid}`);
        logger.info(`Invitación para ${email} procesada exitosamente.`);
        return { success: true, message: `Invitación enviada a ${email}.` };
    }
    catch (error) {
        logger.error("Error al invitar miembro:", error);
        if (error.code === 'auth/email-already-exists') {
            throw new https_1.HttpsError('already-exists', 'Este correo electrónico ya está en uso.');
        }
        throw new https_1.HttpsError("internal", "Ocurrió un error inesperado al procesar la invitación.");
    }
});
//# sourceMappingURL=invite.js.map
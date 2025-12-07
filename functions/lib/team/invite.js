"use strict";
/**
 * @fileoverview Cloud Function to handle team member invitations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.inviteTeamMember = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const firebase_1 = require("../config/firebase");
exports.inviteTeamMember = (0, https_1.onCall)(async (request) => {
    var _a;
    // Ensure the user is authenticated before proceeding.
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Debes estar autenticado para realizar esta acción.");
    }
    const { name, email, role, planId } = request.data;
    const inviterUid = request.auth.uid; // Now guaranteed to exist.
    // Authorization check: only admins or superAdmins can invite
    const inviterProfileRef = firebase_1.db.collection("users").doc(inviterUid);
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
        const userRecord = await firebase_1.auth.createUser({
            email: email,
            emailVerified: false,
            displayName: name,
            disabled: false,
        });
        logger.info(`Usuario de Auth creado: ${userRecord.uid}`);
        // 2. Create user profile in Firestore
        const userProfileRef = firebase_1.db.collection("users").doc(userRecord.uid);
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
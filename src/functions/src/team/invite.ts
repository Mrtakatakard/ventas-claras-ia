
/**
 * @fileoverview Cloud Function to handle team member invitations.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

const db = admin.firestore();
const auth = admin.auth();

export const inviteTeamMember = onCall(async (request) => {
  // Ensure the user is authenticated before proceeding.
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes estar autenticado para realizar esta acción.");
  }
  
  const { name, email, role, planId } = request.data;
  const inviterUid = request.auth.uid; // Now guaranteed to exist.

  // Authorization check: only admins or superAdmins can invite
  const inviterProfileRef = db.collection("users").doc(inviterUid);
  const inviterProfileSnap = await inviterProfileRef.get();
  const inviterRole = inviterProfileSnap.data()?.role;

  if (!inviterProfileSnap.exists() || !['admin', 'superAdmin'].includes(inviterRole)) {
      throw new HttpsError('permission-denied', 'No tienes permiso para invitar a nuevos miembros.');
  }

  // Input validation
  if (!name || !email || !role) {
    throw new HttpsError("invalid-argument", "Faltan los datos de nombre, email o rol.");
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
    
  } catch (error: any) {
    logger.error("Error al invitar miembro:", error);
    if (error.code === 'auth/email-already-exists') {
        throw new HttpsError('already-exists', 'Este correo electrónico ya está en uso.');
    }
    throw new HttpsError("internal", "Ocurrió un error inesperado al procesar la invitación.");
  }
});

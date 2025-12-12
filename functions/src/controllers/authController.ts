import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { db } from '../config/firebase';
// import { PLAN_DEFAULTS } from '../../../src/lib/constants'; // Avoid relative imports from outside functions root

// Replicate constants to avoid build issues with relative paths outside functions root
// Ideally this should be in a shared package, but for now we inline to keep it simple and robust.
const FREE_PLAN_DEFAULTS = {
    limits: {
        invoicesPerMonth: 20,
        aiCreditsPerMonth: 10,
        usersLimit: 1,
        hasDigitalMenu: false,
        hasWhatsAppBot: false,
    },
};

export const createAccount = onCall({ maxInstances: 10 }, async (request) => {
    // 1. Security Barrier: Authentication Required
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes iniciar sesión con Google primero.');
    }

    const { companyName, industry } = request.data;
    const uid = request.auth.uid;
    const email = request.auth.token.email || '';
    const name = request.auth.token.name || 'Usuario';

    // 2. Validation
    if (!companyName || companyName.trim().length < 3) {
        throw new HttpsError('invalid-argument', 'El nombre de la empresa es obligatorio (mínimo 3 caracteres).');
    }

    try {
        // 3. ATOMIC TRANSACTION (Pro Feature: Data Integrity)
        // We create everything or nothing. No zombies.
        const result = await db.runTransaction(async (transaction) => {
            // Check if user already exists to prevent double registration
            const userRef = db.collection('users').doc(uid);
            const userSnap = await transaction.get(userRef);

            if (userSnap.exists) {
                throw new HttpsError('already-exists', 'Este usuario ya tiene una cuenta registrada.');
            }

            // Generate new Organization ID automatically
            const newOrgRef = db.collection('organizations').doc();
            const orgId = newOrgRef.id;

            // Prepare Organization Data
            const orgData = {
                id: orgId,
                name: companyName,
                industry: industry || 'retail',
                ownerId: uid,
                plan: 'free',
                subscriptionStatus: 'active',
                limits: FREE_PLAN_DEFAULTS.limits,
                addOns: {
                    extraInvoices: 0,
                    extraAICredits: 0,
                },
                usage: {
                    periodStart: new Date().toISOString().split('T')[0], // YYYY-MM-DD
                    invoicesCreatedThisPeriod: 0,
                    aiCreditsUsedThisPeriod: 0,
                },
                createdAt: new Date(),
                isActive: true,
            };

            // Prepare User Data
            const userData = {
                name,
                email,
                role: 'superAdmin', // Owner of the org
                organizationId: orgId,
                organizationRole: 'owner',
                status: 'active',
                createdAt: new Date(),
                isActive: true,
            };

            // Execute Writes
            transaction.set(newOrgRef, orgData);
            transaction.set(userRef, userData);

            return { orgId };
        });

        // 4. Structured Logging (Pro Feature: Observability)
        logger.info("NEW_ORGANIZATION_CREATED", {
            action: "register",
            success: true,
            uid,
            orgId: result.orgId,
            companyName,
            plan: 'free'
        });

        return { success: true, organizationId: result.orgId };

    } catch (error: any) {
        logger.error("REGISTRATION_FAILED", { uid, error: error.message });

        if (error instanceof HttpsError) throw error;

        throw new HttpsError('internal', 'Error al crear la cuenta. Inténtalo de nuevo.');
    }
});

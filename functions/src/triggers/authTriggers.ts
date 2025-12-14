import * as functions from 'firebase-functions/v1';
import { db } from '../config/firebase';

const FREE_PLAN_DEFAULTS = {
    limits: {
        invoicesPerMonth: 20,
        aiCreditsPerMonth: 10,
        usersLimit: 1,
        hasDigitalMenu: false,
        hasWhatsAppBot: false,
    },
};

/**
 * Trigger: On User Created (Auth)
 * Purpose: Automatically provision an Organization for new users (e.g. Google Sign-In)
 *          who bypass the manual 'register' flow.
 */
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
    const { uid, email, displayName } = user;

    console.log(`[AuthTrigger] New user created: ${uid} (${email})`);

    try {
        await db.runTransaction(async (transaction) => {
            // 1. Check if user profile already exists
            const userRef = db.collection('users').doc(uid);
            const userDoc = await transaction.get(userRef);

            if (userDoc.exists) {
                console.log(`[AuthTrigger] User profile already exists. Skipping provisioning for ${uid}.`);
                return;
            }

            // 2. Create new Organization
            const newOrgRef = db.collection('organizations').doc();
            const orgId = newOrgRef.id;
            const companyName = displayName ? `${displayName}'s Org` : 'Mi Empresa';

            const orgData = {
                id: orgId,
                name: companyName,
                industry: 'other',
                ownerId: uid,
                plan: 'free',
                subscriptionStatus: 'active',
                limits: FREE_PLAN_DEFAULTS.limits,
                addOns: {
                    extraInvoices: 0,
                    extraAICredits: 0,
                },
                usage: {
                    periodStart: new Date().toISOString().split('T')[0],
                    invoicesCreatedThisPeriod: 0,
                    aiCreditsUsedThisPeriod: 0,
                },
                createdAt: new Date(),
                isActive: true,
            };

            // 3. Create User Profile linked to Org
            const userData = {
                name: displayName || 'Usuario',
                email: email || '',
                role: 'superAdmin',
                organizationId: orgId,
                organizationRole: 'owner',
                status: 'active',
                createdAt: new Date(),
                isActive: true,
            };

            transaction.set(newOrgRef, orgData);
            transaction.set(userRef, userData);
        });

        console.log(`[AuthTrigger] Successfully provisioned org and profile for user ${uid}.`);
    } catch (error) {
        console.error(`[AuthTrigger] Error provisioning user ${uid}:`, error);
        // We don't throw here to avoid infinite retries if it's a logic error,
        // but in production you might want retry logic.
    }
});

import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// Check if already initialized to avoid "default app already exists" errors
if (!admin.apps.length) {
    admin.initializeApp();
}

export const app = admin.app();
export const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });
export const auth = admin.auth();

import 'server-only';
import { initializeApp, getApps, getApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Lazily initialize admin app
export function getAdminApp() {
    if (getApps().length > 0) {
        return getApp();
    }

    // Use environment variables or default credentials
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
        : undefined;

    return initializeApp({
        credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    });
}

export function getAdminDb() {
    return getFirestore(getAdminApp());
}

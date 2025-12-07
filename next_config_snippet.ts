
// ... imports

// Helper to load Firebase App Hosting config
const getFirebaseAppHostingEnv = () => {
    try {
        const configStr = process.env.FIREBASE_WEBAPP_CONFIG;
        if (configStr) {
            const config = JSON.parse(configStr);
            return {
                NEXT_PUBLIC_FIREBASE_API_KEY: config.apiKey,
                NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: config.authDomain,
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: config.projectId,
                NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: config.storageBucket,
                NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: config.messagingSenderId,
                NEXT_PUBLIC_FIREBASE_APP_ID: config.appId,
                NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: config.measurementId,
            };
        }
    } catch (e) {
        console.warn("Failed to parse FIREBASE_WEBAPP_CONFIG", e);
    }
    return {};
};

const nextConfig: NextConfig = {
    env: {
        ...getFirebaseAppHostingEnv(),
    },
    // ... rest of config
};

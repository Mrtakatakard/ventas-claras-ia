import { z } from 'zod';

/**
 * Environment variables schema for validation.
 * Ensures all required Firebase config is present at startup.
 */
const envSchema = z.object({
    NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1, 'Firebase API Key is required'),
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1, 'Firebase Auth Domain is required'),
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1, 'Firebase Project ID is required'),
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1, 'Firebase Storage Bucket is required'),
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1, 'Firebase Messaging Sender ID is required'),
    NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1, 'Firebase App ID is required'),
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().optional(), // Optional for Analytics
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates and returns typed environment variables.
 * Throws an error if validation fails.
 */
export function validateEnv(): Env {
    try {
        return envSchema.parse({
            NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
            NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
            NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            const missingVars = error.errors.map(e => e.path.join('.')).join(', ');
            throw new Error(
                `❌ Missing or invalid environment variables: ${missingVars}\n\n` +
                `Please ensure all required Firebase configuration variables are set in your .env.local file.\n` +
                `See .env.production.template for reference.`
            );
        }
        throw error;
    }
}

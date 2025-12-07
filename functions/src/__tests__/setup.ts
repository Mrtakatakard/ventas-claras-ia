import { beforeAll } from 'vitest'
import * as admin from 'firebase-admin'

// Initialize Firebase Admin for testing
beforeAll(() => {
    if (!admin.apps.length) {
        admin.initializeApp({
            projectId: 'test-project',
        })
    }
})

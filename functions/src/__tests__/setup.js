"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vitest_1 = require("vitest");
var admin = require("firebase-admin");
// Initialize Firebase Admin for testing
(0, vitest_1.beforeAll)(function () {
    if (!admin.apps.length) {
        admin.initializeApp({
            projectId: 'test-project',
        });
    }
});

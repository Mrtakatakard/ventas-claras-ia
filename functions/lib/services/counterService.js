"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.counterService = void 0;
const index_1 = require("../index");
const functions = __importStar(require("firebase-functions"));
/**
 * Service for managing sequential counters in Firestore.
 * Used for generating invoice numbers, quote numbers, etc.
 */
exports.counterService = {
    /**
     * Gets the next sequential number for a given counter type.
     * Uses a Firestore transaction to ensure uniqueness.
     *
     * @param counterType - Type of counter (e.g., 'invoices', 'quotes')
     * @param userId - User ID to scope the counter
     * @param prefix - Optional prefix for the number (e.g., 'INV', 'QT')
     * @param padding - Number of digits to pad (default: 6)
     * @returns Formatted number string (e.g., 'INV-000001')
     */
    async getNextNumber(counterType, userId, prefix = '', padding = 6) {
        const counterRef = index_1.db.collection('counters').doc(`${userId}_${counterType}`);
        try {
            const nextValue = await index_1.db.runTransaction(async (transaction) => {
                var _a;
                const counterDoc = await transaction.get(counterRef);
                let currentValue = 0;
                if (counterDoc.exists) {
                    currentValue = ((_a = counterDoc.data()) === null || _a === void 0 ? void 0 : _a.current) || 0;
                }
                const nextValue = currentValue + 1;
                // Update or create the counter document
                transaction.set(counterRef, {
                    current: nextValue,
                    lastUpdated: new Date(),
                    userId: userId,
                    type: counterType
                }, { merge: true });
                return nextValue;
            });
            // Format the number with padding
            const paddedNumber = String(nextValue).padStart(padding, '0');
            return prefix ? `${prefix}-${paddedNumber}` : paddedNumber;
        }
        catch (error) {
            console.error(`Error getting next ${counterType} number:`, error);
            throw new functions.https.HttpsError('internal', `Failed to generate ${counterType} number`);
        }
    },
    /**
     * Initializes a counter for a user if it doesn't exist.
     * Useful for setting up counters for existing users.
     *
     * @param counterType - Type of counter
     * @param userId - User ID
     * @param startValue - Starting value (default: 0)
     */
    async initializeCounter(counterType, userId, startValue = 0) {
        const counterRef = index_1.db.collection('counters').doc(`${userId}_${counterType}`);
        const counterDoc = await counterRef.get();
        if (!counterDoc.exists) {
            await counterRef.set({
                current: startValue,
                lastUpdated: new Date(),
                userId: userId,
                type: counterType
            });
        }
    }
};
//# sourceMappingURL=counterService.js.map
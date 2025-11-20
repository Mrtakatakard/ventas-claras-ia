"use strict";
/**
 * @fileoverview Cloud Function to handle fetching accounts receivable.
 */
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
exports.getAccountsReceivable = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const db = admin.firestore();
exports.getAccountsReceivable = (0, https_1.onCall)(async (request) => {
    // 1. Authentication check
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Debes estar autenticado para realizar esta acción.");
    }
    const uid = request.auth.uid;
    logger.info(`Fetching accounts receivable for user: ${uid}`);
    try {
        // 2. Query for invoices with a balance due
        const invoicesRef = db.collection('invoices');
        const q = invoicesRef
            .where('userId', '==', uid)
            .where('balanceDue', '>', 0);
        const querySnapshot = await q.get();
        // 3. Map the results
        const receivableInvoices = querySnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        logger.info(`Found ${receivableInvoices.length} receivable invoices for user: ${uid}`);
        return { invoices: receivableInvoices };
    }
    catch (error) {
        logger.error("Error fetching accounts receivable:", error);
        // This could happen if the composite index is not created yet.
        // The error message in the Firebase console will contain a link to create it.
        throw new https_1.HttpsError("failed-precondition", "No se pudieron cargar los datos porque falta un índice en la base de datos. Revisa los logs de la función en la consola de Firebase para encontrar un enlace para crearlo automáticamente.");
    }
});
//# sourceMappingURL=receivables.js.map
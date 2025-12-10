"use strict";
/**
 * @fileoverview Cloud Function to handle fetching accounts receivable.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAccountsReceivable = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const firebase_1 = require("../config/firebase");
exports.getAccountsReceivable = (0, https_1.onCall)({ maxInstances: 1 }, async (request) => {
    // 1. Authentication check
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Debes estar autenticado para realizar esta acción.');
    }
    const uid = request.auth.uid;
    logger.info(`Fetching accounts receivable for user: ${uid}`);
    try {
        // 2. Query for invoices with a balance due
        const invoicesRef = firebase_1.db.collection('invoices');
        const q = invoicesRef
            .where('userId', '==', uid);
        const querySnapshot = await q.get();
        // 3. Map the results
        const receivableInvoices = querySnapshot.docs
            .map((doc) => (Object.assign({ id: doc.id }, doc.data()))) // Type assertion for cleaner code
            .filter((invoice) => invoice.balanceDue > 0);
        logger.info(`Found ${receivableInvoices.length} receivable invoices for user: ${uid}`);
        return { invoices: receivableInvoices };
    }
    catch (error) {
        logger.error('Error fetching accounts receivable:', error);
        // This could happen if the composite index is not created yet.
        // The error message in the Firebase console will contain a link to create it.
        throw new https_1.HttpsError('failed-precondition', 'No se pudieron cargar los datos porque falta un índice en la base de datos. Revisa los logs de la función en la consola de Firebase para encontrar un enlace para crearlo automáticamente.');
    }
});
//# sourceMappingURL=receivables.js.map
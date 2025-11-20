"use strict";
/**
 * @fileoverview Cloud Function to handle deleting an invoice and adjusting stock.
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
exports.deleteInvoiceAndAdjustStock = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const db = admin.firestore();
exports.deleteInvoiceAndAdjustStock = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Debes estar autenticado para realizar esta acción.");
    }
    const { invoiceId } = request.data;
    if (!invoiceId) {
        throw new https_1.HttpsError("invalid-argument", "Se requiere el ID de la factura.");
    }
    const uid = request.auth.uid;
    const invoiceRef = db.collection('invoices').doc(invoiceId);
    try {
        await db.runTransaction(async (transaction) => {
            var _a;
            // 1. Read the invoice
            const invoiceDoc = await transaction.get(invoiceRef);
            if (!invoiceDoc.exists) {
                throw new https_1.HttpsError("not-found", "La factura no existe.");
            }
            const invoice = invoiceDoc.data();
            if (!invoice) {
                throw new https_1.HttpsError("data-loss", "No se encontraron datos en la factura.");
            }
            // 2. Authorization check
            if (invoice.userId !== uid) {
                throw new https_1.HttpsError("permission-denied", "No tienes permiso para eliminar esta factura.");
            }
            // 3. Validation: Can't delete if it has payments
            if (invoice.payments && invoice.payments.length > 0) {
                throw new https_1.HttpsError("failed-precondition", "No se pueden eliminar facturas con pagos aplicados.");
            }
            // 4. Adjust product stock for each item in the invoice
            if (invoice.items && invoice.items.length > 0) {
                for (const item of invoice.items) {
                    const productRef = db.collection('products').doc(item.productId);
                    const productDoc = await transaction.get(productRef);
                    if (productDoc.exists) {
                        const currentStock = ((_a = productDoc.data()) === null || _a === void 0 ? void 0 : _a.stock) || 0;
                        const newStock = currentStock + item.quantity;
                        transaction.update(productRef, { stock: newStock });
                        logger.info(`Stock for product ${item.productId} adjusted from ${currentStock} to ${newStock}.`);
                    }
                    else {
                        logger.warn(`Product ${item.productId} not found for stock adjustment during invoice deletion.`);
                    }
                }
            }
            // 5. Delete the invoice
            transaction.delete(invoiceRef);
        });
        logger.info(`Invoice ${invoiceId} deleted successfully by user ${uid}.`);
        return { success: true, message: "Factura eliminada y stock ajustado correctamente." };
    }
    catch (error) {
        logger.error(`Error deleting invoice ${invoiceId}:`, error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "Ocurrió un error inesperado al eliminar la factura.");
    }
});
//# sourceMappingURL=deleteInvoice.js.map
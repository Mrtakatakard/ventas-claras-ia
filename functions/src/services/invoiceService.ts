import { invoiceRepository } from "../repositories/invoiceRepository";
import { Invoice } from "../types";
import { db } from "../index";
import * as functions from "firebase-functions";

export const invoiceService = {
    async createInvoice(invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'isActive'>, userId: string): Promise<string> {
        const invoiceId = db.collection("invoices").doc().id;
        const newInvoice: Invoice = {
            ...invoiceData,
            id: invoiceId,
            userId,
            createdAt: new Date(),
            isActive: true
        };

        await db.runTransaction(async (transaction) => {
            // 1. Check stock availability and decrement
            for (const item of newInvoice.items) {
                const productRef = db.collection("products").doc(item.productId);
                const productDoc = await transaction.get(productRef);

                if (!productDoc.exists) {
                    throw new functions.https.HttpsError("not-found", `Producto ${item.productName} no encontrado.`);
                }

                const currentStock = productDoc.data()?.stock || 0;
                if (currentStock < item.quantity) {
                    throw new functions.https.HttpsError("failed-precondition", `Stock insuficiente para ${item.productName}. Disponible: ${currentStock}, Solicitado: ${item.quantity}`);
                }

                transaction.update(productRef, { stock: currentStock - item.quantity });
            }

            // 2. Create Invoice
            const invoiceRef = db.collection("invoices").doc(invoiceId);
            transaction.set(invoiceRef, newInvoice);
        });

        return invoiceId;
    },

    async updateInvoice(id: string, updatedData: Partial<Invoice>, userId: string): Promise<void> {
        await db.runTransaction(async (transaction) => {
            const invoiceRef = db.collection("invoices").doc(id);
            const invoiceDoc = await transaction.get(invoiceRef);

            if (!invoiceDoc.exists) {
                throw new functions.https.HttpsError("not-found", "Factura no encontrada.");
            }

            const currentInvoice = invoiceDoc.data() as Invoice;
            if (currentInvoice.userId !== userId) {
                throw new functions.https.HttpsError("permission-denied", "No tienes permiso para editar esta factura.");
            }

            // If items are modified, handle stock adjustments
            if (updatedData.items) {
                // 1. Identify all unique product IDs involved (old and new)
                const productIds = new Set<string>();
                currentInvoice.items.forEach(item => productIds.add(item.productId));
                updatedData.items.forEach(item => productIds.add(item.productId));

                // 2. Read all product documents
                const productDocs: { [key: string]: any } = {};
                for (const pid of Array.from(productIds)) {
                    const ref = db.collection("products").doc(pid);
                    const doc = await transaction.get(ref);
                    if (doc.exists) {
                        productDocs[pid] = { ref, data: doc.data() };
                    }
                }

                // 3. Calculate stock changes
                // Revert old items
                for (const item of currentInvoice.items) {
                    if (productDocs[item.productId]) {
                        productDocs[item.productId].data.stock += item.quantity;
                    }
                }

                // Apply new items
                for (const item of updatedData.items) {
                    if (!productDocs[item.productId]) {
                        throw new functions.https.HttpsError("not-found", `Producto ${item.productName} no encontrado (ID: ${item.productId}).`);
                    }
                    const product = productDocs[item.productId];
                    if (product.data.stock < item.quantity) {
                        throw new functions.https.HttpsError("failed-precondition", `Stock insuficiente para ${item.productName}. Disponible: ${product.data.stock}, Solicitado: ${item.quantity}`);
                    }
                    product.data.stock -= item.quantity;
                }

                // 4. Write stock updates
                for (const pid of Object.keys(productDocs)) {
                    transaction.update(productDocs[pid].ref, { stock: productDocs[pid].data.stock });
                }
            }

            // 5. Update Invoice
            transaction.update(invoiceRef, {
                ...updatedData,
                // Ensure we don't overwrite critical fields if not intended, though Partial<Invoice> allows it.
                // Ideally we should sanitize updatedData but trusting the caller for now as it's our own API.
            });
        });
    },

    async deleteInvoice(id: string, userId: string): Promise<void> {
        await db.runTransaction(async (transaction) => {
            const invoiceRef = db.collection("invoices").doc(id);
            const invoiceDoc = await transaction.get(invoiceRef);

            if (!invoiceDoc.exists) {
                throw new functions.https.HttpsError("not-found", "Factura no encontrada.");
            }

            const invoice = invoiceDoc.data() as Invoice;
            if (invoice.userId !== userId) {
                throw new functions.https.HttpsError("permission-denied", "No tienes permiso para eliminar esta factura.");
            }

            if (invoice.payments && invoice.payments.length > 0) {
                throw new functions.https.HttpsError("failed-precondition", "No se pueden eliminar facturas con pagos aplicados.");
            }

            // Restore stock
            for (const item of invoice.items) {
                const productRef = db.collection("products").doc(item.productId);
                const productDoc = await transaction.get(productRef);

                if (productDoc.exists) {
                    const currentStock = productDoc.data()?.stock || 0;
                    transaction.update(productRef, { stock: currentStock + item.quantity });
                }
            }

            transaction.delete(invoiceRef);
        });
    },

    async getReceivables(userId: string): Promise<Invoice[]> {
        return await invoiceRepository.getReceivables(userId);
    }
};

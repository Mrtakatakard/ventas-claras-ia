"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPayment = exports.getReceivables = exports.deleteInvoice = exports.updateInvoice = exports.createInvoice = void 0;
const invoiceRepository_1 = require("../repositories/invoiceRepository");
const firebase_1 = require("../config/firebase");
const functions = require("firebase-functions");
const firestore_1 = require("firebase-admin/firestore");
const counterService_1 = require("./counterService");
const createInvoice = async (invoiceData, userId) => {
    const invoiceId = firebase_1.db.collection('invoices').doc().id;
    // Generate sequential invoice number
    const invoiceNumber = await counterService_1.counterService.getNextNumber('invoices', userId, 'INV');
    const newInvoice = Object.assign(Object.assign({}, invoiceData), { id: invoiceId, userId, createdAt: new Date(), isActive: true, status: 'pendiente', balanceDue: invoiceData.total, payments: [], invoiceNumber: invoiceNumber });
    await firebase_1.db.runTransaction(async (transaction) => {
        var _a;
        // 1. Check stock availability and decrement
        for (const item of newInvoice.items) {
            const productRef = firebase_1.db.collection('products').doc(item.productId);
            const productDoc = await transaction.get(productRef);
            if (!productDoc.exists) {
                throw new functions.https.HttpsError('not-found', `Producto ${item.productName} no encontrado.`);
            }
            const currentStock = ((_a = productDoc.data()) === null || _a === void 0 ? void 0 : _a.stock) || 0;
            if (currentStock < item.quantity) {
                throw new functions.https.HttpsError('failed-precondition', `Stock insuficiente para ${item.productName}. Disponible: ${currentStock}, Solicitado: ${item.quantity}`);
            }
            transaction.update(productRef, { stock: currentStock - item.quantity });
        }
        // 2. Create Invoice
        const invoiceRef = firebase_1.db.collection('invoices').doc(invoiceId);
        transaction.set(invoiceRef, newInvoice);
    });
    return invoiceId;
};
exports.createInvoice = createInvoice;
const updateInvoice = async (id, updatedData, userId) => {
    await firebase_1.db.runTransaction(async (transaction) => {
        const invoiceRef = firebase_1.db.collection('invoices').doc(id);
        const invoiceDoc = await transaction.get(invoiceRef);
        if (!invoiceDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Factura no encontrada.');
        }
        const currentInvoice = invoiceDoc.data();
        if (currentInvoice.userId !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'No tienes permiso para editar esta factura.');
        }
        // If items are modified, handle stock adjustments
        if (updatedData.items) {
            // 1. Identify all unique product IDs involved (old and new)
            const productIds = new Set();
            currentInvoice.items.forEach((item) => productIds.add(item.productId));
            updatedData.items.forEach((item) => productIds.add(item.productId));
            // 2. Read all product documents
            const productDocs = {};
            for (const pid of Array.from(productIds)) {
                const ref = firebase_1.db.collection('products').doc(pid);
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
                    throw new functions.https.HttpsError('not-found', `Producto ${item.productName} no encontrado (ID: ${item.productId}).`);
                }
                const product = productDocs[item.productId];
                if (product.data.stock < item.quantity) {
                    throw new functions.https.HttpsError('failed-precondition', `Stock insuficiente para ${item.productName}. Disponible: ${product.data.stock}, Solicitado: ${item.quantity}`);
                }
                product.data.stock -= item.quantity;
            }
            // 4. Write stock updates
            for (const pid of Object.keys(productDocs)) {
                transaction.update(productDocs[pid].ref, { stock: productDocs[pid].data.stock });
            }
        }
        // 5. Update Invoice
        transaction.update(invoiceRef, Object.assign({}, updatedData));
    });
};
exports.updateInvoice = updateInvoice;
const deleteInvoice = async (id, userId) => {
    await firebase_1.db.runTransaction(async (transaction) => {
        var _a;
        const invoiceRef = firebase_1.db.collection('invoices').doc(id);
        const invoiceDoc = await transaction.get(invoiceRef);
        if (!invoiceDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Factura no encontrada.');
        }
        const invoice = invoiceDoc.data();
        if (invoice.userId !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'No tienes permiso para eliminar esta factura.');
        }
        if (invoice.payments && invoice.payments.length > 0) {
            throw new functions.https.HttpsError('failed-precondition', 'No se pueden eliminar facturas con pagos aplicados.');
        }
        // Restore stock
        for (const item of invoice.items) {
            const productRef = firebase_1.db.collection('products').doc(item.productId);
            const productDoc = await transaction.get(productRef);
            if (productDoc.exists) {
                const currentStock = ((_a = productDoc.data()) === null || _a === void 0 ? void 0 : _a.stock) || 0;
                transaction.update(productRef, { stock: currentStock + item.quantity });
            }
        }
        transaction.delete(invoiceRef);
    });
};
exports.deleteInvoice = deleteInvoice;
const getReceivables = async (userId) => {
    return await invoiceRepository_1.invoiceRepository.getReceivables(userId);
};
exports.getReceivables = getReceivables;
const addPayment = async (invoiceId, paymentData, userId) => {
    return await firebase_1.db.runTransaction(async (transaction) => {
        var _a;
        const invoiceRef = firebase_1.db.collection('invoices').doc(invoiceId);
        const invoiceDoc = await transaction.get(invoiceRef);
        if (!invoiceDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Factura no encontrada.');
        }
        const invoice = invoiceDoc.data();
        if (invoice.userId !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'No tienes permiso para modificar esta factura.');
        }
        const currentBalance = Math.round(((_a = invoice.balanceDue) !== null && _a !== void 0 ? _a : invoice.total) * 100) / 100;
        if (paymentData.amount <= 0) {
            throw new functions.https.HttpsError('invalid-argument', 'El monto del pago debe ser mayor que cero.');
        }
        if (paymentData.amount > currentBalance + 0.001) {
            throw new functions.https.HttpsError('failed-precondition', `El monto del pago (${paymentData.amount.toFixed(2)}) no puede ser mayor que el balance pendiente de ${currentBalance.toFixed(2)}.`);
        }
        const paymentId = new Date().toISOString() + Math.random();
        const newPayment = {
            id: paymentId,
            receiptNumber: `REC-${Date.now().toString().slice(-8)}`,
            amount: paymentData.amount,
            paymentDate: paymentData.paymentDate,
            method: paymentData.method,
            note: paymentData.note || '',
            imageUrl: paymentData.imageUrl || '',
            currency: invoice.currency,
            status: 'pagado',
        };
        const newBalanceDue = Math.round((currentBalance - paymentData.amount) * 100) / 100;
        let newStatus = invoice.status;
        let finalBalance = newBalanceDue;
        if (newBalanceDue <= 0.001) {
            newStatus = 'pagada';
            finalBalance = 0;
        }
        else if (newBalanceDue < invoice.total) {
            newStatus = 'parcialmente pagada';
        }
        transaction.update(invoiceRef, {
            payments: firestore_1.FieldValue.arrayUnion(newPayment),
            balanceDue: finalBalance,
            status: newStatus,
        });
        return newPayment;
    });
};
exports.addPayment = addPayment;
//# sourceMappingURL=invoiceService.js.map
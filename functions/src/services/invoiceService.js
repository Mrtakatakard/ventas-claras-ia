"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPayment = exports.getReceivables = exports.deleteInvoice = exports.updateInvoice = exports.createInvoice = void 0;
var invoiceRepository_1 = require("../repositories/invoiceRepository");
var index_1 = require("../index");
var functions = require("firebase-functions");
var firestore_1 = require("firebase-admin/firestore");
var counterService_1 = require("./counterService");
var createInvoice = function (invoiceData, userId) { return __awaiter(void 0, void 0, void 0, function () {
    var invoiceId, invoiceNumber, newInvoice;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                invoiceId = index_1.db.collection("invoices").doc().id;
                return [4 /*yield*/, counterService_1.counterService.getNextNumber('invoices', userId, 'INV')];
            case 1:
                invoiceNumber = _a.sent();
                newInvoice = __assign(__assign({}, invoiceData), { id: invoiceId, userId: userId, createdAt: new Date(), isActive: true, status: 'pendiente', balanceDue: invoiceData.total, payments: [], invoiceNumber: invoiceNumber });
                return [4 /*yield*/, index_1.db.runTransaction(function (transaction) { return __awaiter(void 0, void 0, void 0, function () {
                        var _i, _a, item, productRef, productDoc, currentStock, invoiceRef;
                        var _b;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    _i = 0, _a = newInvoice.items;
                                    _c.label = 1;
                                case 1:
                                    if (!(_i < _a.length)) return [3 /*break*/, 4];
                                    item = _a[_i];
                                    productRef = index_1.db.collection("products").doc(item.productId);
                                    return [4 /*yield*/, transaction.get(productRef)];
                                case 2:
                                    productDoc = _c.sent();
                                    if (!productDoc.exists) {
                                        throw new functions.https.HttpsError("not-found", "Producto ".concat(item.productName, " no encontrado."));
                                    }
                                    currentStock = ((_b = productDoc.data()) === null || _b === void 0 ? void 0 : _b.stock) || 0;
                                    if (currentStock < item.quantity) {
                                        throw new functions.https.HttpsError("failed-precondition", "Stock insuficiente para ".concat(item.productName, ". Disponible: ").concat(currentStock, ", Solicitado: ").concat(item.quantity));
                                    }
                                    transaction.update(productRef, { stock: currentStock - item.quantity });
                                    _c.label = 3;
                                case 3:
                                    _i++;
                                    return [3 /*break*/, 1];
                                case 4:
                                    invoiceRef = index_1.db.collection("invoices").doc(invoiceId);
                                    transaction.set(invoiceRef, newInvoice);
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
            case 2:
                _a.sent();
                return [2 /*return*/, invoiceId];
        }
    });
}); };
exports.createInvoice = createInvoice;
var updateInvoice = function (id, updatedData, userId) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, index_1.db.runTransaction(function (transaction) { return __awaiter(void 0, void 0, void 0, function () {
                    var invoiceRef, invoiceDoc, currentInvoice, productIds_1, productDocs, _i, _a, pid, ref, doc, _b, _c, item, _d, _e, item, product, _f, _g, pid;
                    return __generator(this, function (_h) {
                        switch (_h.label) {
                            case 0:
                                invoiceRef = index_1.db.collection("invoices").doc(id);
                                return [4 /*yield*/, transaction.get(invoiceRef)];
                            case 1:
                                invoiceDoc = _h.sent();
                                if (!invoiceDoc.exists) {
                                    throw new functions.https.HttpsError("not-found", "Factura no encontrada.");
                                }
                                currentInvoice = invoiceDoc.data();
                                if (currentInvoice.userId !== userId) {
                                    throw new functions.https.HttpsError("permission-denied", "No tienes permiso para editar esta factura.");
                                }
                                if (!updatedData.items) return [3 /*break*/, 6];
                                productIds_1 = new Set();
                                currentInvoice.items.forEach(function (item) { return productIds_1.add(item.productId); });
                                updatedData.items.forEach(function (item) { return productIds_1.add(item.productId); });
                                productDocs = {};
                                _i = 0, _a = Array.from(productIds_1);
                                _h.label = 2;
                            case 2:
                                if (!(_i < _a.length)) return [3 /*break*/, 5];
                                pid = _a[_i];
                                ref = index_1.db.collection("products").doc(pid);
                                return [4 /*yield*/, transaction.get(ref)];
                            case 3:
                                doc = _h.sent();
                                if (doc.exists) {
                                    productDocs[pid] = { ref: ref, data: doc.data() };
                                }
                                _h.label = 4;
                            case 4:
                                _i++;
                                return [3 /*break*/, 2];
                            case 5:
                                // 3. Calculate stock changes
                                // Revert old items
                                for (_b = 0, _c = currentInvoice.items; _b < _c.length; _b++) {
                                    item = _c[_b];
                                    if (productDocs[item.productId]) {
                                        productDocs[item.productId].data.stock += item.quantity;
                                    }
                                }
                                // Apply new items
                                for (_d = 0, _e = updatedData.items; _d < _e.length; _d++) {
                                    item = _e[_d];
                                    if (!productDocs[item.productId]) {
                                        throw new functions.https.HttpsError("not-found", "Producto ".concat(item.productName, " no encontrado (ID: ").concat(item.productId, ")."));
                                    }
                                    product = productDocs[item.productId];
                                    if (product.data.stock < item.quantity) {
                                        throw new functions.https.HttpsError("failed-precondition", "Stock insuficiente para ".concat(item.productName, ". Disponible: ").concat(product.data.stock, ", Solicitado: ").concat(item.quantity));
                                    }
                                    product.data.stock -= item.quantity;
                                }
                                // 4. Write stock updates
                                for (_f = 0, _g = Object.keys(productDocs); _f < _g.length; _f++) {
                                    pid = _g[_f];
                                    transaction.update(productDocs[pid].ref, { stock: productDocs[pid].data.stock });
                                }
                                _h.label = 6;
                            case 6:
                                // 5. Update Invoice
                                transaction.update(invoiceRef, __assign({}, updatedData));
                                return [2 /*return*/];
                        }
                    });
                }); })];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
exports.updateInvoice = updateInvoice;
var deleteInvoice = function (id, userId) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, index_1.db.runTransaction(function (transaction) { return __awaiter(void 0, void 0, void 0, function () {
                    var invoiceRef, invoiceDoc, invoice, _i, _a, item, productRef, productDoc, currentStock;
                    var _b;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0:
                                invoiceRef = index_1.db.collection("invoices").doc(id);
                                return [4 /*yield*/, transaction.get(invoiceRef)];
                            case 1:
                                invoiceDoc = _c.sent();
                                if (!invoiceDoc.exists) {
                                    throw new functions.https.HttpsError("not-found", "Factura no encontrada.");
                                }
                                invoice = invoiceDoc.data();
                                if (invoice.userId !== userId) {
                                    throw new functions.https.HttpsError("permission-denied", "No tienes permiso para eliminar esta factura.");
                                }
                                if (invoice.payments && invoice.payments.length > 0) {
                                    throw new functions.https.HttpsError("failed-precondition", "No se pueden eliminar facturas con pagos aplicados.");
                                }
                                _i = 0, _a = invoice.items;
                                _c.label = 2;
                            case 2:
                                if (!(_i < _a.length)) return [3 /*break*/, 5];
                                item = _a[_i];
                                productRef = index_1.db.collection("products").doc(item.productId);
                                return [4 /*yield*/, transaction.get(productRef)];
                            case 3:
                                productDoc = _c.sent();
                                if (productDoc.exists) {
                                    currentStock = ((_b = productDoc.data()) === null || _b === void 0 ? void 0 : _b.stock) || 0;
                                    transaction.update(productRef, { stock: currentStock + item.quantity });
                                }
                                _c.label = 4;
                            case 4:
                                _i++;
                                return [3 /*break*/, 2];
                            case 5:
                                transaction.delete(invoiceRef);
                                return [2 /*return*/];
                        }
                    });
                }); })];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
exports.deleteInvoice = deleteInvoice;
var getReceivables = function (userId) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, invoiceRepository_1.invoiceRepository.getReceivables(userId)];
            case 1: return [2 /*return*/, _a.sent()];
        }
    });
}); };
exports.getReceivables = getReceivables;
var addPayment = function (invoiceId, paymentData, userId) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, index_1.db.runTransaction(function (transaction) { return __awaiter(void 0, void 0, void 0, function () {
                    var invoiceRef, invoiceDoc, invoice, currentBalance, paymentId, newPayment, newBalanceDue, newStatus, finalBalance;
                    var _a;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                invoiceRef = index_1.db.collection("invoices").doc(invoiceId);
                                return [4 /*yield*/, transaction.get(invoiceRef)];
                            case 1:
                                invoiceDoc = _b.sent();
                                if (!invoiceDoc.exists) {
                                    throw new functions.https.HttpsError("not-found", "Factura no encontrada.");
                                }
                                invoice = invoiceDoc.data();
                                if (invoice.userId !== userId) {
                                    throw new functions.https.HttpsError("permission-denied", "No tienes permiso para modificar esta factura.");
                                }
                                currentBalance = Math.round(((_a = invoice.balanceDue) !== null && _a !== void 0 ? _a : invoice.total) * 100) / 100;
                                if (paymentData.amount <= 0) {
                                    throw new functions.https.HttpsError("invalid-argument", "El monto del pago debe ser mayor que cero.");
                                }
                                if (paymentData.amount > currentBalance + 0.001) {
                                    throw new functions.https.HttpsError("failed-precondition", "El monto del pago (".concat(paymentData.amount.toFixed(2), ") no puede ser mayor que el balance pendiente de ").concat(currentBalance.toFixed(2), "."));
                                }
                                paymentId = new Date().toISOString() + Math.random();
                                newPayment = {
                                    id: paymentId,
                                    receiptNumber: "REC-".concat(Date.now().toString().slice(-8)),
                                    amount: paymentData.amount,
                                    paymentDate: paymentData.paymentDate,
                                    method: paymentData.method,
                                    note: paymentData.note || '',
                                    imageUrl: paymentData.imageUrl || '',
                                    currency: invoice.currency,
                                    status: 'pagado',
                                };
                                newBalanceDue = Math.round((currentBalance - paymentData.amount) * 100) / 100;
                                newStatus = invoice.status;
                                finalBalance = newBalanceDue;
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
                                    status: newStatus
                                });
                                return [2 /*return*/, newPayment];
                        }
                    });
                }); })];
            case 1: return [2 /*return*/, _a.sent()];
        }
    });
}); };
exports.addPayment = addPayment;

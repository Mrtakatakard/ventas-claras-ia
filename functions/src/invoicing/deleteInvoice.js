"use strict";
/**
 * @fileoverview Cloud Function to handle deleting an invoice and adjusting stock.
 */
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
exports.deleteInvoiceAndAdjustStock = void 0;
var https_1 = require("firebase-functions/v2/https");
var admin = require("firebase-admin");
var logger = require("firebase-functions/logger");
var db = admin.firestore();
exports.deleteInvoiceAndAdjustStock = (0, https_1.onCall)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var invoiceId, uid, invoiceRef, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError("unauthenticated", "Debes estar autenticado para realizar esta acción.");
                }
                invoiceId = request.data.invoiceId;
                if (!invoiceId) {
                    throw new https_1.HttpsError("invalid-argument", "Se requiere el ID de la factura.");
                }
                uid = request.auth.uid;
                invoiceRef = db.collection('invoices').doc(invoiceId);
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, db.runTransaction(function (transaction) { return __awaiter(void 0, void 0, void 0, function () {
                        var invoiceDoc, invoice, _i, _a, item, productRef, productDoc, currentStock, newStock;
                        var _b;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0: return [4 /*yield*/, transaction.get(invoiceRef)];
                                case 1:
                                    invoiceDoc = _c.sent();
                                    if (!invoiceDoc.exists) {
                                        throw new https_1.HttpsError("not-found", "La factura no existe.");
                                    }
                                    invoice = invoiceDoc.data();
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
                                    if (!(invoice.items && invoice.items.length > 0)) return [3 /*break*/, 5];
                                    _i = 0, _a = invoice.items;
                                    _c.label = 2;
                                case 2:
                                    if (!(_i < _a.length)) return [3 /*break*/, 5];
                                    item = _a[_i];
                                    productRef = db.collection('products').doc(item.productId);
                                    return [4 /*yield*/, transaction.get(productRef)];
                                case 3:
                                    productDoc = _c.sent();
                                    if (productDoc.exists) {
                                        currentStock = ((_b = productDoc.data()) === null || _b === void 0 ? void 0 : _b.stock) || 0;
                                        newStock = currentStock + item.quantity;
                                        transaction.update(productRef, { stock: newStock });
                                        logger.info("Stock for product ".concat(item.productId, " adjusted from ").concat(currentStock, " to ").concat(newStock, "."));
                                    }
                                    else {
                                        logger.warn("Product ".concat(item.productId, " not found for stock adjustment during invoice deletion."));
                                    }
                                    _c.label = 4;
                                case 4:
                                    _i++;
                                    return [3 /*break*/, 2];
                                case 5:
                                    // 5. Delete the invoice
                                    transaction.delete(invoiceRef);
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
            case 2:
                _a.sent();
                logger.info("Invoice ".concat(invoiceId, " deleted successfully by user ").concat(uid, "."));
                return [2 /*return*/, { success: true, message: "Factura eliminada y stock ajustado correctamente." }];
            case 3:
                error_1 = _a.sent();
                logger.error("Error deleting invoice ".concat(invoiceId, ":"), error_1);
                if (error_1 instanceof https_1.HttpsError) {
                    throw error_1;
                }
                throw new https_1.HttpsError("internal", "Ocurrió un error inesperado al eliminar la factura.");
            case 4: return [2 /*return*/];
        }
    });
}); });

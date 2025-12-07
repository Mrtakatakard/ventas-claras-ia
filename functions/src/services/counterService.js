"use strict";
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
exports.counterService = void 0;
var index_1 = require("../index");
var functions = require("firebase-functions");
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
    getNextNumber: function (counterType_1, userId_1) {
        return __awaiter(this, arguments, void 0, function (counterType, userId, prefix, padding) {
            var counterRef, nextValue, paddedNumber, error_1;
            var _this = this;
            if (prefix === void 0) { prefix = ''; }
            if (padding === void 0) { padding = 6; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        counterRef = index_1.db.collection('counters').doc("".concat(userId, "_").concat(counterType));
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, index_1.db.runTransaction(function (transaction) { return __awaiter(_this, void 0, void 0, function () {
                                var counterDoc, currentValue, nextValue;
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0: return [4 /*yield*/, transaction.get(counterRef)];
                                        case 1:
                                            counterDoc = _b.sent();
                                            currentValue = 0;
                                            if (counterDoc.exists) {
                                                currentValue = ((_a = counterDoc.data()) === null || _a === void 0 ? void 0 : _a.current) || 0;
                                            }
                                            nextValue = currentValue + 1;
                                            // Update or create the counter document
                                            transaction.set(counterRef, {
                                                current: nextValue,
                                                lastUpdated: new Date(),
                                                userId: userId,
                                                type: counterType
                                            }, { merge: true });
                                            return [2 /*return*/, nextValue];
                                    }
                                });
                            }); })];
                    case 2:
                        nextValue = _a.sent();
                        paddedNumber = String(nextValue).padStart(padding, '0');
                        return [2 /*return*/, prefix ? "".concat(prefix, "-").concat(paddedNumber) : paddedNumber];
                    case 3:
                        error_1 = _a.sent();
                        console.error("Error getting next ".concat(counterType, " number:"), error_1);
                        throw new functions.https.HttpsError('internal', "Failed to generate ".concat(counterType, " number"));
                    case 4: return [2 /*return*/];
                }
            });
        });
    },
    /**
     * Initializes a counter for a user if it doesn't exist.
     * Useful for setting up counters for existing users.
     *
     * @param counterType - Type of counter
     * @param userId - User ID
     * @param startValue - Starting value (default: 0)
     */
    initializeCounter: function (counterType_1, userId_1) {
        return __awaiter(this, arguments, void 0, function (counterType, userId, startValue) {
            var counterRef, counterDoc;
            if (startValue === void 0) { startValue = 0; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        counterRef = index_1.db.collection('counters').doc("".concat(userId, "_").concat(counterType));
                        return [4 /*yield*/, counterRef.get()];
                    case 1:
                        counterDoc = _a.sent();
                        if (!!counterDoc.exists) return [3 /*break*/, 3];
                        return [4 /*yield*/, counterRef.set({
                                current: startValue,
                                lastUpdated: new Date(),
                                userId: userId,
                                type: counterType
                            })];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    }
};

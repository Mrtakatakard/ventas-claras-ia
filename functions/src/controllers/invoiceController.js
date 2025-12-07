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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPayment = exports.getReceivables = exports.deleteInvoice = exports.updateInvoice = exports.createInvoice = void 0;
var https_1 = require("firebase-functions/v2/https");
var invoiceService = require("../services/invoiceService");
var schema_1 = require("../schema");
exports.createInvoice = (0, https_1.onCall)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError("unauthenticated", "User must be logged in.");
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                data = schema_1.createInvoiceSchema.parse(request.data);
                return [4 /*yield*/, invoiceService.createInvoice(data, request.auth.uid)];
            case 2: return [2 /*return*/, _a.sent()];
            case 3:
                error_1 = _a.sent();
                if (error_1.issues) {
                    throw new https_1.HttpsError("invalid-argument", "Validation error", error_1.issues);
                }
                throw error_1;
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.updateInvoice = (0, https_1.onCall)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, id, data, validatedData, _id, updateData, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError("unauthenticated", "User must be logged in.");
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                _a = request.data, id = _a.id, data = __rest(_a, ["id"]);
                validatedData = schema_1.updateInvoiceSchema.parse(__assign({ id: id }, data));
                _id = validatedData.id, updateData = __rest(validatedData, ["id"]);
                return [4 /*yield*/, invoiceService.updateInvoice(id, updateData, request.auth.uid)];
            case 2: return [2 /*return*/, _b.sent()];
            case 3:
                error_2 = _b.sent();
                if (error_2.issues) {
                    throw new https_1.HttpsError("invalid-argument", "Validation error", error_2.issues);
                }
                throw error_2;
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.deleteInvoice = (0, https_1.onCall)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError("unauthenticated", "User must be logged in.");
                }
                return [4 /*yield*/, invoiceService.deleteInvoice(request.data.id, request.auth.uid)];
            case 1: return [2 /*return*/, _a.sent()];
        }
    });
}); });
exports.getReceivables = (0, https_1.onCall)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError("unauthenticated", "User must be logged in.");
                }
                return [4 /*yield*/, invoiceService.getReceivables(request.auth.uid)];
            case 1: return [2 /*return*/, _a.sent()];
        }
    });
}); });
exports.addPayment = (0, https_1.onCall)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var validatedData, invoiceId, paymentData, servicePaymentData, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError("unauthenticated", "User must be logged in.");
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                validatedData = schema_1.addPaymentSchema.parse(request.data);
                invoiceId = validatedData.invoiceId, paymentData = __rest(validatedData, ["invoiceId"]);
                servicePaymentData = {
                    amount: paymentData.amount,
                    paymentDate: paymentData.date,
                    method: paymentData.method,
                    note: paymentData.note,
                    imageUrl: paymentData.imageUrl
                };
                return [4 /*yield*/, invoiceService.addPayment(invoiceId, servicePaymentData, request.auth.uid)];
            case 2: return [2 /*return*/, _a.sent()];
            case 3:
                error_3 = _a.sent();
                if (error_3.issues) {
                    throw new https_1.HttpsError("invalid-argument", "Validation error", error_3.issues);
                }
                throw error_3;
            case 4: return [2 /*return*/];
        }
    });
}); });

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
var vitest_1 = require("vitest");
var quoteService_1 = require("../quoteService");
var quoteRepository_1 = require("../../repositories/quoteRepository");
var counterService_1 = require("../counterService");
var invoiceService = require("../invoiceService");
var functions = require("firebase-functions");
// Mock dependencies
vitest_1.vi.mock('../../repositories/quoteRepository');
vitest_1.vi.mock('../counterService');
vitest_1.vi.mock('../invoiceService');
vitest_1.vi.mock('../index', function () { return ({
    db: {
        collection: vitest_1.vi.fn(function () { return ({
            doc: vitest_1.vi.fn(function () { return ({
                id: 'mock-quote-id'
            }); })
        }); })
    }
}); });
(0, vitest_1.describe)('QuoteService', function () {
    var mockUserId = 'user-123';
    var mockQuoteData = {
        clientId: 'client-1',
        clientName: 'Test Client',
        clientEmail: 'test@example.com',
        issueDate: '2025-01-01',
        dueDate: '2025-01-31',
        items: [
            {
                productId: 'prod-1',
                productName: 'Product 1',
                quantity: 2,
                unitPrice: 100,
            }
        ],
        subtotal: 200,
        itbis: 36,
        total: 236,
        currency: 'DOP',
    };
    (0, vitest_1.beforeEach)(function () {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('createQuote', function () {
        (0, vitest_1.it)('should create a quote with auto-generated quote number', function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockQuoteNumber, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockQuoteNumber = 'QT-001';
                        vitest_1.vi.mocked(counterService_1.counterService.getNextNumber).mockResolvedValue(mockQuoteNumber);
                        vitest_1.vi.mocked(quoteRepository_1.quoteRepository.create).mockResolvedValue();
                        return [4 /*yield*/, quoteService_1.quoteService.createQuote(mockQuoteData, mockUserId)
                            // Assert
                        ];
                    case 1:
                        result = _a.sent();
                        // Assert
                        (0, vitest_1.expect)(counterService_1.counterService.getNextNumber).toHaveBeenCalledWith('quotes', mockUserId, 'QT');
                        (0, vitest_1.expect)(quoteRepository_1.quoteRepository.create).toHaveBeenCalledWith(vitest_1.expect.objectContaining(__assign(__assign({}, mockQuoteData), { id: vitest_1.expect.any(String), userId: mockUserId, quoteNumber: mockQuoteNumber, status: 'borrador', isActive: true, createdAt: vitest_1.expect.any(Date) })));
                        (0, vitest_1.expect)(result).toBe('mock-quote-id');
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)('updateQuote', function () {
        (0, vitest_1.it)('should update quote when user is authorized', function () { return __awaiter(void 0, void 0, void 0, function () {
            var quoteId, updateData, existingQuote;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        quoteId = 'quote-123';
                        updateData = { status: 'enviada' };
                        existingQuote = __assign(__assign({}, mockQuoteData), { id: quoteId, userId: mockUserId, quoteNumber: 'QT-001', status: 'borrador', createdAt: new Date(), isActive: true });
                        vitest_1.vi.mocked(quoteRepository_1.quoteRepository.get).mockResolvedValue(existingQuote);
                        vitest_1.vi.mocked(quoteRepository_1.quoteRepository.update).mockResolvedValue();
                        // Act
                        return [4 /*yield*/, quoteService_1.quoteService.updateQuote(quoteId, updateData, mockUserId)
                            // Assert
                        ];
                    case 1:
                        // Act
                        _a.sent();
                        // Assert
                        (0, vitest_1.expect)(quoteRepository_1.quoteRepository.get).toHaveBeenCalledWith(quoteId);
                        (0, vitest_1.expect)(quoteRepository_1.quoteRepository.update).toHaveBeenCalledWith(quoteId, updateData);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)('should throw not-found error when quote does not exist', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Arrange
                        vitest_1.vi.mocked(quoteRepository_1.quoteRepository.get).mockResolvedValue(null);
                        // Act & Assert
                        return [4 /*yield*/, (0, vitest_1.expect)(quoteService_1.quoteService.updateQuote('non-existent', {}, mockUserId)).rejects.toThrow(functions.https.HttpsError)];
                    case 1:
                        // Act & Assert
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)('should throw permission-denied error when user is not authorized', function () { return __awaiter(void 0, void 0, void 0, function () {
            var existingQuote;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        existingQuote = __assign(__assign({}, mockQuoteData), { id: 'quote-123', userId: 'different-user', quoteNumber: 'QT-001', status: 'borrador', createdAt: new Date(), isActive: true });
                        vitest_1.vi.mocked(quoteRepository_1.quoteRepository.get).mockResolvedValue(existingQuote);
                        // Act & Assert
                        return [4 /*yield*/, (0, vitest_1.expect)(quoteService_1.quoteService.updateQuote('quote-123', {}, mockUserId)).rejects.toThrow(functions.https.HttpsError)];
                    case 1:
                        // Act & Assert
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)('deleteQuote', function () {
        (0, vitest_1.it)('should delete quote when user is authorized', function () { return __awaiter(void 0, void 0, void 0, function () {
            var quoteId, existingQuote;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        quoteId = 'quote-123';
                        existingQuote = __assign(__assign({}, mockQuoteData), { id: quoteId, userId: mockUserId, quoteNumber: 'QT-001', status: 'borrador', createdAt: new Date(), isActive: true });
                        vitest_1.vi.mocked(quoteRepository_1.quoteRepository.get).mockResolvedValue(existingQuote);
                        vitest_1.vi.mocked(quoteRepository_1.quoteRepository.delete).mockResolvedValue();
                        // Act
                        return [4 /*yield*/, quoteService_1.quoteService.deleteQuote(quoteId, mockUserId)
                            // Assert
                        ];
                    case 1:
                        // Act
                        _a.sent();
                        // Assert
                        (0, vitest_1.expect)(quoteRepository_1.quoteRepository.delete).toHaveBeenCalledWith(quoteId);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)('should throw permission-denied error when user is not authorized', function () { return __awaiter(void 0, void 0, void 0, function () {
            var existingQuote;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        existingQuote = __assign(__assign({}, mockQuoteData), { id: 'quote-123', userId: 'different-user', quoteNumber: 'QT-001', status: 'borrador', createdAt: new Date(), isActive: true });
                        vitest_1.vi.mocked(quoteRepository_1.quoteRepository.get).mockResolvedValue(existingQuote);
                        // Act & Assert
                        return [4 /*yield*/, (0, vitest_1.expect)(quoteService_1.quoteService.deleteQuote('quote-123', mockUserId)).rejects.toThrow(functions.https.HttpsError)];
                    case 1:
                        // Act & Assert
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)('convertQuoteToInvoice', function () {
        (0, vitest_1.it)('should convert quote to invoice and update quote status', function () { return __awaiter(void 0, void 0, void 0, function () {
            var quoteId, mockInvoiceId, existingQuote, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        quoteId = 'quote-123';
                        mockInvoiceId = 'invoice-456';
                        existingQuote = __assign(__assign({}, mockQuoteData), { id: quoteId, userId: mockUserId, quoteNumber: 'QT-001', status: 'aceptada', createdAt: new Date(), isActive: true });
                        vitest_1.vi.mocked(quoteRepository_1.quoteRepository.get).mockResolvedValue(existingQuote);
                        vitest_1.vi.mocked(invoiceService.createInvoice).mockResolvedValue(mockInvoiceId);
                        vitest_1.vi.mocked(quoteRepository_1.quoteRepository.update).mockResolvedValue();
                        return [4 /*yield*/, quoteService_1.quoteService.convertQuoteToInvoice(quoteId, mockUserId)
                            // Assert
                        ];
                    case 1:
                        result = _a.sent();
                        // Assert
                        (0, vitest_1.expect)(invoiceService.createInvoice).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                            clientId: existingQuote.clientId,
                            clientName: existingQuote.clientName,
                            quoteId: quoteId,
                        }), mockUserId);
                        (0, vitest_1.expect)(quoteRepository_1.quoteRepository.update).toHaveBeenCalledWith(quoteId, { status: 'facturada' });
                        (0, vitest_1.expect)(result).toBe(mockInvoiceId);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)('should throw not-found error when quote does not exist', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Arrange
                        vitest_1.vi.mocked(quoteRepository_1.quoteRepository.get).mockResolvedValue(null);
                        // Act & Assert
                        return [4 /*yield*/, (0, vitest_1.expect)(quoteService_1.quoteService.convertQuoteToInvoice('non-existent', mockUserId)).rejects.toThrow(functions.https.HttpsError)];
                    case 1:
                        // Act & Assert
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
});

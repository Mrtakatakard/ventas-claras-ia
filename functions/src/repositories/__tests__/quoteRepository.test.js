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
var vitest_1 = require("vitest");
var quoteRepository_1 = require("../quoteRepository");
// Mock Firestore using vi.hoisted to avoid initialization issues
var _a = vitest_1.vi.hoisted(function () {
    var mockSet = vitest_1.vi.fn();
    var mockUpdate = vitest_1.vi.fn();
    var mockDelete = vitest_1.vi.fn();
    var mockGet = vitest_1.vi.fn();
    var mockDoc = vitest_1.vi.fn(function () { return ({
        set: mockSet,
        update: mockUpdate,
        delete: mockDelete,
        get: mockGet,
    }); });
    var mockCollection = vitest_1.vi.fn(function () { return ({
        doc: mockDoc,
    }); });
    return { mockSet: mockSet, mockUpdate: mockUpdate, mockDelete: mockDelete, mockGet: mockGet, mockDoc: mockDoc, mockCollection: mockCollection };
}), mockSet = _a.mockSet, mockUpdate = _a.mockUpdate, mockDelete = _a.mockDelete, mockGet = _a.mockGet, mockDoc = _a.mockDoc, mockCollection = _a.mockCollection;
vitest_1.vi.mock('../../index', function () { return ({
    db: {
        collection: mockCollection,
    },
}); });
(0, vitest_1.describe)('QuoteRepository', function () {
    var mockQuote = {
        id: 'quote-123',
        quoteNumber: 'QT-001',
        clientId: 'client-1',
        clientName: 'Test Client',
        clientEmail: 'test@example.com',
        issueDate: '2025-01-01',
        dueDate: '2025-01-31',
        items: [],
        subtotal: 200,
        itbis: 36,
        total: 236,
        status: 'borrador',
        currency: 'DOP',
        userId: 'user-123',
        createdAt: new Date(),
        isActive: true,
    };
    (0, vitest_1.beforeEach)(function () {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('create', function () {
        (0, vitest_1.it)('should create a quote in Firestore', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Arrange
                        mockSet.mockResolvedValue(undefined);
                        // Act
                        return [4 /*yield*/, quoteRepository_1.quoteRepository.create(mockQuote)
                            // Assert
                        ];
                    case 1:
                        // Act
                        _a.sent();
                        // Assert
                        (0, vitest_1.expect)(mockCollection).toHaveBeenCalledWith('quotes');
                        (0, vitest_1.expect)(mockDoc).toHaveBeenCalledWith(mockQuote.id);
                        (0, vitest_1.expect)(mockSet).toHaveBeenCalledWith(mockQuote);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)('update', function () {
        (0, vitest_1.it)('should update a quote in Firestore', function () { return __awaiter(void 0, void 0, void 0, function () {
            var updateData;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        updateData = { status: 'enviada' };
                        mockUpdate.mockResolvedValue(undefined);
                        // Act
                        return [4 /*yield*/, quoteRepository_1.quoteRepository.update(mockQuote.id, updateData)
                            // Assert
                        ];
                    case 1:
                        // Act
                        _a.sent();
                        // Assert
                        (0, vitest_1.expect)(mockCollection).toHaveBeenCalledWith('quotes');
                        (0, vitest_1.expect)(mockDoc).toHaveBeenCalledWith(mockQuote.id);
                        (0, vitest_1.expect)(mockUpdate).toHaveBeenCalledWith(updateData);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)('delete', function () {
        (0, vitest_1.it)('should delete a quote from Firestore', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Arrange
                        mockDelete.mockResolvedValue(undefined);
                        // Act
                        return [4 /*yield*/, quoteRepository_1.quoteRepository.delete(mockQuote.id)
                            // Assert
                        ];
                    case 1:
                        // Act
                        _a.sent();
                        // Assert
                        (0, vitest_1.expect)(mockCollection).toHaveBeenCalledWith('quotes');
                        (0, vitest_1.expect)(mockDoc).toHaveBeenCalledWith(mockQuote.id);
                        (0, vitest_1.expect)(mockDelete).toHaveBeenCalled();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)('get', function () {
        (0, vitest_1.it)('should return quote when it exists', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Arrange
                        mockGet.mockResolvedValue({
                            exists: true,
                            data: function () { return mockQuote; },
                        });
                        return [4 /*yield*/, quoteRepository_1.quoteRepository.get(mockQuote.id)
                            // Assert
                        ];
                    case 1:
                        result = _a.sent();
                        // Assert
                        (0, vitest_1.expect)(mockCollection).toHaveBeenCalledWith('quotes');
                        (0, vitest_1.expect)(mockDoc).toHaveBeenCalledWith(mockQuote.id);
                        (0, vitest_1.expect)(result).toEqual(mockQuote);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.it)('should return null when quote does not exist', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Arrange
                        mockGet.mockResolvedValue({
                            exists: false,
                        });
                        return [4 /*yield*/, quoteRepository_1.quoteRepository.get('non-existent')
                            // Assert
                        ];
                    case 1:
                        result = _a.sent();
                        // Assert
                        (0, vitest_1.expect)(result).toBeNull();
                        return [2 /*return*/];
                }
            });
        }); });
    });
});

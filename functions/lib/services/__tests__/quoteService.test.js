"use strict";
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
const vitest_1 = require("vitest");
const quoteService_1 = require("../quoteService");
const quoteRepository_1 = require("../../repositories/quoteRepository");
const counterService_1 = require("../counterService");
const invoiceService = __importStar(require("../invoiceService"));
const functions = __importStar(require("firebase-functions"));
// Mock dependencies
vitest_1.vi.mock('../../repositories/quoteRepository');
vitest_1.vi.mock('../counterService');
vitest_1.vi.mock('../invoiceService');
vitest_1.vi.mock('../index', () => ({
    db: {
        collection: vitest_1.vi.fn(() => ({
            doc: vitest_1.vi.fn(() => ({
                id: 'mock-quote-id'
            }))
        }))
    }
}));
(0, vitest_1.describe)('QuoteService', () => {
    const mockUserId = 'user-123';
    const mockQuoteData = {
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
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('createQuote', () => {
        (0, vitest_1.it)('should create a quote with auto-generated quote number', async () => {
            // Arrange
            const mockQuoteNumber = 'QT-001';
            vitest_1.vi.mocked(counterService_1.counterService.getNextNumber).mockResolvedValue(mockQuoteNumber);
            vitest_1.vi.mocked(quoteRepository_1.quoteRepository.create).mockResolvedValue();
            // Act
            const result = await quoteService_1.quoteService.createQuote(mockQuoteData, mockUserId);
            // Assert
            (0, vitest_1.expect)(counterService_1.counterService.getNextNumber).toHaveBeenCalledWith('quotes', mockUserId, 'QT');
            (0, vitest_1.expect)(quoteRepository_1.quoteRepository.create).toHaveBeenCalledWith(vitest_1.expect.objectContaining(Object.assign(Object.assign({}, mockQuoteData), { id: vitest_1.expect.any(String), userId: mockUserId, quoteNumber: mockQuoteNumber, status: 'borrador', isActive: true, createdAt: vitest_1.expect.any(Date) })));
            (0, vitest_1.expect)(result).toBe('mock-quote-id');
        });
    });
    (0, vitest_1.describe)('updateQuote', () => {
        (0, vitest_1.it)('should update quote when user is authorized', async () => {
            // Arrange
            const quoteId = 'quote-123';
            const updateData = { status: 'enviada' };
            const existingQuote = Object.assign(Object.assign({}, mockQuoteData), { id: quoteId, userId: mockUserId, quoteNumber: 'QT-001', status: 'borrador', createdAt: new Date(), isActive: true });
            vitest_1.vi.mocked(quoteRepository_1.quoteRepository.get).mockResolvedValue(existingQuote);
            vitest_1.vi.mocked(quoteRepository_1.quoteRepository.update).mockResolvedValue();
            // Act
            await quoteService_1.quoteService.updateQuote(quoteId, updateData, mockUserId);
            // Assert
            (0, vitest_1.expect)(quoteRepository_1.quoteRepository.get).toHaveBeenCalledWith(quoteId);
            (0, vitest_1.expect)(quoteRepository_1.quoteRepository.update).toHaveBeenCalledWith(quoteId, updateData);
        });
        (0, vitest_1.it)('should throw not-found error when quote does not exist', async () => {
            // Arrange
            vitest_1.vi.mocked(quoteRepository_1.quoteRepository.get).mockResolvedValue(null);
            // Act & Assert
            await (0, vitest_1.expect)(quoteService_1.quoteService.updateQuote('non-existent', {}, mockUserId)).rejects.toThrow(functions.https.HttpsError);
        });
        (0, vitest_1.it)('should throw permission-denied error when user is not authorized', async () => {
            // Arrange
            const existingQuote = Object.assign(Object.assign({}, mockQuoteData), { id: 'quote-123', userId: 'different-user', quoteNumber: 'QT-001', status: 'borrador', createdAt: new Date(), isActive: true });
            vitest_1.vi.mocked(quoteRepository_1.quoteRepository.get).mockResolvedValue(existingQuote);
            // Act & Assert
            await (0, vitest_1.expect)(quoteService_1.quoteService.updateQuote('quote-123', {}, mockUserId)).rejects.toThrow(functions.https.HttpsError);
        });
    });
    (0, vitest_1.describe)('deleteQuote', () => {
        (0, vitest_1.it)('should delete quote when user is authorized', async () => {
            // Arrange
            const quoteId = 'quote-123';
            const existingQuote = Object.assign(Object.assign({}, mockQuoteData), { id: quoteId, userId: mockUserId, quoteNumber: 'QT-001', status: 'borrador', createdAt: new Date(), isActive: true });
            vitest_1.vi.mocked(quoteRepository_1.quoteRepository.get).mockResolvedValue(existingQuote);
            vitest_1.vi.mocked(quoteRepository_1.quoteRepository.delete).mockResolvedValue();
            // Act
            await quoteService_1.quoteService.deleteQuote(quoteId, mockUserId);
            // Assert
            (0, vitest_1.expect)(quoteRepository_1.quoteRepository.delete).toHaveBeenCalledWith(quoteId);
        });
        (0, vitest_1.it)('should throw permission-denied error when user is not authorized', async () => {
            // Arrange
            const existingQuote = Object.assign(Object.assign({}, mockQuoteData), { id: 'quote-123', userId: 'different-user', quoteNumber: 'QT-001', status: 'borrador', createdAt: new Date(), isActive: true });
            vitest_1.vi.mocked(quoteRepository_1.quoteRepository.get).mockResolvedValue(existingQuote);
            // Act & Assert
            await (0, vitest_1.expect)(quoteService_1.quoteService.deleteQuote('quote-123', mockUserId)).rejects.toThrow(functions.https.HttpsError);
        });
    });
    (0, vitest_1.describe)('convertQuoteToInvoice', () => {
        (0, vitest_1.it)('should convert quote to invoice and update quote status', async () => {
            // Arrange
            const quoteId = 'quote-123';
            const mockInvoiceId = 'invoice-456';
            const existingQuote = Object.assign(Object.assign({}, mockQuoteData), { id: quoteId, userId: mockUserId, quoteNumber: 'QT-001', status: 'aceptada', createdAt: new Date(), isActive: true });
            vitest_1.vi.mocked(quoteRepository_1.quoteRepository.get).mockResolvedValue(existingQuote);
            vitest_1.vi.mocked(invoiceService.createInvoice).mockResolvedValue(mockInvoiceId);
            vitest_1.vi.mocked(quoteRepository_1.quoteRepository.update).mockResolvedValue();
            // Act
            const result = await quoteService_1.quoteService.convertQuoteToInvoice(quoteId, mockUserId);
            // Assert
            (0, vitest_1.expect)(invoiceService.createInvoice).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                clientId: existingQuote.clientId,
                clientName: existingQuote.clientName,
                quoteId: quoteId,
            }), mockUserId);
            (0, vitest_1.expect)(quoteRepository_1.quoteRepository.update).toHaveBeenCalledWith(quoteId, { status: 'facturada' });
            (0, vitest_1.expect)(result).toBe(mockInvoiceId);
        });
        (0, vitest_1.it)('should throw not-found error when quote does not exist', async () => {
            // Arrange
            vitest_1.vi.mocked(quoteRepository_1.quoteRepository.get).mockResolvedValue(null);
            // Act & Assert
            await (0, vitest_1.expect)(quoteService_1.quoteService.convertQuoteToInvoice('non-existent', mockUserId)).rejects.toThrow(functions.https.HttpsError);
        });
    });
});
//# sourceMappingURL=quoteService.test.js.map
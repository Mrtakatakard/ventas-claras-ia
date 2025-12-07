"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const quoteRepository_1 = require("../quoteRepository");
// Mock Firestore using vi.hoisted to avoid initialization issues
const { mockSet, mockUpdate, mockDelete, mockGet, mockDoc, mockCollection } = vitest_1.vi.hoisted(() => {
    const mockSet = vitest_1.vi.fn();
    const mockUpdate = vitest_1.vi.fn();
    const mockDelete = vitest_1.vi.fn();
    const mockGet = vitest_1.vi.fn();
    const mockDoc = vitest_1.vi.fn(() => ({
        set: mockSet,
        update: mockUpdate,
        delete: mockDelete,
        get: mockGet,
    }));
    const mockCollection = vitest_1.vi.fn(() => ({
        doc: mockDoc,
    }));
    return { mockSet, mockUpdate, mockDelete, mockGet, mockDoc, mockCollection };
});
vitest_1.vi.mock('../../index', () => ({
    db: {
        collection: mockCollection,
    },
}));
(0, vitest_1.describe)('QuoteRepository', () => {
    const mockQuote = {
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
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('create', () => {
        (0, vitest_1.it)('should create a quote in Firestore', async () => {
            // Arrange
            mockSet.mockResolvedValue(undefined);
            // Act
            await quoteRepository_1.quoteRepository.create(mockQuote);
            // Assert
            (0, vitest_1.expect)(mockCollection).toHaveBeenCalledWith('quotes');
            (0, vitest_1.expect)(mockDoc).toHaveBeenCalledWith(mockQuote.id);
            (0, vitest_1.expect)(mockSet).toHaveBeenCalledWith(mockQuote);
        });
    });
    (0, vitest_1.describe)('update', () => {
        (0, vitest_1.it)('should update a quote in Firestore', async () => {
            // Arrange
            const updateData = { status: 'enviada' };
            mockUpdate.mockResolvedValue(undefined);
            // Act
            await quoteRepository_1.quoteRepository.update(mockQuote.id, updateData);
            // Assert
            (0, vitest_1.expect)(mockCollection).toHaveBeenCalledWith('quotes');
            (0, vitest_1.expect)(mockDoc).toHaveBeenCalledWith(mockQuote.id);
            (0, vitest_1.expect)(mockUpdate).toHaveBeenCalledWith(updateData);
        });
    });
    (0, vitest_1.describe)('delete', () => {
        (0, vitest_1.it)('should delete a quote from Firestore', async () => {
            // Arrange
            mockDelete.mockResolvedValue(undefined);
            // Act
            await quoteRepository_1.quoteRepository.delete(mockQuote.id);
            // Assert
            (0, vitest_1.expect)(mockCollection).toHaveBeenCalledWith('quotes');
            (0, vitest_1.expect)(mockDoc).toHaveBeenCalledWith(mockQuote.id);
            (0, vitest_1.expect)(mockDelete).toHaveBeenCalled();
        });
    });
    (0, vitest_1.describe)('get', () => {
        (0, vitest_1.it)('should return quote when it exists', async () => {
            // Arrange
            mockGet.mockResolvedValue({
                exists: true,
                data: () => mockQuote,
            });
            // Act
            const result = await quoteRepository_1.quoteRepository.get(mockQuote.id);
            // Assert
            (0, vitest_1.expect)(mockCollection).toHaveBeenCalledWith('quotes');
            (0, vitest_1.expect)(mockDoc).toHaveBeenCalledWith(mockQuote.id);
            (0, vitest_1.expect)(result).toEqual(mockQuote);
        });
        (0, vitest_1.it)('should return null when quote does not exist', async () => {
            // Arrange
            mockGet.mockResolvedValue({
                exists: false,
            });
            // Act
            const result = await quoteRepository_1.quoteRepository.get('non-existent');
            // Assert
            (0, vitest_1.expect)(result).toBeNull();
        });
    });
});
//# sourceMappingURL=quoteRepository.test.js.map
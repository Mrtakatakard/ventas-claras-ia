import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as invoiceService from '../services/invoiceService';
import * as functions from 'firebase-functions';
import { db } from '../config/firebase';

// Mock Firestore
const mockCollection = vi.fn();
const mockDoc = vi.fn();
const mockGet = vi.fn();
const mockSet = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockRunTransaction = vi.fn();

vi.mock('../config/firebase', () => ({
    db: {
        collection: (name: string) => ({
            doc: (id?: string) => ({
                id: id || 'mock-id',
                get: mockGet,
                set: mockSet,
                update: mockUpdate,
                delete: mockDelete,
            }),
            where: () => ({
                where: () => ({
                    limit: () => ({
                        get: mockGet
                    })
                })
            })
        }),
        runTransaction: async (callback: any) => {
            return callback({
                get: mockGet,
                update: mockUpdate,
                set: mockSet,
                delete: mockDelete,
            });
        }
    }
}));


vi.mock('../services/counterService', () => ({
    counterService: {
        getNextNumber: vi.fn().mockResolvedValue('INV-001')
    }
}));

vi.mock('../services/ncfService', () => ({
    ncfService: {
        getNextNCF: vi.fn().mockResolvedValue('B0100000001')
    }
}));

describe('Invoice Service Integration', () => {
    const userId = 'test-user-id';

    // Test Data
    const mockProductGood = {
        exists: true,
        data: () => ({
            id: 'prod-good',
            name: 'Producto Bueno',
            productType: 'good',
            stock: 10,
            allowNegativeStock: false,
            batches: [{ id: 'b1', stock: 10, price: 100 }]
        })
    };

    const mockProductService = {
        exists: true,
        data: () => ({
            id: 'prod-service',
            name: 'Servicio',
            productType: 'service',
            stock: 0,
        })
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createInvoice', () => {
        it('should throw "failed-precondition" if stock is insufficient for a good', async () => {
            // Mock product fetch to return 10 stock
            mockGet.mockResolvedValueOnce(mockProductGood); // Counter check? No, transaction get first usually.
            // Wait, createInvoice does unique check first. 
            // 1. Counter check (mocked empty)
            mockGet.mockResolvedValueOnce({ empty: true });

            // 2. Transaction -> Get Product
            mockGet.mockResolvedValueOnce(mockProductGood);

            const invoiceData: any = {
                clientId: 'client-1',
                clientName: 'Test Client',
                items: [{ productId: 'prod-good', productName: 'Producto Bueno', quantity: 20, unitPrice: 100 }],
                total: 2000,
                currency: 'DOP',
                issueDate: '2023-01-01',
                dueDate: '2023-01-15'
            };

            await expect(invoiceService.createInvoice(invoiceData, userId, false))
                .rejects
                .toThrowError(/Stock insuficiente/);
        });

        it('should ALLOW creation if stock is insufficient but allowBackorder is TRUE', async () => {
            mockGet.mockResolvedValueOnce({ empty: true }); // Unique check
            mockGet.mockResolvedValueOnce(mockProductGood); // Product fetch

            const invoiceData: any = {
                clientId: 'client-1',
                clientName: 'Test Client',
                items: [{ productId: 'prod-good', productName: 'Producto Bueno', quantity: 20, unitPrice: 100 }],
                total: 2000,
                currency: 'DOP',
            };

            const result = await invoiceService.createInvoice(invoiceData, userId, true);
            expect(result).toBe('mock-id');
            // Check that update was called with negative stock math
            // Original stock 10, req 20 -> new stock -10? 
            // Implementation logic handles batch deduction.
            expect(mockUpdate).toHaveBeenCalled();
        });

        it('should IGNORE stock check for Services', async () => {
            mockGet.mockResolvedValueOnce({ empty: true }); // Unique check
            mockGet.mockResolvedValueOnce(mockProductService); // Product fetch

            const invoiceData: any = {
                clientId: 'client-1',
                items: [{ productId: 'prod-service', productName: 'Servicio', quantity: 999, unitPrice: 100 }],
                total: 99900,
                currency: 'DOP'
            };

            const result = await invoiceService.createInvoice(invoiceData, userId, false);
            expect(result).toBe('mock-id');
            // Should NOT call update on product ref for stock deduction (or call it with same stock? Logic says continue)
            // Logic: if (itemType === 'service') continue; 
            // So mockUpdate should only be called for the Invoice creation, not the product.
            // Actually, createInvoice updates productRef inside loop.
            // We configured mockUpdate to be one global mock. It will be called for invoice creation (transaction.set).
            expect(mockSet).toHaveBeenCalled();
        });
    });

    describe('updateInvoice', () => {
        // Mock current invoice
        const currentInvoice = {
            exists: true,
            data: () => ({
                id: 'inv-1',
                userId: userId,
                items: [{ productId: 'prod-good', quantity: 5 }] // Originally bought 5
            })
        };

        it('should throw "failed-precondition" if increasing quantity exceeds stock', async () => {
            // 1. Get Invoice
            mockGet.mockResolvedValueOnce(currentInvoice);

            // 2. Get Products (Transaction) - Logic gets all products involved
            // It gets 'prod-good'.
            // Current stock logic: Stock in DB is 5 (since we bought 5, and originally had 10? No, let's say remaining is 5).
            // Let's ensure the mock reflects "current DB state".
            const productInDb = {
                exists: true,
                data: () => ({ ...mockProductGood.data(), stock: 5 }) // 5 left
            };
            mockGet.mockResolvedValueOnce(productInDb);

            const updateData: any = {
                items: [{ productId: 'prod-good', productName: 'Producto Bueno', quantity: 20, unitPrice: 100 }] // Caring to buy 20 now (diff +15)
            };

            await expect(invoiceService.updateInvoice('inv-1', updateData, userId, false))
                .rejects
                .toThrowError(/Stock insuficiente/);
        });

        it('should ALLOW update with insufficient stock if allowBackorder is TRUE', async () => {
            mockGet.mockResolvedValueOnce(currentInvoice);
            const productInDb = {
                exists: true,
                data: () => ({ ...mockProductGood.data(), stock: 5 })
            };
            mockGet.mockResolvedValueOnce(productInDb);

            const updateData: any = {
                items: [{ productId: 'prod-good', productName: 'Producto Bueno', quantity: 20, unitPrice: 100 }]
            };

            await expect(invoiceService.updateInvoice('inv-1', updateData, userId, true))
                .resolves
                .not.toThrow();

            expect(mockUpdate).toHaveBeenCalled();
        });
    });
});

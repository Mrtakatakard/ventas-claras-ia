import { describe, it, expect, vi, beforeEach } from 'vitest'
import { quoteService } from '../quoteService'
import { quoteRepository } from '../../repositories/quoteRepository'
import { counterService } from '../counterService'
import * as invoiceService from '../invoiceService'
import * as functions from 'firebase-functions'

// Mock dependencies
vi.mock('../../repositories/quoteRepository')
vi.mock('../counterService')
vi.mock('../invoiceService')
vi.mock('../../config/firebase', () => ({
    db: {
        collection: vi.fn(() => ({
            doc: vi.fn(() => ({
                id: 'mock-quote-id'
            }))
        }))
    }
}))

describe('QuoteService', () => {
    const mockUserId = 'user-123'
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
        currency: 'DOP' as const,
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('createQuote', () => {
        it('should create a quote with auto-generated quote number', async () => {
            // Arrange
            const mockQuoteNumber = 'QT-001'
            vi.mocked(counterService.getNextNumber).mockResolvedValue(mockQuoteNumber)
            vi.mocked(quoteRepository.create).mockResolvedValue()

            // Act
            const result = await quoteService.createQuote(mockQuoteData, mockUserId)

            // Assert
            expect(counterService.getNextNumber).toHaveBeenCalledWith('quotes', mockUserId, 'QT')
            expect(quoteRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    quoteNumber: mockQuoteNumber,
                    userId: mockUserId,
                    status: 'borrador',
                    isActive: true,
                })
            )
            expect(result).toBe('mock-quote-id')
        })
    })

    describe('updateQuote', () => {
        it('should update quote when user is authorized', async () => {
            // Arrange
            const quoteId = 'quote-123'
            const updateData = { status: 'enviada' as const }
            const existingQuote = {
                ...mockQuoteData,
                id: quoteId,
                userId: mockUserId,
                quoteNumber: 'QT-001',
                status: 'borrador' as const,
                createdAt: new Date(),
                isActive: true,
            }

            vi.mocked(quoteRepository.get).mockResolvedValue(existingQuote)
            vi.mocked(quoteRepository.update).mockResolvedValue()

            // Act
            await quoteService.updateQuote(quoteId, updateData, mockUserId)

            // Assert
            expect(quoteRepository.get).toHaveBeenCalledWith(quoteId)
            expect(quoteRepository.update).toHaveBeenCalledWith(quoteId, updateData)
        })

        it('should throw not-found error when quote does not exist', async () => {
            // Arrange
            vi.mocked(quoteRepository.get).mockResolvedValue(null)

            // Act & Assert
            await expect(
                quoteService.updateQuote('non-existent', {}, mockUserId)
            ).rejects.toThrow(functions.https.HttpsError)
        })

        it('should throw permission-denied error when user is not authorized', async () => {
            // Arrange
            const existingQuote = {
                ...mockQuoteData,
                id: 'quote-123',
                userId: 'different-user',
                quoteNumber: 'QT-001',
                status: 'borrador' as const,
                createdAt: new Date(),
                isActive: true,
            }

            vi.mocked(quoteRepository.get).mockResolvedValue(existingQuote)

            // Act & Assert
            await expect(
                quoteService.updateQuote('quote-123', {}, mockUserId)
            ).rejects.toThrow(functions.https.HttpsError)
        })
    })

    describe('deleteQuote', () => {
        it('should delete quote when user is authorized', async () => {
            // Arrange
            const quoteId = 'quote-123'
            const existingQuote = {
                ...mockQuoteData,
                id: quoteId,
                userId: mockUserId,
                quoteNumber: 'QT-001',
                status: 'borrador' as const,
                createdAt: new Date(),
                isActive: true,
            }

            vi.mocked(quoteRepository.get).mockResolvedValue(existingQuote)
            vi.mocked(quoteRepository.delete).mockResolvedValue()

            // Act
            await quoteService.deleteQuote(quoteId, mockUserId)

            // Assert
            expect(quoteRepository.delete).toHaveBeenCalledWith(quoteId)
        })

        it('should throw permission-denied error when user is not authorized', async () => {
            // Arrange
            const existingQuote = {
                ...mockQuoteData,
                id: 'quote-123',
                userId: 'different-user',
                quoteNumber: 'QT-001',
                status: 'borrador' as const,
                createdAt: new Date(),
                isActive: true,
            }

            vi.mocked(quoteRepository.get).mockResolvedValue(existingQuote)

            // Act & Assert
            await expect(
                quoteService.deleteQuote('quote-123', mockUserId)
            ).rejects.toThrow(functions.https.HttpsError)
        })
    })

    describe('convertQuoteToInvoice', () => {
        it('should convert quote to invoice and update quote status', async () => {
            // Arrange
            const quoteId = 'quote-123'
            const mockInvoiceId = 'invoice-456'
            const existingQuote = {
                ...mockQuoteData,
                id: quoteId,
                userId: mockUserId,
                quoteNumber: 'QT-001',
                status: 'aceptada' as const,
                createdAt: new Date(),
                isActive: true,
            }

            vi.mocked(quoteRepository.get).mockResolvedValue(existingQuote)
            vi.mocked(invoiceService.createInvoice).mockResolvedValue(mockInvoiceId)
            vi.mocked(quoteRepository.update).mockResolvedValue()

            // Act
            const result = await quoteService.convertQuoteToInvoice(quoteId, mockUserId)

            // Assert
            expect(invoiceService.createInvoice).toHaveBeenCalledWith(
                expect.objectContaining({
                    clientId: existingQuote.clientId,
                    clientName: existingQuote.clientName,
                    quoteId: quoteId,
                }),
                mockUserId
            )
            expect(quoteRepository.update).toHaveBeenCalledWith(quoteId, { status: 'facturada' })
            expect(result).toBe(mockInvoiceId)
        })

        it('should throw not-found error when quote does not exist', async () => {
            // Arrange
            vi.mocked(quoteRepository.get).mockResolvedValue(null)

            // Act & Assert
            await expect(
                quoteService.convertQuoteToInvoice('non-existent', mockUserId)
            ).rejects.toThrow(functions.https.HttpsError)
        })
    })
})

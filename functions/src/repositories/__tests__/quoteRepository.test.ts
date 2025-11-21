import { describe, it, expect, vi, beforeEach } from 'vitest'
import { quoteRepository } from '../quoteRepository'
import { Quote } from '../../types'

// Mock Firestore using vi.hoisted to avoid initialization issues
const { mockSet, mockUpdate, mockDelete, mockGet, mockDoc, mockCollection } = vi.hoisted(() => {
    const mockSet = vi.fn()
    const mockUpdate = vi.fn()
    const mockDelete = vi.fn()
    const mockGet = vi.fn()
    const mockDoc = vi.fn(() => ({
        set: mockSet,
        update: mockUpdate,
        delete: mockDelete,
        get: mockGet,
    }))
    const mockCollection = vi.fn(() => ({
        doc: mockDoc,
    }))

    return { mockSet, mockUpdate, mockDelete, mockGet, mockDoc, mockCollection }
})

vi.mock('../../index', () => ({
    db: {
        collection: mockCollection,
    },
}))

describe('QuoteRepository', () => {
    const mockQuote: Quote = {
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
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('create', () => {
        it('should create a quote in Firestore', async () => {
            // Arrange
            mockSet.mockResolvedValue(undefined)

            // Act
            await quoteRepository.create(mockQuote)

            // Assert
            expect(mockCollection).toHaveBeenCalledWith('quotes')
            expect(mockDoc).toHaveBeenCalledWith(mockQuote.id)
            expect(mockSet).toHaveBeenCalledWith(mockQuote)
        })
    })

    describe('update', () => {
        it('should update a quote in Firestore', async () => {
            // Arrange
            const updateData = { status: 'enviada' as const }
            mockUpdate.mockResolvedValue(undefined)

            // Act
            await quoteRepository.update(mockQuote.id, updateData)

            // Assert
            expect(mockCollection).toHaveBeenCalledWith('quotes')
            expect(mockDoc).toHaveBeenCalledWith(mockQuote.id)
            expect(mockUpdate).toHaveBeenCalledWith(updateData)
        })
    })

    describe('delete', () => {
        it('should delete a quote from Firestore', async () => {
            // Arrange
            mockDelete.mockResolvedValue(undefined)

            // Act
            await quoteRepository.delete(mockQuote.id)

            // Assert
            expect(mockCollection).toHaveBeenCalledWith('quotes')
            expect(mockDoc).toHaveBeenCalledWith(mockQuote.id)
            expect(mockDelete).toHaveBeenCalled()
        })
    })

    describe('get', () => {
        it('should return quote when it exists', async () => {
            // Arrange
            mockGet.mockResolvedValue({
                exists: true,
                data: () => mockQuote,
            })

            // Act
            const result = await quoteRepository.get(mockQuote.id)

            // Assert
            expect(mockCollection).toHaveBeenCalledWith('quotes')
            expect(mockDoc).toHaveBeenCalledWith(mockQuote.id)
            expect(result).toEqual(mockQuote)
        })

        it('should return null when quote does not exist', async () => {
            // Arrange
            mockGet.mockResolvedValue({
                exists: false,
            })

            // Act
            const result = await quoteRepository.get('non-existent')

            // Assert
            expect(result).toBeNull()
        })
    })
})

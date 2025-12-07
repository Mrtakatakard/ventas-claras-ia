import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useQuotes } from '../useQuotes';
import { quoteApi } from '@/lib/api/quoteApi';
import { useAuth } from '@/lib/firebase/hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Quote } from '@/lib/types';

// Mock dependencies
vi.mock('@/lib/api/quoteApi', () => ({
    quoteApi: {
        list: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock('@/lib/firebase/hooks', () => ({
    useAuth: vi.fn(),
}));

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useQuotes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        queryClient.clear();
    });

    it('should fetch quotes when user is authenticated', async () => {
        const mockQuotes: Quote[] = [
            { id: '1', quoteNumber: 'Q-001', clientName: 'Client A', total: 1000 } as any,
        ];
        (useAuth as any).mockReturnValue({ user: { uid: 'user123' } });
        (quoteApi.list as any).mockResolvedValue(mockQuotes);

        const { result } = renderHook(() => useQuotes(), { wrapper });

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.quotes).toEqual(mockQuotes);
        expect(quoteApi.list).toHaveBeenCalledWith('user123');
    });

    it('should not fetch quotes when user is not authenticated', async () => {
        (useAuth as any).mockReturnValue({ user: null });

        const { result } = renderHook(() => useQuotes(), { wrapper });

        expect(result.current.isLoading).toBe(false); // Disabled query is not "loading"
        // Wait a bit to ensure no call is made
        await new Promise((resolve) => setTimeout(resolve, 100));
        expect(quoteApi.list).not.toHaveBeenCalled();
    });

    it('should create a quote', async () => {
        (useAuth as any).mockReturnValue({ user: { uid: 'user123' } });
        (quoteApi.create as any).mockResolvedValue('new-id');

        const { result } = renderHook(() => useQuotes(), { wrapper });

        const newQuote = { clientName: 'New Client', total: 500 } as any;
        await result.current.createQuote(newQuote);

        expect(quoteApi.create).toHaveBeenCalledWith(newQuote);
    });

    it('should delete a quote', async () => {
        (useAuth as any).mockReturnValue({ user: { uid: 'user123' } });
        (quoteApi.delete as any).mockResolvedValue(undefined);

        const { result } = renderHook(() => useQuotes(), { wrapper });

        await result.current.deleteQuote('quote-id');

        expect(quoteApi.delete).toHaveBeenCalledWith('quote-id');
    });
});

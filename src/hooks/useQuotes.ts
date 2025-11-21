import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quoteApi } from '@/lib/api/quoteApi';
import { Quote } from '@/lib/types';
import { useAuth } from '@/lib/firebase/hooks';

export function useQuotes() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const userId = user?.uid;

    const quotesQuery = useQuery({
        queryKey: ['quotes', userId],
        queryFn: () => quoteApi.list(userId!),
        enabled: !!userId,
    });

    const createQuoteMutation = useMutation({
        mutationFn: (quoteData: Omit<Quote, 'id' | 'createdAt' | 'isActive' | 'quoteNumber'>) => {
            if (!userId) throw new Error('User not authenticated');
            return quoteApi.create(quoteData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quotes', userId] });
        },
    });

    const updateQuoteMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Quote> }) => {
            if (!userId) throw new Error('User not authenticated');
            return quoteApi.update(id, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quotes', userId] });
        },
    });

    const deleteQuoteMutation = useMutation({
        mutationFn: (id: string) => {
            if (!userId) throw new Error('User not authenticated');
            return quoteApi.delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quotes', userId] });
        },
    });

    return {
        quotes: quotesQuery.data || [],
        isLoading: quotesQuery.isLoading,
        isError: quotesQuery.isError,
        error: quotesQuery.error,
        createQuote: createQuoteMutation.mutateAsync,
        updateQuote: updateQuoteMutation.mutateAsync,
        deleteQuote: deleteQuoteMutation.mutateAsync,
    };
}

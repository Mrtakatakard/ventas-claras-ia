import { useQuery } from '@tanstack/react-query';
import { getInvoices } from '@/lib/services/invoiceService';
import { useAuth } from '@/lib/firebase/hooks';

export function useInvoices() {
    const { user } = useAuth();
    const userId = user?.uid;

    const invoicesQuery = useQuery({
        queryKey: ['invoices', userId],
        queryFn: () => getInvoices(userId!),
        enabled: !!userId,
    });

    return {
        invoices: invoicesQuery.data || [],
        isLoadingInvoices: invoicesQuery.isLoading,
        isErrorInvoices: invoicesQuery.isError,
    };
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getClients, getClientTypes, addClientType, updateClientType, deleteClientType, batchAddClients } from '@/lib/firebase/service';
import { useAuth } from '@/lib/firebase/hooks';
import { Client, ClientType } from '@/lib/types';

export function useClients() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const userId = user?.uid;

    const clientsQuery = useQuery({
        queryKey: ['clients', userId],
        queryFn: () => getClients(userId!),
        enabled: !!userId,
    });

    const clientTypesQuery = useQuery({
        queryKey: ['clientTypes', userId],
        queryFn: () => getClientTypes(userId!),
        enabled: !!userId,
    });

    // Mutations can be added here as needed, e.g., createClient, updateClient
    // For now, I'll just include what's needed for reading data, as the create page mainly reads.
    // But adding mutations makes it complete.

    return {
        clients: clientsQuery.data || [],
        isLoadingClients: clientsQuery.isLoading,
        isErrorClients: clientsQuery.isError,
        clientTypes: clientTypesQuery.data || [],
        isLoadingClientTypes: clientTypesQuery.isLoading,
    };
}

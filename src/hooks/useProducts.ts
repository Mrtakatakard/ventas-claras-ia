import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProducts, addProduct, updateProduct, deleteProduct } from '@/lib/firebase/service';
import { useAuth } from '@/lib/firebase/hooks';
import { Product } from '@/lib/types';

export function useProducts() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const userId = user?.uid;

    const productsQuery = useQuery({
        queryKey: ['products', userId],
        queryFn: () => getProducts(userId!),
        enabled: !!userId,
    });

    return {
        products: productsQuery.data || [],
        isLoadingProducts: productsQuery.isLoading,
        isErrorProducts: productsQuery.isError,
    };
}

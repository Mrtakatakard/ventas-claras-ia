import { functions } from "../firebase/config";
import { httpsCallable } from "firebase/functions";
import { Product } from "../types";

export const productApi = {
    create: async (data: Omit<Product, 'id' | 'createdAt' | 'isActive'>) => {
        const createProduct = httpsCallable(functions, "createProduct");
        const result = await createProduct(data);
        return result.data as string; // Returns the new product ID
    },

    update: async (id: string, data: Partial<Product>) => {
        const updateProduct = httpsCallable(functions, "updateProduct");
        await updateProduct({ id, ...data });
    },

    delete: async (id: string) => {
        const deleteProduct = httpsCallable(functions, "deleteProduct");
        await deleteProduct({ id });
    },

    checkCode: async (code: string, excludeId?: string): Promise<boolean> => {
        const checkProductCodeExists = httpsCallable(functions, "checkProductCodeExists");
        const result = await checkProductCodeExists({ code, excludeId });
        return result.data as boolean;
    },

    batchCreate: async (products: Omit<Product, 'id' | 'createdAt' | 'isActive'>[]) => {
        const batchCreateProducts = httpsCallable(functions, "batchCreateProducts");
        await batchCreateProducts({ products });
    }
};

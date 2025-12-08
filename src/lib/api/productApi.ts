import { functions } from "../firebase/config";
import { httpsCallable } from "firebase/functions";
import { Product } from "../types";

const removeUndefined = (obj: any): any => {
    if (obj instanceof Date) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(v => removeUndefined(v));
    } else if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            const value = removeUndefined(obj[key]);
            if (value !== undefined) {
                acc[key] = value;
            }
            return acc;
        }, {} as any);
    }
    return obj;
};

export const productApi = {
    create: async (data: Omit<Product, 'id' | 'createdAt' | 'isActive' | 'userId'>) => {
        const createProduct = httpsCallable(functions, "createProduct");
        const payload = removeUndefined(data);
        console.log("Creating product with payload:", JSON.stringify(payload, null, 2));
        const result = await createProduct(payload);
        return result.data as string; // Returns the new product ID
    },

    update: async (id: string, data: Partial<Product>) => {
        const updateProduct = httpsCallable(functions, "updateProduct");
        await updateProduct(removeUndefined({ id, ...data }));
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

    batchCreate: async (products: Omit<Product, 'id' | 'createdAt' | 'isActive' | 'userId'>[]) => {
        const batchCreateProducts = httpsCallable(functions, "batchCreateProducts");
        const sanitizedProducts = products.map(p => removeUndefined(p));
        await batchCreateProducts({ products: sanitizedProducts });
    }
};

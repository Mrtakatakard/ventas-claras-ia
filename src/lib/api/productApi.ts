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
        const productsFn = httpsCallable(functions, "products");
        const payload = removeUndefined(data);
        console.log("Creating product with payload:", JSON.stringify(payload, null, 2));
        const result = await productsFn({ action: 'create', data: payload });
        return result.data as string; // Returns the new product ID
    },

    update: async (id: string, data: Partial<Product>) => {
        const productsFn = httpsCallable(functions, "products");
        await productsFn({ action: 'update', data: removeUndefined({ id, ...data }) });
    },

    delete: async (id: string) => {
        const productsFn = httpsCallable(functions, "products");
        await productsFn({ action: 'delete', data: { id } });
    },

    checkCode: async (code: string, excludeId?: string): Promise<boolean> => {
        const productsFn = httpsCallable(functions, "products");
        const result = await productsFn({ action: 'checkCode', data: { code, excludeId } });
        return result.data as boolean;
    },

    batchCreate: async (productsList: Omit<Product, 'id' | 'createdAt' | 'isActive' | 'userId'>[]) => {
        const productsFn = httpsCallable(functions, "products");
        const sanitizedProducts = productsList.map(p => removeUndefined(p));
        await productsFn({ action: 'batchCreate', data: { products: sanitizedProducts } });
    }
};

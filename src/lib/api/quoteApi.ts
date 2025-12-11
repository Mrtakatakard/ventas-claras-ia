import { functions } from "../firebase/config";
import { httpsCallable } from "firebase/functions";
import { Quote } from "@/lib/types";
import { getQuotes } from "../firebase/service";

export const quoteApi = {
    list: async (userId: string): Promise<Quote[]> => {
        return getQuotes(userId);
    },

    create: async (quote: Omit<Quote, 'id' | 'createdAt' | 'isActive' | 'quoteNumber'>): Promise<string> => {
        const quotesFn = httpsCallable(functions, 'quotes');
        const result = await quotesFn({ action: 'create', data: quote });
        return result.data as string;
    },

    update: async (id: string, data: Partial<Quote>): Promise<void> => {
        const quotesFn = httpsCallable(functions, 'quotes');
        await quotesFn({ action: 'update', data: { id, ...data } });
    },

    delete: async (id: string): Promise<void> => {
        const quotesFn = httpsCallable(functions, 'quotes');
        await quotesFn({ action: 'delete', data: { id } });
    },

    convertToInvoice: async (quoteId: string): Promise<string> => {
        const quotesFn = httpsCallable(functions, 'quotes');
        const result = await quotesFn({ action: 'convertToInvoice', data: { id: quoteId } });
        return result.data as string;
    }
};

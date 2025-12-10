import { functions } from "../firebase/config";
import { httpsCallable } from "firebase/functions";
import { Quote } from "@/lib/types";
import { getQuotes } from "../firebase/service";

export const quoteApi = {
    list: async (userId: string): Promise<Quote[]> => {
        return getQuotes(userId);
    },

    create: async (quote: Omit<Quote, 'id' | 'createdAt' | 'isActive' | 'quoteNumber'>): Promise<string> => {
        const createQuote = httpsCallable(functions, 'createQuote');
        const result = await createQuote(quote);
        return result.data as string;
    },

    update: async (id: string, data: Partial<Quote>): Promise<void> => {
        const updateQuote = httpsCallable(functions, 'updateQuote');
        await updateQuote({ id, data });
    },

    delete: async (id: string): Promise<void> => {
        const deleteQuote = httpsCallable(functions, 'deleteQuote');
        await deleteQuote({ id });
    },

    convertToInvoice: async (quoteId: string): Promise<string> => {
        const convertQuoteToInvoice = httpsCallable(functions, 'convertQuoteToInvoice');
        const result = await convertQuoteToInvoice({ quoteId });
        return result.data as string;
    }
};

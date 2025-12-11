import { functions } from "../firebase/config";
import { httpsCallable } from "firebase/functions";
import { Invoice } from "../../../functions/src/types";

export const invoiceApi = {
    create: async (invoice: Omit<Invoice, 'id' | 'createdAt' | 'isActive'>): Promise<string> => {
        const invoicesFn = httpsCallable(functions, 'invoices');
        const result = await invoicesFn({ action: 'create', data: invoice });
        return result.data as string;
    },

    update: async (id: string, data: Partial<Invoice>): Promise<void> => {
        const invoicesFn = httpsCallable(functions, 'invoices');
        await invoicesFn({ action: 'update', data: { id, ...data } });
    },

    delete: async (id: string): Promise<void> => {
        const invoicesFn = httpsCallable(functions, 'invoices');
        await invoicesFn({ action: 'delete', data: { id } });
    },

    getReceivables: async (): Promise<Invoice[]> => {
        const invoicesFn = httpsCallable(functions, 'invoices');
        const result = await invoicesFn({ action: 'getReceivables', data: {} });
        return result.data as Invoice[];
    },

    addPayment: async (invoiceId: string, paymentData: any): Promise<void> => {
        const invoicesFn = httpsCallable(functions, 'invoices');
        await invoicesFn({ action: 'addPayment', data: { invoiceId, ...paymentData } });
    }
};

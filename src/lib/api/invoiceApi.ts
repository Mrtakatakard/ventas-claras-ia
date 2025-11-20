import { functions } from "../firebase/config";
import { httpsCallable } from "firebase/functions";
import { Invoice } from "../../../functions/src/types";

export const invoiceApi = {
    create: async (invoice: Omit<Invoice, 'id' | 'createdAt' | 'isActive'>): Promise<string> => {
        const createInvoice = httpsCallable(functions, 'invoiceController-createInvoice');
        const result = await createInvoice(invoice);
        return result.data as string;
    },

    update: async (id: string, data: Partial<Invoice>): Promise<void> => {
        const updateInvoice = httpsCallable(functions, 'invoiceController-updateInvoice');
        await updateInvoice({ id, data });
    },

    delete: async (id: string): Promise<void> => {
        const deleteInvoice = httpsCallable(functions, 'invoiceController-deleteInvoice');
        await deleteInvoice({ id });
    },

    getReceivables: async (): Promise<Invoice[]> => {
        const getReceivables = httpsCallable(functions, 'invoiceController-getReceivables');
        const result = await getReceivables();
        return result.data as Invoice[];
    }
};

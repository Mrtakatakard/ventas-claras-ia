import { functions } from "../firebase/config";
import { httpsCallable } from "firebase/functions";
import { Invoice } from "../../../functions/src/types";

export const invoiceApi = {
    create: async (invoice: Omit<Invoice, 'id' | 'createdAt' | 'isActive'>): Promise<string> => {
        const createInvoice = httpsCallable(functions, 'createInvoice');
        const result = await createInvoice(invoice);
        return result.data as string;
    },

    update: async (id: string, data: Partial<Invoice>): Promise<void> => {
        const updateInvoice = httpsCallable(functions, 'updateInvoice');
        await updateInvoice({ id, data });
    },

    delete: async (id: string): Promise<void> => {
        const deleteInvoice = httpsCallable(functions, 'deleteInvoice');
        await deleteInvoice({ id });
    },

    getReceivables: async (): Promise<Invoice[]> => {
        const getReceivables = httpsCallable(functions, 'getReceivables');
        const result = await getReceivables();
        return result.data as Invoice[];
    },

    addPayment: async (invoiceId: string, paymentData: any): Promise<void> => {
        const addPayment = httpsCallable(functions, 'addPayment');
        await addPayment({ invoiceId, paymentData });
    }
};

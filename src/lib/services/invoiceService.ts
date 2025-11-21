import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase/config";
import { Invoice } from "../types";
import { COLLECTIONS } from "../constants";
import {
    getDocuments,
    getDocument,
    getDocumentsForAdmin
} from "../firebase/firestore-utils";

export const getInvoices = (userId: string) => getDocuments<Invoice>(COLLECTIONS.INVOICES, userId);
export const getInvoice = (id: string) => getDocument<Invoice>(COLLECTIONS.INVOICES, id);

export const getAccountsReceivableFromFunction = async (): Promise<Invoice[]> => {
    const getReceivables = httpsCallable(functions, 'getAccountsReceivable');
    try {
        const result = await getReceivables();
        const data = result.data as { invoices: Invoice[] };
        return data.invoices;
    } catch (error: any) {
        console.error("Error calling getAccountsReceivable function:", error);
        throw new Error(error.message || "No se pudieron cargar los datos porque falta un índice en la base de datos. Revisa los logs de la función en la consola de Firebase para encontrar un enlace para crearlo automáticamente.");
    }
}

export const getAllInvoicesForAdmin = async () => {
    const invoices = await getDocumentsForAdmin<Invoice>(COLLECTIONS.INVOICES);
    return invoices;
};

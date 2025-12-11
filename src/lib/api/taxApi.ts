import { functions } from '../firebase/config';
import { httpsCallable } from 'firebase/functions';
import { TaxSettings } from '../types';

export const taxApi = {
    getTaxes: async (): Promise<TaxSettings[]> => {
        const taxesFn = httpsCallable<any, TaxSettings[]>(functions, 'taxes');
        const result = await taxesFn({ action: 'getTaxes', data: {} });
        return result.data;
    },

    createTax: async (data: Omit<TaxSettings, 'id' | 'userId' | 'isActive'>): Promise<string> => {
        const taxesFn = httpsCallable<any, string>(functions, 'taxes');
        const result = await taxesFn({ action: 'create', data });
        return result.data;
    },

    deleteTax: async (id: string): Promise<void> => {
        const taxesFn = httpsCallable<any, void>(functions, 'taxes');
        await taxesFn({ action: 'delete', data: { id } });
    }
};

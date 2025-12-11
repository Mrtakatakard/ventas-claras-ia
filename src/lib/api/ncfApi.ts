import { functions } from '../firebase/config';
import { httpsCallable } from 'firebase/functions';
import { NCFSequence } from '../types';

export const ncfApi = {
    getSequences: async (): Promise<NCFSequence[]> => {
        const ncfFn = httpsCallable<any, NCFSequence[]>(functions, 'ncf');
        const result = await ncfFn({ action: 'getSequences', data: {} });
        return result.data;
    },

    createSequence: async (data: Omit<NCFSequence, 'id' | 'userId' | 'isActive' | 'updatedAt'>): Promise<string> => {
        const ncfFn = httpsCallable<any, string>(functions, 'ncf');
        const result = await ncfFn({ action: 'create', data });
        return result.data;
    }
};

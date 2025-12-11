import { functions } from '../firebase/config';
import { httpsCallable } from 'firebase/functions';
import { NCFSequence } from '../types';

export const ncfApi = {
    getSequences: async (): Promise<NCFSequence[]> => {
        const getNCFSequencesFn = httpsCallable<void, NCFSequence[]>(functions, 'getNCFSequences');
        const result = await getNCFSequencesFn();
        return result.data;
    },

    createSequence: async (data: Omit<NCFSequence, 'id' | 'userId' | 'isActive' | 'updatedAt'>): Promise<string> => {
        const createNCFSequenceFn = httpsCallable<any, string>(functions, 'createNCFSequence');
        const result = await createNCFSequenceFn(data);
        return result.data;
    }
};

import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/config";

export interface RncData {
    rnc: string;
    name: string; // Razon Social
    commercial_name?: string;
    status?: string;
    description?: string; // Type of activity
}

export const rncApi = {
    async fetchByRnc(rnc: string): Promise<RncData | null> {
        const cleanRnc = rnc.replace(/[^\d]/g, '');
        if (!cleanRnc) return null;

        try {
            const generalFunc = httpsCallable(functions, 'general');
            const result = await generalFunc({ action: 'searchRnc', data: { rnc: cleanRnc } });
            return result.data as RncData | null;
        } catch (error) {
            console.error('Failed to fetch RNC data:', error);
            throw error;
        }
    }
};

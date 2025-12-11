import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase/config";
import { Client } from "../types";

export const clientApi = {
    create: async (data: Omit<Client, "id" | "userId" | "createdAt" | "isActive">) => {
        const clientsFn = httpsCallable(functions, "clients");
        const result = await clientsFn({ action: 'create', data });
        return result.data as Client;
    },

    update: async (id: string, data: Partial<Client>) => {
        const clientsFn = httpsCallable(functions, "clients");
        await clientsFn({ action: 'update', data: { id, ...data } });
    },

    delete: async (id: string) => {
        const clientsFn = httpsCallable(functions, "clients");
        await clientsFn({ action: 'delete', data: { id } });
    }
};

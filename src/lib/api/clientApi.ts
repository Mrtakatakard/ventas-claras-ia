import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase/config";
import { Client } from "../types";

export const clientApi = {
    create: async (data: Omit<Client, "id" | "userId" | "createdAt" | "isActive">) => {
        const createClient = httpsCallable(functions, "clientController-createClient");
        const result = await createClient(data);
        return result.data as Client;
    },

    update: async (id: string, data: Partial<Client>) => {
        const updateClient = httpsCallable(functions, "clientController-updateClient");
        await updateClient({ id, ...data });
    },

    delete: async (id: string) => {
        const deleteClient = httpsCallable(functions, "clientController-deleteClient");
        await deleteClient({ id });
    }
};

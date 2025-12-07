var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { ClientService } from "../services/clientService";
export const createClient = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Debes estar autenticado.");
    }
    return await ClientService.createClient(request.data, request.auth.uid);
});
export const updateClient = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Debes estar autenticado.");
    }
    const _a = request.data, { id } = _a, data = __rest(_a, ["id"]);
    if (!id) {
        throw new HttpsError("invalid-argument", "El ID del cliente es obligatorio.");
    }
    await ClientService.updateClient(id, data, request.auth.uid);
    return { success: true };
});
export const deleteClient = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Debes estar autenticado.");
    }
    const { id } = request.data;
    if (!id) {
        throw new HttpsError("invalid-argument", "El ID del cliente es obligatorio.");
    }
    await ClientService.deleteClient(id, request.auth.uid);
    return { success: true };
});
//# sourceMappingURL=clientController.js.map
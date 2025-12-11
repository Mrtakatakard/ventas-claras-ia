"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.clients = void 0;
const https_1 = require("firebase-functions/v2/https");
const clientService_1 = require("../services/clientService");
exports.clients = (0, https_1.onCall)({ cors: true, maxInstances: 1, cpu: 0.5 }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Debes estar autenticado.');
    }
    const { action, data } = request.data;
    try {
        switch (action) {
            case 'create':
                return await clientService_1.ClientService.createClient(data, request.auth.uid);
            case 'update': {
                const { id } = data, updateData = __rest(data, ["id"]);
                if (!id)
                    throw new https_1.HttpsError('invalid-argument', 'El ID del cliente es obligatorio para actualizar.');
                await clientService_1.ClientService.updateClient(id, updateData, request.auth.uid);
                return { success: true };
            }
            case 'delete': {
                const { id } = data;
                if (!id)
                    throw new https_1.HttpsError('invalid-argument', 'El ID del cliente es obligatorio para eliminar.');
                await clientService_1.ClientService.deleteClient(id, request.auth.uid);
                return { success: true };
            }
            default:
                throw new https_1.HttpsError('invalid-argument', `Acción desconocida: ${action}`);
        }
    }
    catch (error) {
        console.error(`Error in clients controller (${action}):`, error);
        throw error;
    }
});
//# sourceMappingURL=clientController.js.map
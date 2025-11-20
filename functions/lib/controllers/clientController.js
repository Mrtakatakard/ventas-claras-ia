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
exports.deleteClient = exports.updateClient = exports.createClient = void 0;
const https_1 = require("firebase-functions/v2/https");
const clientService_1 = require("../services/clientService");
exports.createClient = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Debes estar autenticado.");
    }
    return await clientService_1.ClientService.createClient(request.data, request.auth.uid);
});
exports.updateClient = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Debes estar autenticado.");
    }
    const _a = request.data, { id } = _a, data = __rest(_a, ["id"]);
    if (!id) {
        throw new https_1.HttpsError("invalid-argument", "El ID del cliente es obligatorio.");
    }
    await clientService_1.ClientService.updateClient(id, data, request.auth.uid);
    return { success: true };
});
exports.deleteClient = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Debes estar autenticado.");
    }
    const { id } = request.data;
    if (!id) {
        throw new https_1.HttpsError("invalid-argument", "El ID del cliente es obligatorio.");
    }
    await clientService_1.ClientService.deleteClient(id, request.auth.uid);
    return { success: true };
});
//# sourceMappingURL=clientController.js.map
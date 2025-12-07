"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientRepository = void 0;
const admin = require("firebase-admin");
const db = admin.firestore();
exports.ClientRepository = {
    async create(client) {
        const docRef = db.collection("clients").doc();
        const newClient = Object.assign({ id: docRef.id }, client);
        await docRef.set(newClient);
        return newClient;
    },
    async update(id, data) {
        await db.collection("clients").doc(id).update(data);
    },
    async get(id) {
        const doc = await db.collection("clients").doc(id).get();
        if (!doc.exists)
            return null;
        return doc.data();
    },
    async delete(id) {
        // Soft delete
        await db.collection("clients").doc(id).update({ isActive: false });
    }
};
//# sourceMappingURL=clientRepository.js.map
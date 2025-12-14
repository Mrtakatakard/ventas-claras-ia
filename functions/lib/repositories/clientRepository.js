"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientRepository = void 0;
const firebase_1 = require("../config/firebase");
exports.ClientRepository = {
    async create(client) {
        const docRef = firebase_1.db.collection('clients').doc();
        const newClient = Object.assign({ id: docRef.id }, client);
        await docRef.set(newClient);
        return newClient;
    },
    async update(id, data) {
        await firebase_1.db.collection('clients').doc(id).update(data);
    },
    async get(id) {
        const doc = await firebase_1.db.collection('clients').doc(id).get();
        if (!doc.exists)
            return null;
        return doc.data();
    },
    async delete(id) {
        // Soft delete
        await firebase_1.db.collection('clients').doc(id).update({ isActive: false });
    },
    async findByPhone(phone, userId) {
        const snapshot = await firebase_1.db.collection('clients')
            .where('userId', '==', userId)
            .where('phone', '==', phone)
            .where('isActive', '==', true)
            .limit(1)
            .get();
        if (snapshot.empty)
            return null;
        return snapshot.docs[0].data();
    },
};
//# sourceMappingURL=clientRepository.js.map
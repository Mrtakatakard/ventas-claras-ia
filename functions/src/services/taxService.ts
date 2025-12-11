import { db } from '../config/firebase';
import { TaxSettings } from '../types';

export const taxService = {
    // Get all active taxes for a user
    getTaxes: async (userId: string): Promise<TaxSettings[]> => {
        const snapshot = await db.collection('taxSettings')
            .where('userId', '==', userId)
            .where('isActive', '==', true)
            .get();

        if (snapshot.empty) {
            // Seed defaults if no taxes exist
            const defaults = [
                { name: 'ITBIS 18%', rate: 0.18, isDefault: true },
                { name: 'ITBIS 16%', rate: 0.16, isDefault: false },
                { name: 'Exento 0%', rate: 0, isDefault: false },
            ];

            const seededTaxes: TaxSettings[] = [];

            const batch = db.batch();
            for (const def of defaults) {
                const docRef = db.collection('taxSettings').doc();
                const newTax: TaxSettings = {
                    id: docRef.id,
                    userId,
                    name: def.name,
                    rate: def.rate,
                    isDefault: def.isDefault,
                    isActive: true,
                };
                batch.set(docRef, newTax);
                seededTaxes.push(newTax);
            }
            await batch.commit();
            return seededTaxes;
        }

        return snapshot.docs.map(doc => doc.data() as TaxSettings);
    },

    // Create a new tax
    createTax: async (userId: string, data: Omit<TaxSettings, 'id' | 'userId' | 'isActive'>): Promise<string> => {
        const id = db.collection('taxSettings').doc().id;
        const newTax: TaxSettings = {
            ...data,
            id,
            userId,
            isActive: true,
        };

        if (newTax.isDefault) {
            // Unset other defaults if this one is set to default
            // This is a bit expensive (read-write), but handled simply:
            // We won't strictly enforce only one default in backend yet to keep it simple,
            // or the frontend can handle the logic. 
            // Let's strictly enforce it for best UX.
            const others = await db.collection('taxSettings')
                .where('userId', '==', userId)
                .where('isDefault', '==', true)
                .get();

            const batch = db.batch();
            others.docs.forEach(doc => {
                batch.update(doc.ref, { isDefault: false });
            });
            batch.set(db.collection('taxSettings').doc(id), newTax);
            await batch.commit();
        } else {
            await db.collection('taxSettings').doc(id).set(newTax);
        }

        return id;
    },

    // Delete (soft delete)
    deleteTax: async (userId: string, taxId: string): Promise<void> => {
        await db.collection('taxSettings').doc(taxId).update({ isActive: false });
    }
};

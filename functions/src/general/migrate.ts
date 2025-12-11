/**
 * @fileoverview Cloud Function to migrate data by adding isActive: true to all documents in specified collections.
 * This is intended as a one-time utility function.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { db } from '../config/firebase';

export const migrateDataToIsActive = onCall({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes estar autenticado para realizar esta acción.');
    }

    logger.info(`Iniciando migración de datos por el usuario: ${request.auth.uid}`);

    let totalDocsUpdated = 0;
    const collectionsWithError: string[] = [];

    try {
        // Primero, obtenemos la lista de todas las colecciones existentes en la base de datos.
        const allCollections = await db.listCollections();
        const collectionIds = allCollections.map((col) => col.id);

        logger.info('Colecciones encontradas:', collectionIds.join(', '));

        // Iteramos únicamente sobre las colecciones que sí existen.
        for (const collectionRef of allCollections) {
            const collectionName = collectionRef.id;
            logger.info(`Procesando colección: ${collectionName}`);

            try {
                const snapshot = await collectionRef.get();

                if (snapshot.empty) {
                    logger.info(`No hay documentos en la colección '${collectionName}', se omite.`);
                    continue;
                }

                let batch = db.batch();
                let batchCount = 0;
                let docsInCollectionMigrated = 0;

                for (const doc of snapshot.docs) {
                    const data = doc.data();
                    // Solo actualizamos si el campo 'isActive' NO existe.
                    if (data.isActive === undefined) {
                        batch.update(doc.ref, { isActive: true });
                        batchCount++;
                        totalDocsUpdated++;
                        docsInCollectionMigrated++;

                        // Commit el lote cada 400 documentos para no exceder los límites.
                        if (batchCount === 400) {
                            await batch.commit();
                            logger.info(`Lote de ${batchCount} documentos en '${collectionName}' migrado.`);
                            batch = db.batch();
                            batchCount = 0;
                        }
                    }
                }

                // Commit del último lote si queda algo.
                if (batchCount > 0) {
                    await batch.commit();
                    logger.info(`Lote final de ${batchCount} documentos en '${collectionName}' migrado.`);
                }

                if (docsInCollectionMigrated > 0) {
                    logger.info(`Migración para '${collectionName}' completada. ${docsInCollectionMigrated} documentos actualizados.`);
                } else {
                    logger.info(`No hay documentos que necesiten migración en '${collectionName}'.`);
                }
            } catch (error) {
                logger.error(`Error procesando los documentos de la colección '${collectionName}':`, error);
                collectionsWithError.push(collectionName);
            }
        }
    } catch (error) {
        logger.error('Error catastrófico listando las colecciones:', error);
        throw new HttpsError('internal', 'No se pudieron listar las colecciones de la base de datos. Revisa los logs de la función.');
    }

    if (collectionsWithError.length > 0) {
        const errorMessage = `Ocurrió un error al procesar las siguientes colecciones: ${collectionsWithError.join(', ')}. Revisa los logs de la función para más detalles.`;
        logger.error(errorMessage);
        throw new HttpsError('internal', errorMessage);
    }

    logger.info(`Migración completada. Total de documentos actualizados: ${totalDocsUpdated}`);
    return { success: true, message: `Migración completada. ${totalDocsUpdated} documentos fueron actualizados.` };
});

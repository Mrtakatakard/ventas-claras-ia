
import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { db } from '../config/firebase';
import { defineString } from 'firebase-functions/params';

// Environmental Variables (Secrets)
// These need to be set in your Firebase project using: firebase functions:secrets:set WHATSAPP_VERIFY_TOKEN
const WHATSAPP_VERIFY_TOKEN = defineString('WHATSAPP_VERIFY_TOKEN');

export const webhook = onRequest({ maxInstances: 10 }, async (req, res) => {
    // 1. VERIFICATION REQUEST (GET)
    // Meta sends this to verify we own the endpoint.
    if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN.value()) {
            logger.info('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            logger.warn('WEBHOOK_VERIFICATION_FAILED', { mode, token });
            res.sendStatus(403);
        }
        return;
    }

    // 2. EVENT NOTIFICATION (POST)
    if (req.method === 'POST') {
        const body = req.body;

        // Check if it's a WhatsApp status update or message
        if (body.object) {
            if (
                body.entry &&
                body.entry[0].changes &&
                body.entry[0].changes[0] &&
                body.entry[0].changes[0].value.messages &&
                body.entry[0].changes[0].value.messages[0]
            ) {
                const message = body.entry[0].changes[0].value.messages[0];
                const fromRaw = message.from; // e.g., "18095551234"
                const from = '+' + fromRaw; // Normalize to E.164 matches our DB storage "+1809..."

                logger.info('MESSAGE_RECEIVED', { from, type: message.type });

                try {
                    // 3. IDENTIFY CLIENT (The "Ear" Logic)
                    const usersRef = db.collection('users');
                    // We search for the user who OWNS this phone number.
                    const querySnapshot = await usersRef.where('phoneNumber', '==', from).limit(1).get();

                    if (!querySnapshot.empty) {
                        const userDoc = querySnapshot.docs[0];
                        const userData = userDoc.data();
                        logger.info('USER_IDENTIFIED', { userId: userDoc.id, name: userData.name });

                        // TODO: Step 4 - Pass to AI Service (Gemini)
                        // await processMessageWithAI(userDoc.id, message);

                    } else {
                        logger.warn('USER_NOT_FOUND', { from });
                        // Optional: Send a "You are not registered" reply here (requires whatsappService)
                    }

                } catch (error) {
                    logger.error('ERROR_PROCESSING_MESSAGE', error);
                }
            }

            // Return a 200 OK to acknowledge receipt of the event
            res.sendStatus(200);
        } else {
            // Return a 404 if the event is not from a WhatsApp API
            res.sendStatus(404);
        }
    }
});

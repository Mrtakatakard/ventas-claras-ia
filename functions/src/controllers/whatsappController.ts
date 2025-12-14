import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { conversationAgent } from "../ai/conversationAgent";

// TODO: Move this to environment variables
const VERIFY_TOKEN = "ventas-claras-secret-token";

export const webhook = onRequest({ cors: true }, async (req, res) => {
    // 1. Handle Webhook Verification (GET)
    if (req.method === "GET") {
        const mode = req.query["hub.mode"];
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];

        if (mode && token) {
            if (mode === "subscribe" && token === VERIFY_TOKEN) {
                logger.info("WEBHOOK_VERIFIED");
                res.status(200).send(challenge);
            } else {
                res.sendStatus(403);
            }
        } else {
            res.sendStatus(400); // Bad Request if parameters are missing
        }
        return;
    }

    // 2. Handle Message Events (POST)
    if (req.method === "POST") {
        const body = req.body;

        logger.info("Incoming Webhook Payload:", JSON.stringify(body, null, 2));

        // Check if this is an event from a WhatsApp API subscription
        if (body.object) {
            if (
                body.entry &&
                body.entry[0].changes &&
                body.entry[0].changes[0] &&
                body.entry[0].changes[0].value.messages &&
                body.entry[0].changes[0].value.messages[0]
            ) {
                const message = body.entry[0].changes[0].value.messages[0];
                const from = message.from; // Sender phone number
                const messageType = message.type;

                logger.info(`Received message from ${from}. Type: ${messageType}`);

                if (messageType === 'text') {
                    const textBody = message.text.body;
                    await conversationAgent.handleMessage(from, textBody);
                }

                res.sendStatus(200);
            } else {
                // Not a message event or unexpected format
                res.sendStatus(200); // Acknowledge anyway to prevent retries
            }
        } else {
            res.sendStatus(404);
        }
    } else {
        res.sendStatus(405); // Method Not Allowed
    }
});

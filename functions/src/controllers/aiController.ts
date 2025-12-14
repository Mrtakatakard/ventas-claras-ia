import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { db } from '../config/firebase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { defineString } from 'firebase-functions/params';

// Define the API Key parameter (matching Genkit standard)
const googleApiKey = defineString('GOOGLE_GENAI_API_KEY');

export const scanInvoice = onCall({ maxInstances: 5, memory: '512MiB', cors: true }, async (request) => {
    // 1. Authentication Check
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes iniciar sesión para usar la IA.');
    }

    const { imageBase64 } = request.data;
    const uid = request.auth.uid;

    if (!imageBase64) {
        throw new HttpsError('invalid-argument', 'Falta la imagen de la factura.');
    }

    try {
        // 2. Gatekeeper: Get Organization & Check Credits
        // We need to fetch the User first to know their Org
        const userSnap = await db.collection('users').doc(uid).get();
        const userData = userSnap.data();

        let orgId = userData?.organizationId;

        // Fallback: If no linked Org, try to find one owned by this user
        if (!orgId) {
            const ownedOrgs = await db.collection('organizations')
                .where('ownerId', '==', uid)
                .where('isActive', '==', true)
                .limit(1)
                .get();

            if (!ownedOrgs.empty) {
                orgId = ownedOrgs.docs[0].id;
                // Self-heal: Link it for next time
                await db.collection('users').doc(uid).set({ organizationId: orgId }, { merge: true });
            } else {
                // If still no org, we can't check credits
                throw new HttpsError('failed-precondition', 'No tienes una organización asignada para facturar los créditos de IA.');
            }
        }

        const orgRef = db.collection('organizations').doc(orgId);

        // We run the credit check + deduction in a Transaction for safety
        await db.runTransaction(async (transaction) => {
            const orgSnap = await transaction.get(orgRef);
            if (!orgSnap.exists) throw new HttpsError('not-found', 'Organización no encontrada.');

            const org = orgSnap.data() as any;

            // Calculate Limits
            // Note: We should ideally have a helper for this, but inline is safe for now.
            const monthlyLimit = org.limits?.aiCreditsPerMonth || 0;
            const extraCredits = org.addOns?.extraAICredits || 0;
            const savedPeriodStart = org.usage?.periodStart || '1970-01-01';

            // Check Lazy Reset
            const today = new Date();
            const currentMonthStr = today.toISOString().slice(0, 7); // "2024-03"
            const savedMonthStr = savedPeriodStart.slice(0, 7);

            let usedThisPeriod = org.usage?.aiCreditsUsedThisPeriod || 0;

            // If new month, reset 'used' count virtually for this check
            // We will persist the reset in the update below
            if (currentMonthStr !== savedMonthStr) {
                usedThisPeriod = 0;
                // We will update periodStart in the transaction
            }

            const totalAvailable = monthlyLimit + extraCredits;

            // THE CHECK
            if (usedThisPeriod >= totalAvailable) {
                throw new HttpsError('resource-exhausted', 'Has agotado tus créditos de IA este mes. ¡Actualiza tu plan o compra un paquete!');
            }

            // 3. AI Execution (Using Gemini 1.5 Flash)
            // Note: We execute AI *inside* the transaction block? 
            // Risk: AI takes 5 seconds, locking the doc? 
            // Better: Check credit first (OPTIMISTIC), then run AI outside, then deduct?
            // Strict Approach: Deduct first (or Reserve), then return result?
            // Let's do: Check & Deduct immediately. If AI fails, we could refund, but for simplicity/security we treat "Attempt" as cost.
            // actually, let's process AI *outside* transaction to avoid Firestore Contention, but ensure valid state logic.

            // PRO PATTERN: We just CHECK here. We duplicate logic? No.
            // Let's stick to simple Flow: 
            // 1. Check & Reserve (Increment Used) inside Transaction.
            // 2. Run AI.
            // 3. If AI fails drastically, maybe decrement (refund).

            // Prepare new Usage object
            const newUsage = {
                ...org.usage,
                periodStart: (currentMonthStr !== savedMonthStr) ? today.toISOString().split('T')[0] : savedPeriodStart,
                aiCreditsUsedThisPeriod: (currentMonthStr !== savedMonthStr) ? 1 : usedThisPeriod + 1
            };

            transaction.update(orgRef, { usage: newUsage });
        });

        // 4. Run Gemini AI (Now that we paid)
        const genAI = new GoogleGenerativeAI(googleApiKey.value());

        // Use Flash 1.5 (Stable & Fast)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Extract mime type and clean base64
        const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z]+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
        const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|webp);base64,/, "");

        const prompt = `
      Extract the data from this invoice image into strict JSON format.
      Return ONLY the JSON with this structure:
      {
        "invoiceNumber": "string or null",
        "date": "YYYY-MM-DD or null",
        "supplierName": "string",
        "items": [
          { "description": "string", "quantity": number, "unitPrice": number, "total": number }
        ],
        "subtotal": number,
        "tax": number,
        "total": number
      }
      If values are missing, use null or 0. Try to correct OCR errors for numbers. This is for the Dominican Republic market (RD$, ITBIS).
    `;

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: cleanBase64, mimeType: mimeType } }
        ]);

        const response = await result.response;
        const text = response.text();

        // Parse JSON from Markdown code block if present
        let jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();

        // Repair common JSON errors (optional, but good for MVP)
        // jsonString = jsonRepair(jsonString); 

        let data;
        try {
            data = JSON.parse(jsonString);
        } catch (parseError: any) {
            logger.error("MAGIC_IMPORT_PARSE_ERROR", { uid, rawText: text, error: parseError.message });
            throw new HttpsError('internal', 'La IA devolvió un formato inválido. Por favor intenta de nuevo.');
        }

        // 5. Log Success
        logger.info("MAGIC_IMPORT_SUCCESS", { uid, orgId, processingTime: 'unknown' });

        return { success: true, data };

    } catch (error: any) {
        logger.error("MAGIC_IMPORT_ERROR", { uid, error: error.message });

        // If it was a Quota error, send it back clearly
        if (error.code === 'resource-exhausted') {
            throw error;
        }

        // If it was our Parse Error, send it back clearly
        if (error.code === 'internal' && error.message.includes('formato inválido')) {
            throw error;
        }

        // DEBUG: Return original error to user to see what is happening
        throw new HttpsError('internal', `Error AI: ${error.message}`);
    }
});

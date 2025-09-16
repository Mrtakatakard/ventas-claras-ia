
'use server';
/**
 * @fileOverview An AI agent that provides personalized sales insights for a given client.
 *
 * - getSalesInsights - A function that generates sales recommendations.
 * - SalesInsightsInput - The input type for the getSalesInsights function.
 * - SalesInsightsOutput - The return type for the getSalesInsights function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { db } from '@/lib/firebase/config';
import { collection, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

const SalesInsightsInputSchema = z.object({
  client: z.string().describe("A JSON string representing the client's profile."),
  invoices: z.string().describe("A JSON string representing the client's invoice history."),
  allProducts: z.string().describe("A JSON string representing all available products in the inventory."),
  similarClientInvoices: z.string().describe("A JSON string representing invoices from other clients to identify trends and cross-selling opportunities."),
});
export type SalesInsightsInput = z.infer<typeof SalesInsightsInputSchema>;

const SalesInsightsOutputSchema = z.object({
  insights: z.array(z.string()).describe('An array of 3 to 5 personalized and actionable sales tips.'),
});
export type SalesInsightsOutput = z.infer<typeof SalesInsightsOutputSchema>;

export async function getSalesInsights(input: SalesInsightsInput): Promise<SalesInsightsOutput> {
    return salesInsightsFlow(input);
}

const salesInsightsPrompt = ai.definePrompt({
  name: 'salesInsightsPrompt',
  input: { schema: SalesInsightsInputSchema },
  output: { schema: SalesInsightsOutputSchema },
  prompt: `
    You are an expert sales mentor AI integrated into a CRM called Ventas Claras. 
    Your goal is to provide personalized, actionable sales recommendations to the user based on the data of a specific client.
    Your response must be in Spanish.

    Here is the data for the client you need to analyze:
    - Client Profile: {{{client}}}
    - Client's Invoice History: {{{invoices}}}
    - All Available Products: {{{allProducts}}}
    - Invoices from other clients (for comparison): {{{similarClientInvoices}}}
    
    Analyze the provided JSON data to generate your recommendations. Look for patterns in their purchase history, payment behavior, current debt, and missing profile information. Identify cross-selling opportunities by comparing their purchases with what similar clients buy.

    When suggesting specific products, use ONLY the product's 'name'. DO NOT include the product's ID in your response.

    Based on your analysis, provide a list of 3-5 short, concise, and practical tips in the 'insights' array. Each tip must be a single, direct sentence.
    **CRITICAL**: Each string in the 'insights' array MUST start with a single relevant emoji, followed by a single space, and then the text of the tip. Do not add any introductory phrases like "¡Hola!".

    **Example of a correct tip:** "🎁 Intenta conseguir su fecha de cumpleaños para un detalle especial."
    **Example of an incorrect tip:** "He notado que no tienes la fecha de cumpleaños de Kaury..."

    **Scenario-based tips:**
    - If the client has a high 'balanceDue', provide respectful tips for collection (e.g., "🗓️ Parece que hay un saldo pendiente. Un recordatorio amistoso podría ser útil.").
    - If the client is a loyal, frequent customer with no debt, congratulate the user (e.g., "🎉 ¡Excelente trabajo! Este es un cliente estrella.") and suggest loyalty rewards or upselling higher-value products.
    - If the user is missing the client's 'birthday', recommend they get it for relationship building (e.g., "🎁 Intenta conseguir su fecha de cumpleaños para un detalle especial.").
    - Suggest when to offer a discount (e.g., to close a big sale, as a reward for prompt payment, or to introduce a new product).

    Generate the 'insights' array now.
  `,
});

const salesInsightsFlow = ai.defineFlow(
  {
    name: 'salesInsightsFlow',
    inputSchema: SalesInsightsInputSchema,
    outputSchema: SalesInsightsOutputSchema,
  },
  async (input) => {
    const clientData = JSON.parse(input.client);
    const clientId = clientData.id;

    if (!clientId) {
      const { output } = await salesInsightsPrompt(input);
      return output!;
    }

    const cacheCollection = collection(db, 'cacheSugerencias');
    const cacheDocRef = doc(cacheCollection, clientId);
    const cacheDocSnap = await getDoc(cacheDocRef);

    const twentyFourHoursAgo = Timestamp.now().seconds - (24 * 60 * 60);

    if (cacheDocSnap.exists()) {
      const cacheData = cacheDocSnap.data();
      const generatedAt = cacheData.generadaEn as Timestamp;

      if (generatedAt && generatedAt.seconds > twentyFourHoursAgo) {
        return { insights: cacheData.sugerencia };
      }
    }

    // Cache doesn't exist or is stale, generate new insights
    const { output } = await salesInsightsPrompt(input);

    if (output) {
      await setDoc(cacheDocRef, {
        clienteId: clientId,
        sugerencia: output.insights,
        generadaEn: Timestamp.now(),
      });
    }

    return output!;
  }
);

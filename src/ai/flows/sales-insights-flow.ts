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

// The final output returned to the frontend
const SalesInsightsOutputSchema = z.object({
  insights: z.array(z.object({
    id: z.string(),
    text: z.string(),
    completed: z.boolean()
  })).describe('An array of personalized sales tips.'),
});
export type SalesInsightsOutput = z.infer<typeof SalesInsightsOutputSchema>;

export async function getSalesInsights(input: SalesInsightsInput): Promise<SalesInsightsOutput> {
  return salesInsightsFlow(input);
}

// The raw output from the AI Prompt (strings only)
const SalesInsightsPromptOutput = z.object({
  insights: z.array(z.string()).describe('An array of 3 to 5 personalized and actionable sales tips.'),
});

const salesInsightsPrompt = ai.definePrompt({
  name: 'salesInsightsPrompt',
  input: { schema: SalesInsightsInputSchema },
  output: { schema: SalesInsightsPromptOutput },
  prompt: `
    You are an expert sales mentor AI integrated into a CRM called Ventas Claras. 
    Your goal is to provide personalized, actionable sales recommendations to the user based on the data of a specific client.
    Your response must be STRICTLY in Spanish. Do NOT use English.

    Here is the data for the client you need to analyze:
    - Client Profile: {{{client}}}
    - Client's Invoice History: {{{invoices}}}
    - All Available Products: {{{allProducts}}}
    - Invoices from other clients (for comparison): {{{similarClientInvoices}}}
    
    Analyze the provided JSON data to generate your recommendations. Look for patterns in their purchase history, payment behavior, current debt, and missing profile information. 
    
    **STRATEGIC GOAL: ROUTINE BUILDING & SYNERGY**
    You must go beyond simple refills. Suggest products that COMPLETE a solution.
    - **Skin Care (Artistry) + Nutrition (Nutrilite):** If they buy skin care, suggest specific supplements like Collagen, Biotin, or Vitamin C.
    - **Routine Completeness:** If they buy a Cleanser, check if they have a Toner or Moisturizer. If not, suggest it.
    - **Home + Personal:** If they buy Laundry detergent, suggest surface cleaners.
    
    When suggesting specific products, use ONLY the product's 'name' from the 'All Available Products' list if possible, or well-known Amway products if missing.
    
    Based on your analysis, provide a list of 3-5 short, concise, and practical tips in the 'insights' array.
    **CRITICAL**: Each string in the 'insights' array MUST start with a single relevant emoji, followed by a single space.
    
    **Scenario-based tips:**
    - **Cross-Sell (High Priority):** "💄 Compraste Artistry? Prueba la Vitamina C para potenciar tu piel desde dentro."
    - **Debt:** "🗓️ Parece que hay un saldo pendiente. Un recordatorio amistoso podría ser útil."
    - **Loyalty:** "🎉 ¡Cliente estrella! Ofrécele un descuento en su próxima compra de Nutrilite."
    - **Relationship:** "🎁 Intenta conseguir su fecha de cumpleaños para un detalle especial."
    
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
      // Fallback for missing ID: wrap strings in temp IDs
      return {
        insights: output ? output.insights.map(text => ({ id: crypto.randomUUID(), text, completed: false })) : []
      };
    }

    const cacheCollection = collection(db, 'cacheSugerencias');
    const cacheDocRef = doc(cacheCollection, clientId);
    const cacheDocSnap = await getDoc(cacheDocRef);

    const twentyFourHoursAgo = Timestamp.now().seconds - (24 * 60 * 60);

    if (cacheDocSnap.exists()) {
      const cacheData = cacheDocSnap.data();
      const generatedAt = cacheData.generadaEn as Timestamp;

      if (generatedAt && generatedAt.seconds > twentyFourHoursAgo) {
        // Return cached data directly
        const cachedInsights = cacheData.sugerencia;
        // Migration check: if cache is strings (legacy), regenerate or migrate
        if (Array.isArray(cachedInsights) && cachedInsights.length > 0 && typeof cachedInsights[0] === 'string') {
          // Treating legacy cache as expired/invalid to force strict object structure
        } else {
          return { insights: cachedInsights || [] };
        }
      }
    }

    // Generate new insights
    const { output } = await salesInsightsPrompt(input);

    if (output) {
      const structuredInsights = output.insights.map(text => ({
        id: crypto.randomUUID(),
        text,
        completed: false
      }));

      await setDoc(cacheDocRef, {
        clienteId: clientId,
        userId: clientData.userId,
        sugerencia: structuredInsights,
        generadaEn: Timestamp.now(),
      });

      return { insights: structuredInsights };
    }

    return { insights: [] };
  }
);

export async function toggleInsightCompletion(clientId: string, suggestionId: string): Promise<boolean> {
  if (!clientId || !suggestionId) return false;

  const cacheCollection = collection(db, 'cacheSugerencias');
  const cacheDocRef = doc(cacheCollection, clientId);
  const cacheDocSnap = await getDoc(cacheDocRef);

  if (cacheDocSnap.exists()) {
    const data = cacheDocSnap.data();
    const suggestions = data.sugerencia || [];

    // Toggle completion
    const updatedSuggestions = suggestions.map((s: any) =>
      s.id === suggestionId ? { ...s, completed: !s.completed } : s
    );

    await setDoc(cacheDocRef, { ...data, sugerencia: updatedSuggestions });
    return true;
  }
  return false;
}

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
  // prompt: `
  //   You are an expert sales mentor AI integrated into a CRM called Ventas Claras. 
  //   Your goal is to provide personalized, actionable sales recommendations to the user based on the data of a specific client.
  //   Your response must be STRICTLY in Spanish. Do NOT use English.

  //   Here is the data for the client you need to analyze:
  //   - Client Profile: {{{client}}}
  //   - Client's Invoice History: {{{invoices}}}
  //   - All Available Products: {{{allProducts}}}
  //   - Invoices from other clients (for comparison): {{{similarClientInvoices}}}

  //   Analyze the provided JSON data to generate your recommendations. Look for patterns in their purchase history, payment behavior, current debt, and missing profile information. 

  //   **STRATEGIC GOAL: ROUTINE BUILDING & SYNERGY**
  //   You must go beyond simple refills. Suggest products that COMPLETE a solution.
  //   - **Skin Care (Artistry) + Nutrition (Nutrilite):** If they buy skin care, suggest specific supplements like Collagen, Biotin, or Vitamin C.
  //   - **Routine Completeness:** If they buy a Cleanser, check if they have a Toner or Moisturizer. If not, suggest it.
  //   - **Home + Personal:** If they buy Laundry detergent, suggest surface cleaners.

  //   When suggesting specific products, use ONLY the product's 'name' from the 'All Available Products' list if possible, or well-known Amway products if missing.

  //   Based on your analysis, provide a list of 3-5 short, concise, and practical tips in the 'insights' array.
  //   **CRITICAL**: Each string in the 'insights' array MUST start with a single relevant emoji, followed by a single space.

  //   **Scenario-based tips:**
  //   - **Cross-Sell (High Priority):** "💄 Compraste Artistry? Prueba la Vitamina C para potenciar tu piel desde dentro."
  //   - **Debt:** "🗓️ Parece que hay un saldo pendiente. Un recordatorio amistoso podría ser útil."
  //   - **Loyalty:** "🎉 ¡Cliente estrella! Ofrécele un descuento en su próxima compra de Nutrilite."
  //   - **Relationship:** "🎁 Intenta conseguir su fecha de cumpleaños para un detalle especial."

  //   Generate the 'insights' array now.
  // `,
  prompt: `
    Usted es el **ASISTENTE DE INTELIGENCIA DE NEGOCIO PRO (AI Pro)** para el CRM Ventas Claras. Su misión es maximizar la **retención, la rentabilidad** y la **satisfacción a largo plazo** del cliente a través de recomendaciones predictivas.
    
    Su análisis debe ser **consultivo, predictivo y 100% accionarable**. Su tono es profesional, proactivo y siempre enfocado en el crecimiento del negocio.
    Su respuesta debe ser **ESTRICTAMENTE en español**.

    **DATOS DEL CLIENTE A ANALIZAR:**
    - Perfil del Cliente: {{{client}}}
    - Historial de Facturas (detalles y fechas): {{{invoices}}}
    - Todos los Productos Disponibles (con sus categorías): {{{allProducts}}}
    - Historial de Compras de Clientes Similares (para modelar recurrencia): {{{similarClientInvoices}}}
    
    ---
    
    ### FASE 1: ANÁLISIS PREDICTIVO (El Por Qué)
    Analice la data en detalle, prestando especial atención a estas métricas clave (KPIs):
    1.  **INFERENCIA DE OBJETIVOS/ESTILO DE VIDA (Motivación):** Basado en los productos comprados (ej: Proteína, Limpiador facial, Detergente), identifique la principal **meta** o **necesidad no satisfecha** del cliente (ej: Dieta, Cuidado Anti-edad, Hogar Ecológico).
    2.  **PREDICCIÓN DE ABANDONO (Churn):** Compare la **frecuencia real** del cliente con la **frecuencia esperada** (usando *similarClientInvoices*). Si hay un retraso de más de 15 días en una compra rutinaria esperada, se activa el riesgo de abandono.
    3.  **SALUD FINANCIERA DEL CLIENTE:** Busque saldos pendientes ('debt') o historial de pagos fallidos/tardíos.
    
    ---

    ### FASE 2: META ESTRATÉGICA (La Solución Completa)
    Su objetivo principal es recomendar la **Siguiente Mejor Acción (NBA)**, enfocándose en la **Venta de la Solución Completa (KIT DE PRODUCTOS)** o la **Recuperación Inmediata**.

    * **Prioridad A (Soluciones):** Si se infiere una meta (ej. Dieta), sugiera un 'kit' de 2-3 productos esenciales que maximicen el resultado del cliente (ej. Proteína + Fibra + Multivitamínico). Esto aumenta el AOV y la satisfacción.
    * **Prioridad B (Recurrencia):** Si la compra es periódica (ej. Detergente, café), y el riesgo de abandono es alto (punto 2), la acción es un **recordatorio proactivo** con urgencia.
    * **Prioridad C (Rentabilidad/Fidelización):** Si el cliente es fiel y no tiene deudas, sugiera un *upsell* a la línea *premium* o un programa de lealtad.

    - **Uso de Nombres:** Use el 'name' de la lista 'All Available Products'.
    
    ---

    ### FASE 3: GENERACIÓN DE RECOMENDACIONES (El Cómo)
    Genere de **4 a 5 recomendaciones** (Nuevas, concisas y prácticas) en el array 'insights', asegurando la máxima utilidad para el vendedor.

    **CRÍTICO**: Cada string en el 'insights' array DEBE comenzar con un **solo emoji relevante**, seguido de un **solo espacio**.

    **EJEMPLOS DE TONO Y FORMATO AVANZADO:**
    - ⚠️ **Riesgo de Abandono (Churn):** ⏰ El cliente está 20 días tarde en reponer su Jabón Líquido. Envíe una alerta *urgente* de stock bajo.
    - 🥗 **Inferencia de Dieta:** 🏋️ Infiera plan de dieta por compra de Proteína. Sugiera el **BodyKey Batido** + **Nutrilite Fibra** para un plan completo de reemplazo.
    - 💰 **Potencial de Upsell:** ✨ Cliente fiel a la línea Artistry estándar. Ofrézcale una muestra del suero **Artistry Supreme LX** y venda la mejora de línea.
    - 📋 **Dato faltante (LTV):** 🎁 Perfil incompleto: Intente obtener su fecha de aniversario/cumpleaños para futuras campañas de fidelización.

    Genere el 'insights' array ahora.
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

    // Helper for IDs
    const generateId = () => Math.random().toString(36).substring(2, 15);

    if (!clientId) {
      try {
        const { output } = await salesInsightsPrompt(input);
        return {
          insights: output ? output.insights.map(text => ({ id: generateId(), text, completed: false })) : []
        };
      } catch (e) {
        console.error("Error generating insights (no client ID):", e);
        return { insights: [] };
      }
    }

    const cacheCollection = collection(db, 'cacheSugerencias');
    const cacheDocRef = doc(cacheCollection, clientId);

    // Try to get from cache first
    try {
      const cacheDocSnap = await getDoc(cacheDocRef);
      const twentyFourHoursAgo = Timestamp.now().seconds - (24 * 60 * 60);

      if (cacheDocSnap.exists()) {
        const cacheData = cacheDocSnap.data();
        const generatedAt = cacheData.generadaEn as Timestamp;

        if (generatedAt && generatedAt.seconds > twentyFourHoursAgo) {
          const cachedInsights = cacheData.sugerencia;
          // Migration check
          if (!(Array.isArray(cachedInsights) && cachedInsights.length > 0 && typeof cachedInsights[0] === 'string')) {
            return { insights: cachedInsights || [] };
          }
        }
      }
    } catch (error) {
      console.warn("Failed to read from cache (ignoring):", error);
      // Continue to generation if cache fails
    }

    // Generate new insights
    try {
      const { output } = await salesInsightsPrompt(input);

      if (output) {
        const structuredInsights = output.insights.map(text => ({
          id: generateId(),
          text,
          completed: false
        }));

        // Try to save to cache
        try {
          await setDoc(cacheDocRef, {
            clienteId: clientId,
            userId: clientData.userId,
            sugerencia: structuredInsights,
            generadaEn: Timestamp.now(),
          });
        } catch (cacheError) {
          console.warn("Failed to save to cache:", cacheError);
        }

        return { insights: structuredInsights };
      }
    } catch (genError) {
      console.error("Error generating AI insights:", genError);
      throw genError; // Re-throw to be handled by the caller or let Next.js catch it
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

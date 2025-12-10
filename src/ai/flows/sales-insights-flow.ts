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
import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

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
    Usted es el **ASISTENTE DE INTELIGENCIA DE NEGOCIO PRO 360** para el CRM Ventas Claras. Su objetivo es generar la **Siguiente Mejor Acción (NBA)**, maximizando la **rentabilidad, la retención (LTV)** y la **fidelización** del cliente a través de recomendaciones **predictivas y consultivas**.
    
    Su análisis debe ser exhaustivo, estratégico y 100% accionarable. Su tono es profesional, proactivo y se enfoca en enseñar valor al vendedor.
    Su respuesta debe ser **ESTRICTAMENTE en español**.

    **DATOS DEL CLIENTE A ANALIZAR:**
    - Perfil del Cliente: {{{client}}}
    - Historial de Facturas (detalles, fechas y montos): {{{invoices}}}
    - Todos los Productos Disponibles (con sus categorías): {{{allProducts}}}
    - Historial de Compras de Clientes Similares (para modelar recurrencia y AOV): {{{similarClientInvoices}}}
    
    ---
    
    ### FASE 1: ANÁLISIS PREDICTIVO Y DE DOLOR
    Analice la data, enfocándose en tres métricas predictivas clave:
    1.  **INFERENCIA DE DOLOR/META (La Motivación):** ¿Qué problema principal o meta de vida intenta resolver el cliente con sus compras (Ej: Rendimiento Deportivo, Piel Joven, Ahorro en el Hogar)?
    2.  **RIESGO DE ABANDONO (Churn):** Evalúe el retraso en la reposición de productos rutinarios vs. la frecuencia esperada (más de 15 días de retraso = riesgo alto).
    3.  **OPORTUNIDAD DE 'DESAFÍO' (Venta Consultiva):** ¿Qué producto complementario falta que, si no se usa, hace que la compra actual sea ineficiente?
    
    ---

    ### FASE 2: META ESTRATÉGICA (La Siguiente Mejor Acción - NBA)
    Su objetivo principal es recomendar la acción de **MÁXIMO VALOR**. Las prioridades son fijas:

    * **Prioridad 1 (Venta Consultiva y AOV):** Usar la **Oportunidad de Desafío** (Punto 3). Sugiera el kit de solución completa (2-3 productos) enmarcado como una **corrección crítica** para maximizar el resultado del cliente (ej. "La inversión en su suero se desperdicia sin el tónico adecuado").
    * **Prioridad 2 (Retención y Reciprocidad):** Si el **Riesgo de Abandono (Churn)** es alto (Punto 2). La acción es preventiva: Sugiera enviar una pieza de **valor gratuito (un tip, una guía, un enlace)** relacionada con su última compra, antes de pedir la reposición.
    * **Prioridad 3 (Maximizar LTV):** Si el cliente es fiel y tiene buen récord. Sugiera un **Upsell** a la línea premium (mayor margen) o una estrategia para obtener datos de fidelización (cumpleaños, aniversario).
    
    - **Uso de Nombres:** Use SOLO el 'name' de la lista 'All Available Products'.
    
    ---

    ### FASE 3: GENERACIÓN DE RECOMENDACIONES
    Genere de **4 a 5 recomendaciones** que sean **nuevas, concisas y prácticas** en el array 'insights'. Las sugerencias deben ser directas y transmitir el valor estratégico.

    **CRÍTICO**: Cada string en el 'insights' array DEBE comenzar con un **solo emoji relevante**, seguido de un **solo espacio**.

    **EJEMPLOS DE TONO Y FORMATO DEFINITIVO:**
    - 💡 **Venta por Desafío:** Vemos solo el Limpiador Artistry. Recuérdele: "El Limpiador deja el poro abierto y sin defensas. Venda el **Tónico** para asegurar su rutina."
    - 🎁 **Reciprocidad:** ⏳ Cliente inactivo y en riesgo. Envíele "5 tips para el cuidado de la piel en invierno" y luego pregunte por la reposición de su **Crema Hidratante**.
    - 🏋️ **Kit de Solución:** Infiera meta de dieta/ejercicio. Sugiera el **Batido BodyKey** + el **Nutrilite Daily** para mantener la nutrición durante la fase de pérdida de peso.
    - 💸 **Salud Financiera:** 🗓️ Cliente con saldo pendiente recurrente. Proponle un plan de pago anticipado con un descuento pequeño para asegurar el flujo de caja.

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
    try {
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

      // Initialize Admin DB inside the try block to catch init errors
      const adminDb = getAdminDb();
      const cacheDocRef = adminDb.collection('cacheSugerencias').doc(clientId);

      // Try to get from cache first
      try {
        const cacheDocSnap = await cacheDocRef.get();
        const twentyFourHoursAgo = Timestamp.now().seconds - (24 * 60 * 60);

        if (cacheDocSnap.exists) {
          const cacheData = cacheDocSnap.data();
          const generatedAt = cacheData?.generadaEn;

          if (generatedAt && generatedAt.seconds > twentyFourHoursAgo) {
            const cachedInsights = cacheData?.sugerencia;
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
            await cacheDocRef.set({
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
        // Return empty if generation fails, don't throw 500
        return { insights: [] };
      }

      return { insights: [] };
    } catch (globalError) {
      console.error("CRITICAL ERROR in salesInsightsFlow:", globalError);
      // Fail gracefully returning empty insights to avoid 500 on client
      return { insights: [] };
    }
  }
);

export async function toggleInsightCompletion(clientId: string, suggestionId: string): Promise<boolean> {
  if (!clientId || !suggestionId) return false;

  const adminDb = getAdminDb();
  const cacheDocRef = adminDb.collection('cacheSugerencias').doc(clientId);

  try {
    const cacheDocSnap = await cacheDocRef.get();

    if (cacheDocSnap.exists) {
      const data = cacheDocSnap.data();
      const suggestions = data?.sugerencia || [];

      // Toggle completion
      const updatedSuggestions = suggestions.map((s: any) =>
        s.id === suggestionId ? { ...s, completed: !s.completed } : s
      );

      await cacheDocRef.update({ sugerencia: updatedSuggestions });
      return true;
    }
  } catch (e) {
    console.error("Failed to toggle insight completion", e);
  }
  return false;
}

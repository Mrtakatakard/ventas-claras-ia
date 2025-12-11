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
  currentDate: z.string().describe("The current date (ISO format) to calculate elapsed time."),
});
export type SalesInsightsInput = z.infer<typeof SalesInsightsInputSchema>;

// Output Schema defined closer to usage for clarity
const SalesInsightsOutputSchema = z.object({
  insights: z.array(z.object({
    id: z.string(),
    text: z.string(),
    completed: z.boolean()
  })).describe('An array of personalized sales tips.'),
  refillCandidates: z.array(z.object({
    productName: z.string(),
    reason: z.string(),
    urgency: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  })).optional().describe('List of products that likely need a refill.'),
});
export type SalesInsightsOutput = z.infer<typeof SalesInsightsOutputSchema>;

export async function getSalesInsights(input: Omit<SalesInsightsInput, 'currentDate'>): Promise<SalesInsightsOutput> {
  try {
    return await salesInsightsFlow({
      ...input,
      currentDate: new Date().toISOString().split('T')[0] // Inject server-side date YYYY-MM-DD
    });
  } catch (error) {
    console.error("Unhandled error in getSalesInsights Server Action:", error);
    // Return empty insights to prevent client crash
    return { insights: [], refillCandidates: [] };
  }
}

// The raw output from the AI Prompt (strings only for insights, objects for refills)
const SalesInsightsPromptOutput = z.object({
  insights: z.array(z.string()).describe('An array of 3 to 5 personalized and actionable sales tips.'),
  refillCandidates: z.array(z.object({
    productName: z.string(),
    reason: z.string().describe("Why this product needs a refill"),
    urgency: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  })).describe('List of products that likely need a refill based on purchase history (>30 days).'),
});

const salesInsightsPrompt = ai.definePrompt({
  name: 'salesInsightsPrompt',
  input: { schema: SalesInsightsInputSchema },
  output: { schema: SalesInsightsPromptOutput },
  prompt: `
    Usted es el **ASISTENTE DE INTELIGENCIA DE NEGOCIO PRO 4.0** para el CRM Ventas Claras. Su misión es actuar como el **COACH DE VENTAS** del usuario (el vendedor).
    
    **CONTEXTO TEMPORAL**:
    - Fecha Actual: {{{currentDate}}}
    - Use esta fecha para calcular EXACTAMENTE cuánto tiempo ha pasado desde la última compra.
    
    **REGLA DE ORO**: NUNCA hable como si fuera el cliente. Usted le habla AL VENDEDOR.
    - INCORRECTO: "Te recomiendo comprar Vitamina C para tus defensas." (Esto es hablarle al cliente)
    - CORRECTO: "Sugiere Vitamina C al cliente para reforzar sus defensas." (Esto es hablarle al vendedor)
    - CORRECTO: "Ofrécele el kit de limpieza, ya que hace 30 días compró el detergente."

    Su objetivo es generar la **Siguiente Mejor Acción (NBA)** para que el vendedor cierre más ventas.
    
    **DATOS DEL CLIENTE A ANALIZAR:**
    - Perfil del Cliente: {{{client}}}
    - Historial de Facturas (detalles, fechas y montos): {{{invoices}}}
    - Todos los Productos Disponibles (con sus categorías): {{{allProducts}}}
    - Historial de Compras de Clientes Similares (para modelar recurrencia, AOV y perfil): {{{similarClientInvoices}}}
    
    ---
    
    ### FASE 1: ANÁLISIS DE RECOMPRA Y STOCK (Smart Refill)
    Identifique productos consumibles (Vitaminas, Hogar, Cuidado Personal) comprados hace más de 30-45 días que NO han sido recompra dos.
    - Genere una lista estructurada en 'refillCandidates'.
    - Urgencia HIGH: > 45 días sin compra.
    - Urgencia MEDIUM: 30-45 días.
    - Urgencia LOW: < 30 días (pero casi vencido).
    - Ignorar productos duraderos.

    ### FASE 2: META ESTRATÉGICA (La Siguiente Mejor Acción - NBA)
    Analice las metricas clave para generar una estrategia completa:
    1.  **INFERENCIA DE DOLOR/META:** ¿Qué problema intenta resolver?
    2.  **PATRÓN DE RECOMPRA:** ¿Cuáles son sus productos rutinarios?
    3.  **RIESGO DE ABANDONO (Churn):** ¿Hay compras atrasadas?
    4.  **VENTA CRUZADA:** ¿Qué compran clientes similares?

    Las prioridades para 'insights' son:
    * **Prioridad 1 (Venta de Crecimiento):** Venta Cruzada por Perfil (lo que otros compran) o Kits Complejos.
    * **Prioridad 2 (Estabilidad):** Recordatorios de stock (que NO estén ya en 'refillCandidates') o incentivos de volumen.
    * **Prioridad 3 (Fidelización):** Mensajes de relación (cumpleaños, servicio).
    
    - **Uso de Nombres:** Use SOLO el 'name' de la lista 'All Available Products'.
    - **Contexto Pyme:** Busque eventos de temporada o industria.
    
    ---

    ### FASE 3: GENERACIÓN DE RECOMENDACIONES
    Genere de **4 a 5 recomendaciones** que sean **nuevas, concisas y prácticas** en el array 'insights' (texto con emoji).
    Genere la lista de **Candidatos a Recompra** en 'refillCandidates' (objetos estructurados).

    **CRÍTICO**: Cada string en el 'insights' array DEBE comenzar con un **solo emoji relevante**, seguido de un **solo espacio**.
    **Ejemplos Insights:**
    - 👥 **Venta por Perfil:** Clientes similares compran **Vitamina C**. Sugerir para reforzar defensas.
    - 💡 **Venta por Desafío:** Compra Proteína, pero faltan **Aminos**. Completar el kit fitness.
    - 🎁 **Servicio:** Preguntar por satisfacción del último pedido.

    Genere la respuesta JSON ahora.
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

      /* 
       * TEMPORARY FIX: Disabling server-side caching to resolve 500 Error.
       * The Admin SDK likely lacks credentials in this environment.
       * Proceeding with direct AI generation (like smart-refill-flow).
       */

      // Generate new insights directly
      try {
        const { output } = await salesInsightsPrompt(input);

        if (output) {
          const structuredInsights = output.insights.map(text => ({
            id: generateId(),
            text,
            completed: false
          }));

          const refillCandidates = output.refillCandidates || [];

          return {
            insights: structuredInsights,
            refillCandidates: refillCandidates
          };
        }
      } catch (genError) {
        console.error("Error generating AI insights:", genError);
        return {
          insights: [{
            id: 'gen-error',
            text: `Gen Error: ${(genError as Error).message}`,
            completed: false
          }],
          refillCandidates: []
        };
      }

      // Default return if no output generated
      return { insights: [], refillCandidates: [] };

    } catch (globalError) {
      console.error("CRITICAL ERROR in salesInsightsFlow:", globalError);
      return {
        insights: [{
          id: 'error-' + Math.random(),
          text: `Error AI: ${(globalError as Error).message}`,
          completed: false
        }],
        refillCandidates: []
      };
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

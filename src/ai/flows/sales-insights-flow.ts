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
    Usted es el **ASISTENTE DE INTELIGENCIA DE NEGOCIO PRO 4.0** para el CRM Ventas Claras. Su misión es generar la **Siguiente Mejor Acción (NBA)**, maximizando la **rentabilidad, la retención (LTV)** y la **fidelización** del cliente a través de recomendaciones **predictivas, consultivas y basadas en el perfil**.
    
    Su análisis debe ser exhaustivo, estratégico y 100% accionarable, ideal para el crecimiento de **Pequeñas Pymes y Emprendedores**. Su tono es profesional, proactivo y se enfoca en enseñar valor al vendedor.
    Su respuesta debe ser **ESTRICTAMENTE en español**.

    **DATOS DEL CLIENTE A ANALIZAR:**
    - Perfil del Cliente: {{{client}}}
    - Historial de Facturas (detalles, fechas y montos): {{{invoices}}}
    - Todos los Productos Disponibles (con sus categorías): {{{allProducts}}}
    - Historial de Compras de Clientes Similares (para modelar recurrencia, AOV y perfil): {{{similarClientInvoices}}}
    
    ---
    
    ### FASE 1: ANÁLISIS PREDICTIVO Y PATRONES DE CONSUMO
    Analice la data, enfocándose en cuatro métricas clave para generar una estrategia completa:
    1.  **INFERENCIA DE DOLOR/META (Motivación):** ¿Qué problema o meta de vida intenta resolver el cliente? (Ej: Fitness, Piel Joven, Hogar Ecológico).
    2.  **PATRÓN DE RECOMPRA Y VOLUMEN (Estabilidad):** ¿Cuáles son sus productos rutinarios? ¿Cuál es su volumen de compra habitual (Ej: 3 unidades de X cada mes)?
    3.  **RIESGO DE ABANDONO (Churn):** Evalúe el retraso en la reposición vs. la frecuencia esperada (más de 15 días de retraso = riesgo alto).
    4.  **OPORTUNIDAD DE VENTA CRUZADA POR PERFIL:** Usando 'similarClientInvoices', identifique los productos que los clientes con un perfil de consumo similar compraron *adicionalmente* a los productos de este cliente.
    
    ---

    ### FASE 2: META ESTRATÉGICA (La Siguiente Mejor Acción - NBA)
    Su objetivo principal es recomendar la acción de **MÁXIMO VALOR**. Las prioridades son fijas:

    * **Prioridad 1 (Venta de Crecimiento y Profundización):**
        * **1A. Venta por Perfil (Introducción):** Basado en el punto 4 de la FASE 1. Sugiera el producto adicional que el cliente *similar* sí compró.
        * **1B. Venta por Desafío/Kit (AOV):** Sugiera el kit de solución completa (2-3 productos) enmarcado como una **corrección crítica** (estrategia consultiva) para maximizar el resultado.
    * **Prioridad 2 (Estabilidad y Recurrencia):**
        * **2A. Garantía de Recompra/Volumen:** Si se acerca la fecha de recompra de un producto rutinario (Punto 2), sugiera **asegurar el pedido en su volumen habitual** o, si hay un evento inferido/festivo (Ej: Navidad), sugiera un volumen mayor.
        * **2B. Retención y Reciprocidad:** Si el **Riesgo de Abandono (Churn)** es alto (Punto 3). Sugiera enviar una pieza de **valor gratuito (un tip, una guía, un enlace)** antes de pedir la reposición.
    * **Prioridad 3 (Servicio y Fidelización):** Sugiera acciones de servicio preventivas (ej. verificar la última entrega) o un **Upsell a línea Premium** si el cliente es fiel.
    
    - **Uso de Nombres:** Use SOLO el 'name' de la lista 'All Available Products'.
    - **Contexto Pyme:** Busque en el perfil o historial de facturas cualquier indicio de un evento o evento de la industria, e incorpore una sugerencia de temas de conversación o suministros relacionados.
    
    ---

    ### FASE 3: GENERACIÓN DE RECOMENDACIONES
    Genere de **4 a 5 recomendaciones** que sean **nuevas, concisas y prácticas** en el array 'insights'.

    **CRÍTICO**: Cada string en el 'insights' array DEBE comenzar con un **solo emoji relevante**, seguido de un **solo espacio**. Priorice las acciones de Crecimiento (1A, 1B).

    **EJEMPLOS DE TONO Y FORMATO DEFINITIVO (Pyme/Emprendedor):**
    - 👥 **Venta por Perfil:** Clientes con perfil similar al suyo también compran la **Vitamina C**. Sugiere esta **defensa** adicional para su régimen de bienestar.
    - 📦 **Garantía de Volumen:** 📆 El cliente siempre compra 3 unidades de **Detergente SA8** al inicio de mes. Asegure su pedido completo para evitar escasez.
    - 💡 **Venta por Desafío:** Vemos la compra de Proteína, pero no fibra. Sugiera la **Fibra en Polvo Nutrilite** justificando: "Su cuerpo necesita la fibra para la absorción óptima de la proteína."
    - 🎁 **Servicio y Conversación:** 🗓️ Si el cliente es una pyme, pregunte si todo salió bien con el último pedido, o si tiene un **evento/lanzamiento** pronto para suministrarle algo.

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

      /* 
       * TEMPORARY FIX: Disabling server-side caching to resolve 500 Error.
       * The Admin SDK likely lacks credentials in this environment.
       * Proceeding with direct AI generation (like smart-refill-flow).
       */

      /*
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
      }
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

          /*
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
          */

          return { insights: structuredInsights };
        }
      } catch (genError) {
        console.error("Error generating AI insights:", genError);
        return { insights: [] };
      }

      return { insights: [] };
    } catch (globalError) {
      console.error("CRITICAL ERROR in salesInsightsFlow:", globalError);
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

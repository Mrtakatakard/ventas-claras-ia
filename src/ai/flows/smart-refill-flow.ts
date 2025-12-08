'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Input Schema: Purchasing history and parameters
const SmartRefillInputSchema = z.object({
    clientName: z.string(),
    clientProfile: z.string().describe("JSON string of client profile (birthday, status, etc)"),
    purchaseHistory: z.string().describe("A JSON string list of purchased products (name, quantity, purchaseDate)."),
    currentDate: z.string().describe("The current date (ISO format) to calculate elapsed time."),
});

// Output Schema: List of products recommended for refill AND general insights
const SmartRefillOutputSchema = z.object({
    refillCandidates: z.array(z.object({
        productName: z.string(),
        reason: z.string().describe("Why this product needs a refill"),
        urgency: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    })),
    generalSuggestions: z.array(z.object({
        type: z.enum(['CROSS_SELL', 'RELATIONSHIP', 'CONSISTENCY']),
        title: z.string(),
        description: z.string(),
    })).describe("Strategy tips if no refills are needed, or generic advice."),
});

export type SmartRefillInput = z.infer<typeof SmartRefillInputSchema>;
export type SmartRefillOutput = z.infer<typeof SmartRefillOutputSchema>;

// Define the prompt
const smartRefillPrompt = ai.definePrompt({
    name: 'smartRefillPrompt',
    input: { schema: SmartRefillInputSchema },
    output: { schema: SmartRefillOutputSchema },
    prompt: `
    You are an expert Amway Sales Consultant and AI Assistant. Your goal is to help the user manage their client {{clientName}}.

    Current Date: {{currentDate}}
    
    Client Profile: {{clientProfile}}
    Purchase History: {{purchaseHistory}}
    
    Job 1: Refill Detection
    - Identify consumables bought >30 days ago (Vitamins, Home Care, Personal Care) that haven't been re-bought.
    - Assume generic usage: 30-45 days.
    - Ignore durable goods.
    
    Job 2: Strategic Advice (generalSuggestions)
    - If NO refills are found, or even if they are, look for opportunities:
    - CROSS_SELL: If they buy Vitamin C, suggest Zinc or Echinecea. If they buy Laundry Detergent, suggest Fabric Softener.
    - RELATIONSHIP: If birthday is missing, suggest asking for it. If they haven't bought in >90 days, suggest a "We miss you" message.
    - CONSISTENCY: If they buy sporadically, suggest a subscription or loyalty benefit.
    
    Output JSON with 'refillCandidates' and 'generalSuggestions'.
    ALWAYS provide at least 1-2 'generalSuggestions' even if 'refillCandidates' is empty.
  `,
});

// Define the flow
export const smartRefillFlow = ai.defineFlow(
    {
        name: 'smartRefillFlow',
        inputSchema: SmartRefillInputSchema,
        outputSchema: SmartRefillOutputSchema,
    },
    async (input) => {
        const { output } = await smartRefillPrompt(input);
        return output!;
    }
);

export async function getSmartRefill(input: SmartRefillInput): Promise<SmartRefillOutput> {
    return smartRefillFlow(input);
}

'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Input Schema: Purchasing history and parameters
const SmartRefillInputSchema = z.object({
    clientName: z.string(),
    purchaseHistory: z.string().describe("A JSON string list of purchased products (name, quantity, purchaseDate)."),
    currentDate: z.string().describe("The current date (ISO format) to calculate elapsed time."),
});

// Output Schema: List of products recommended for refill
const SmartRefillOutputSchema = z.object({
    refillCandidates: z.array(z.object({
        productName: z.string(),
        reason: z.string().describe("Why this product needs a refill (e.g. 'Bought 40 days ago, usually lasts 30')"),
        urgency: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    })),
});

export type SmartRefillInput = z.infer<typeof SmartRefillInputSchema>;
export type SmartRefillOutput = z.infer<typeof SmartRefillOutputSchema>;

// Define the prompt
const smartRefillPrompt = ai.definePrompt({
    name: 'smartRefillPrompt',
    input: { schema: SmartRefillInputSchema },
    output: { schema: SmartRefillOutputSchema },
    prompt: `
    You are an intelligent inventory assistant for an Amway business. Your job is to identify "Refill Opportunities" for the client {{clientName}}.
    
    Current Date: {{currentDate}}
    
    Purchase History:
    {{purchaseHistory}}
    
    Task:
    1. Analyze the purchase dates relative to the current date.
    2. Identify consumables (Vitamins, Detergents, Shampoos, Toothpaste) that were bought more than 30 days ago and haven't been re-purchased recently.
    3. Assume most supplements and home care products last between 30 and 45 days.
    4. Ignore durable goods or items bought very recently (less than 15 days ago).
    
    Output:
    Return a list of 'refillCandidates'. 
    - 'reason': Explain clearly why (e.g., "Comprado hace 45 días").
    - 'urgency': HIGH if >45 days, MEDIUM if 30-45 days, LOW otherwise.
    
    If no products need refill, return an empty list.
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

'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Input Schema
const WhatsAppGeneratorInputSchema = z.object({
    clientName: z.string(),
    productsToRefill: z.array(z.string()).describe("List of product names to suggest."),
    tone: z.enum(['Casual', 'Formal', 'Enthusiastic']).default('Casual'),
});

// Output Schema
const WhatsAppGeneratorOutputSchema = z.object({
    message: z.string(),
});

export type WhatsAppGeneratorInput = z.infer<typeof WhatsAppGeneratorInputSchema>;
export type WhatsAppGeneratorOutput = z.infer<typeof WhatsAppGeneratorOutputSchema>;

// Define the prompt
const whatsAppGeneratorPrompt = ai.definePrompt({
    name: 'whatsAppGeneratorPrompt',
    input: { schema: WhatsAppGeneratorInputSchema },
    output: { schema: WhatsAppGeneratorOutputSchema },
    prompt: `
    Act as a friendly and professional Amway Business Owner.
    Write a short WhatsApp message to a client named {{clientName}}.
    
    Goal: Gently suggest they might need a refill for the following products:
    {{#each productsToRefill}}
    - {{this}}
    {{/each}}
    
    Tone: {{tone}}
    
    Requirements:
    - Language: Spanish (Dominican Republic style ideally, but neutral is fine).
    - Length: Short and concise (whatsapp style). Max 2-3 sentences.
    - Do NOT sound pushy. Frame it as "Customer Service" or "Checking in".
    - Include 1-2 relevant emojis.
    - End with a simple question to encourage a reply (e.g., "¿Te aparto uno?").
  `,
});

// Define the flow
export const whatsAppGeneratorFlow = ai.defineFlow(
    {
        name: 'whatsAppGeneratorFlow',
        inputSchema: WhatsAppGeneratorInputSchema,
        outputSchema: WhatsAppGeneratorOutputSchema,
    },
    async (input) => {
        const { output } = await whatsAppGeneratorPrompt(input);
        return output!;
    }
);

export async function getWhatsAppMessage(input: WhatsAppGeneratorInput): Promise<WhatsAppGeneratorOutput> {
    return whatsAppGeneratorFlow(input);
}

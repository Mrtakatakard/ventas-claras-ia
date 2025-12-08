'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Input Schema
const WhatsAppGeneratorInputSchema = z.object({
    clientName: z.string(),
    intent: z.enum(['REFILL', 'CROSS_SELL', 'BIRTHDAY', 'GENERAL', 'FOLLOW_UP', 'SEND_INVOICE', 'SEND_QUOTE']).describe("The purpose of the message."),
    context: z.string().describe("Details: product names, specific suggestion text, context, or invoice/quote number."),
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
    
    Goal: {{intent}}
    Context: {{context}}
    
    Tone: {{tone}}
    
    Requirements:
    - Language: STRICTLY Spanish (Dominican Republic friendly/neutral). No English.
    - Length: Short and concise (whatsapp style). Max 2-3 sentences.
    - Do NOT sound pushy. Frame it as helpful service.
    - Include 1-2 relevant emojis.
    
    Specific Guidance by Intent:
    - REFILL: "Noté que hace tiempo compraste {{context}}. ¿Te queda todavía o te aparto uno?"
    - CROSS_SELL: "Como usas productos de belleza/hogar, pensé que te gustaría probar {{context}}."
    - BIRTHDAY: "¡Feliz Cumpleaños! 🎉 Espero que la pases súper bien."
    - FOLLOW_UP: "Hola! Solo pasando para ver cómo te va con {{context}}."
    - SEND_INVOICE: "Aquí te comparto tu factura #{{context}}. Avísame cualquier duda."
    - SEND_QUOTE: "Adjunto la cotización #{{context}} que preparamos. Quedo atento a tus comentarios."
    
    End with a simple engaging question if appropriate.
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

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI()],
  model: process.env.GEMINI_MODEL || 'googleai/gemini-2.0-flash',
});

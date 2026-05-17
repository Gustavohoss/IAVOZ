'use server';
/**
 * @fileOverview A Genkit flow that generates a minimalist, one-sentence reflection on stillness.
 *
 * - generateMidnightWhispersReflection - A function that triggers the AI to generate a reflection.
 * - MidnightWhispersReflectionInput - The input type for the reflection generation function.
 * - MidnightWhispersReflectionOutput - The return type for the reflection generation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MidnightWhispersReflectionInputSchema = z
  .object({})
  .describe('No specific input is required for generating a stillness reflection.');
export type MidnightWhispersReflectionInput = z.infer<
  typeof MidnightWhispersReflectionInputSchema
>;

const MidnightWhispersReflectionOutputSchema = z.object({
  reflection: z
    .string()
    .describe('A unique, minimalist, one-sentence reflection on stillness.'),
});
export type MidnightWhispersReflectionOutput = z.infer<
  typeof MidnightWhispersReflectionOutputSchema
>;

export async function generateMidnightWhispersReflection(
  input: MidnightWhispersReflectionInput
): Promise<MidnightWhispersReflectionOutput> {
  return midnightWhispersReflectionFlow(input);
}

const midnightWhispersReflectionPrompt = ai.definePrompt({
  name: 'midnightWhispersReflectionPrompt',
  input: {schema: MidnightWhispersReflectionInputSchema},
  output: {schema: MidnightWhispersReflectionOutputSchema},
  prompt: `Generate a unique, minimalist, one-sentence reflection on the concept of stillness. The reflection should be thought-provoking and contemplative. Focus on brevity and depth.`, 
});

const midnightWhispersReflectionFlow = ai.defineFlow(
  {
    name: 'midnightWhispersReflectionFlow',
    inputSchema: MidnightWhispersReflectionInputSchema,
    outputSchema: MidnightWhispersReflectionOutputSchema,
  },
  async input => {
    const {output} = await midnightWhispersReflectionPrompt(input);
    return output!;
  }
);

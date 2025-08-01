'use server';

/**
 * @fileOverview Generates gift ideas using AI based on a user's prompt.
 *
 * - generateGiftIdeas - A function that suggests gifts based on a prompt.
 * - GenerateGiftIdeasInput - The input type for the generateGiftIdeas function.
 * - GenerateGiftIdeasOutput - The return type for the generateGiftIdeas function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateGiftIdeasInputSchema = z.object({
  prompt: z.string().describe('A description of the recipient and gift ideas.'),
});
export type GenerateGiftIdeasInput = z.infer<typeof GenerateGiftIdeasInputSchema>;

const GiftSuggestionSchema = z.object({
  name: z.string().describe('The name of the suggested gift.'),
  image: z.string().url().describe('A placeholder image URL for the gift (e.g., from placehold.co).'),
  platform: z.string().describe('The online platform where the gift can be found (e.g., Amazon, Etsy).'),
});

const GenerateGiftIdeasOutputSchema = z.object({
  gifts: z.array(GiftSuggestionSchema).min(1).max(3).describe('An array of 1 to 3 gift suggestions.'),
});
export type GenerateGiftIdeasOutput = z.infer<typeof GenerateGiftIdeasOutputSchema>;

export async function generateGiftIdeas(input: GenerateGiftIdeasInput): Promise<GenerateGiftIdeasOutput> {
  return generateGiftIdeasFlow(input);
}

const giftIdeasPrompt = ai.definePrompt({
  name: 'giftIdeasPrompt',
  input: {schema: GenerateGiftIdeasInputSchema},
  output: {schema: GenerateGiftIdeasOutputSchema},
  prompt: `You are an expert gift-giving assistant. Based on the user's prompt, generate 1 to 3 creative and relevant gift suggestions.

For each gift, provide:
1.  A descriptive name.
2.  A valid placeholder image URL from https://placehold.co/600x400.png.
3.  The name of a popular online platform where such a gift could be purchased.

User's Prompt: {{{prompt}}}
`,
});

const generateGiftIdeasFlow = ai.defineFlow(
  {
    name: 'generateGiftIdeasFlow',
    inputSchema: GenerateGiftIdeasInputSchema,
    outputSchema: GenerateGiftIdeasOutputSchema,
  },
  async input => {
    const {output} = await giftIdeasPrompt(input);
    return output!;
  }
);

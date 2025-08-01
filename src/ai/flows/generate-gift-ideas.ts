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

const GiftSuggestionSchema = z.object({
  name: z.string().describe('The name of the suggested gift.'),
  image: z.string().describe('A representative image URL for the gift.'),
  platform: z.string().describe('The online platform where the gift can be found (e.g., Amazon, Etsy).'),
  url: z.string().describe('The direct URL to the product page.'),
});

const GenerateGiftIdeasInputSchema = z.object({
  prompt: z.string().describe('A description of the recipient and gift ideas.'),
  existingGiftNames: z.array(z.string()).optional().describe('A list of gift names that have already been suggested to avoid duplicates.'),
});
export type GenerateGiftIdeasInput = z.infer<typeof GenerateGiftIdeasInputSchema>;


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
  prompt: `You are an expert gift-giving assistant. Based on the user's prompt, generate 1 to 3 creative and relevant gift suggestions by finding real products online.

For each gift, you MUST provide:
1.  A descriptive name for the product.
2.  A direct URL to a representative, publicly accessible image for the product.
3.  The name of the online platform (e.g., Amazon, Etsy, Uncommon Goods).
4.  The direct URL to the product's purchase page.

{{#if existingGiftNames}}
Here are the gifts that have already been suggested. Do NOT suggest these again or anything too similar:
{{#each existingGiftNames}}
- {{this}}
{{/each}}
{{/if}}

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

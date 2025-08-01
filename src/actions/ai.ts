'use server';

import {
  generateThankYouReaction,
  type GenerateThankYouReactionInput,
  type GenerateThankYouReactionOutput,
} from '@/ai/flows/generate-thank-you-reaction';
import {
  generateGiftIdeas,
  type GenerateGiftIdeasInput,
  type GenerateGiftIdeasOutput,
} from '@/ai/flows/generate-gift-ideas';

export async function generateThankYouAction(
  input: GenerateThankYouReactionInput
): Promise<GenerateThankYouReactionOutput> {
  // In a real app, you might add authentication checks here
  return await generateThankYouReaction(input);
}

export async function generateGiftIdeasAction(
  input: GenerateGiftIdeasInput
): Promise<GenerateGiftIdeasOutput> {
  // In a real app, you might add authentication checks here
  return await generateGiftIdeas(input);
}

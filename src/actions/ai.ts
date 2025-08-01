'use server';

import {
  generateThankYouReaction,
  type GenerateThankYouReactionInput,
  type GenerateThankYouReactionOutput,
} from '@/ai/flows/generate-thank-you-reaction';

export async function generateThankYouAction(
  input: GenerateThankYouReactionInput
): Promise<GenerateThankYouReactionOutput> {
  // In a real app, you might add authentication checks here
  return await generateThankYouReaction(input);
}

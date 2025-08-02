"use server";

/**
 * @fileOverview Generates a thank you reaction using AI, providing options for audio, video, or selfie.
 *
 * - generateThankYouReaction - A function that generates a thank you message and media options.
 * - GenerateThankYouReactionInput - The input type for the generateThankYouReaction function.
 * - GenerateThankYouReactionOutput - The return type for the generateThankYouReaction function.
 */

import { ai } from "@/ai/genkit";
import { z } from "genkit";

const GenerateThankYouReactionInputSchema = z.object({
  giftDescription: z.string().describe("The description of the gift received."),
  recipientName: z.string().optional().describe("The name of the recipient."),
});
export type GenerateThankYouReactionInput = z.infer<
  typeof GenerateThankYouReactionInputSchema
>;

const GenerateThankYouReactionOutputSchema = z.object({
  message: z.string().describe("The generated thank you message."),
  mediaType: z
    .enum(["audio", "video", "selfie"])
    .describe("The suggested media type for the reaction."),
  mediaContent: z
    .string()
    .optional()
    .describe("The actual media content (data URI) if available."),
});
export type GenerateThankYouReactionOutput = z.infer<
  typeof GenerateThankYouReactionOutputSchema
>;

export async function generateThankYouReaction(
  input: GenerateThankYouReactionInput
): Promise<GenerateThankYouReactionOutput> {
  return generateThankYouReactionFlow(input);
}

const thankYouPrompt = ai.definePrompt({
  name: "thankYouPrompt",
  input: { schema: GenerateThankYouReactionInputSchema },
  output: { schema: GenerateThankYouReactionOutputSchema },
  prompt: `You are a helpful assistant that generates thank you messages for gifts.

  The recipient, {{{recipientName}}}, received the following gift: {{{giftDescription}}}.

  Generate a short thank you message expressing gratitude. Also, suggest whether the recipient should record a short audio clip, video clip, or take a selfie as a reaction to the gift.
  Make sure mediaType is one of ['audio', 'video', 'selfie']. If media type is audio, do NOT set mediaContent. If media type is video or selfie, leave mediaContent blank unless explicitly provided by user.
  Consider the gift when determining the correct media type to respond with.
  `,
});

const generateThankYouReactionFlow = ai.defineFlow(
  {
    name: "generateThankYouReactionFlow",
    inputSchema: GenerateThankYouReactionInputSchema,
    outputSchema: GenerateThankYouReactionOutputSchema,
  },
  async (input) => {
    const { output } = await thankYouPrompt(input);
    return output!;
  }
);

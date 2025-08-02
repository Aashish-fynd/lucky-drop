"use server";

/**
 * @fileOverview Generates gift ideas using AI based on a user's prompt.
 * Uses search API as a tool for the LLM to find real products first, then formats the results.
 */

import { ai } from "@/ai/genkit";
import { z } from "genkit";
import { searchGiftProductsTool } from "@/ai/tools/search-tool";

const GiftSuggestionSchema = z.object({
  name: z.string().describe("The name of the suggested gift."),
  image: z
    .string()
    .describe(
      "A direct, publicly accessible image URL that ends with .jpg, .jpeg, .png, or .webp. Must be a real product image from a reputable source."
    ),
  platform: z
    .string()
    .describe(
      "The online platform where the gift can be found (e.g., Amazon, Etsy)."
    ),
  url: z.string().describe("The direct URL to the product page."),
  price: z
    .string()
    .optional()
    .describe("Estimated price range if available from the search result."),
  description: z
    .string()
    .optional()
    .describe(
      "Brief description of why this gift is perfect for the recipient."
    ),
});

const GenerateGiftIdeasInputSchema = z.object({
  prompt: z.string().describe("A description of the recipient and gift ideas."),
  existingGiftNames: z
    .array(z.string())
    .optional()
    .describe(
      "A list of gift names that have already been suggested to avoid duplicates."
    ),
  searchResults: z
    .array(
      z.object({
        title: z.string(),
        link: z.string(),
        snippet: z.string(),
        imageUrl: z.string().nullable(),
      })
    )
    .optional()
    .describe("Search results from the search tool"),
  maxResults: z
    .number()
    .default(10)
    .describe("Maximum number of gift suggestions to return"),
});

export type GenerateGiftIdeasInput = z.infer<
  typeof GenerateGiftIdeasInputSchema
>;

const GenerateGiftIdeasOutputSchema = z.object({
  gifts: z
    .array(GiftSuggestionSchema)
    .min(1)
    .max(10)
    .describe("An array of 1 to 10 gift suggestions."),
  searchQuery: z
    .string()
    .describe("The search query that was used to find these products"),
  totalResults: z.number().describe("Total number of search results found"),
});

export type GenerateGiftIdeasOutput = z.infer<
  typeof GenerateGiftIdeasOutputSchema
>;

export async function generateGiftIdeas(
  input: GenerateGiftIdeasInput
): Promise<GenerateGiftIdeasOutput> {
  return generateGiftIdeasFlow(input);
}

const giftIdeasPrompt = ai.definePrompt({
  name: "giftIdeasPrompt",
  input: { schema: GenerateGiftIdeasInputSchema },
  output: { schema: GenerateGiftIdeasOutputSchema },
  prompt: `You are an expert gift curator and personal shopper. Your mission is to analyze real product search results and create personalized gift recommendations that perfectly match the user's requirements.

## CRITICAL INSTRUCTIONS:
You MUST use ONLY the real product data provided in the search results below. Do NOT invent or make up any product names, URLs, images, or details.

## SEARCH RESULTS ANALYSIS:
{{#if searchResults}}
I have found {{searchResults.length}} real products for you. Here are the available products:

{{#each searchResults}}
**Product {{@index_1}}:**
- **Title:** {{title}}
- **URL:** {{link}}
- **Image:** {{imageUrl}}
- **Description:** {{snippet}}
{{/each}}
{{/if}}

## YOUR TASK:
1. **Carefully analyze each search result** - read the title, description, and examine the URL to understand what the product actually is
2. **Match products to user needs** - select the most relevant products based on the user's prompt
3. **Extract accurate information** from the search results:
   - Product name from the title
   - Product URL from the link
   - Product image from imageUrl
   - Platform name from the URL domain (e.g., amazon.com → Amazon, etsy.com → Etsy)
4. **Create compelling gift descriptions** explaining why each product is perfect for the recipient

## USER'S REQUEST:
{{{prompt}}}

## OUTPUT REQUIREMENTS:
For each selected gift, provide:
- **name:** Exact product name from search result title
- **image:** Direct image URL from search result (must be real product image)
- **platform:** Platform name extracted from product URL
- **url:** Exact product URL from search result
- **price:** Price if mentioned in snippet, otherwise omit
- **description:** Why this gift is perfect for the recipient based on their preferences

## QUALITY STANDARDS:
- Only suggest products that genuinely match the user's requirements
- Ensure all URLs and images are real and accessible
- Provide diverse options across different price points and categories
- Make each suggestion feel personalized and thoughtful

{{#if existingGiftNames}}
**AVOID DUPLICATES:** Do not suggest these already-recommended items:
{{#each existingGiftNames}}
- {{this}}
{{/each}}
{{/if}}

**Remember:** Every product name, URL, and image must come directly from the search results provided above. No exceptions.`,
});

const generateGiftIdeasFlow = ai.defineFlow(
  {
    name: "generateGiftIdeasFlow",
    inputSchema: GenerateGiftIdeasInputSchema,
    outputSchema: GenerateGiftIdeasOutputSchema,
  },
  async (input) => {
    // First, use the search tool to find real products
    console.log("Searching for gift products with query:", input.prompt);

    // Try to get more results with pagination if needed
    let allSearchResults: any[] = [];
    let currentPage = 1;
    const maxPages = 2; // Get up to 2 pages of results

    while (
      currentPage <= maxPages &&
      allSearchResults.length < (input.maxResults || 10)
    ) {
      const searchResult = await searchGiftProductsTool({
        query: input.prompt,
        numResults: 10,
        page: currentPage,
      });

      if (
        !searchResult.success ||
        !searchResult.results ||
        searchResult.results.length === 0
      ) {
        break;
      }

      allSearchResults = [...allSearchResults, ...searchResult.results];
      currentPage++;

      // If we got fewer results than requested, there are no more pages
      if (searchResult.results.length < 10) {
        break;
      }
    }

    if (allSearchResults.length === 0) {
      throw new Error("Failed to find gift products or no results returned");
    }

    // Limit results to the requested maximum
    const limitedResults = allSearchResults.slice(0, input.maxResults || 10);

    // Now use the LLM to format the search results into gift suggestions
    const { output } = await giftIdeasPrompt({
      ...input,
      searchResults: limitedResults,
    });

    return {
      gifts: output!.gifts,
      searchQuery: input.prompt,
      totalResults: limitedResults.length,
    };
  }
);

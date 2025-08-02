import { ai } from "@/ai/genkit";
import { searchGoogle } from "@/lib/google-search";
import { z } from "genkit";

export const searchGiftProductsTool = ai.defineTool(
  {
    name: "searchGiftProducts",
    description:
      "Search for gift products and their images using Google Search API. Use this to find real products before suggesting gifts. Supports pagination to get more results.",
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          "The search query for finding gift products (e.g., 'personalized coffee mug', 'wireless headphones', 'gift for coffee lover')"
        ),
      numResults: z
        .number()
        .default(10)
        .describe("Number of search results to return (default: 10, max: 20)"),
      page: z
        .number()
        .default(1)
        .describe("Page number for pagination (default: 1)"),
    }),
  },
  async ({ query, numResults = 10, page = 1 }) => {
    try {
      const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
      const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

      if (!apiKey || !searchEngineId) {
        throw new Error("Google Search API credentials not configured");
      }

      // Add "gift" to the query if not already present to get more relevant results
      const enhancedQuery = query.toLowerCase().includes("gift")
        ? query
        : `${query} gift`;

      // Add product-specific terms to get actual products instead of gift guides
      const productQuery = `${enhancedQuery} product buy purchase`;

      // Calculate start index for pagination (Google API uses 1-based indexing)
      const startIndex = (page - 1) * numResults + 1;

      const results = await searchGoogle(
        productQuery,
        apiKey,
        searchEngineId,
        numResults,
        startIndex
      );

      return {
        success: true,
        query: enhancedQuery,
        results,
        pagination: {
          currentPage: page,
          resultsPerPage: numResults,
          startIndex,
          hasMore: results.length === numResults,
        },
      };
    } catch (error) {
      console.error("Search tool error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
);

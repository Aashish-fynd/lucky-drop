export interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  imageUrl?: string;
}

export async function searchGoogle(
  query: string,
  apiKey: string,
  searchEngineId: string,
  numResults: number = 10,
  startIndex: number = 1
): Promise<GoogleSearchResult[]> {
  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(
      query
    )}&num=${numResults}&start=${startIndex}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Google Search API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`Google Search API error: ${data.error.message}`);
    }

    const items = data.items || [];

    return items.map(
      (item: {
        title?: string;
        link?: string;
        snippet?: string;
        pagemap?: {
          cse_image?: Array<{
            src?: string;
            alt?: string;
          }>;
        };
      }) => ({
        title: item.title || "",
        link: item.link || "",
        snippet: item.snippet || "",
        imageUrl: item.pagemap?.cse_image?.[0]?.src || null,
      })
    );
  } catch (error) {
    console.error("Google Search API error:", error);
    return [];
  }
}

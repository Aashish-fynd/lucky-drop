// Simple test script to verify the new search-based gift ideas generation
import { generateGiftIdeas } from "./src/ai/flows/generate-gift-ideas.ts";

async function testGiftIdeas() {
  try {
    console.log("Testing gift ideas generation with search API...");

    const result = await generateGiftIdeas({
      prompt: "gift for a coffee lover who works from home",
    });

    console.log("Generated gifts:", JSON.stringify(result, null, 2));

    // Verify that we have real products
    result.gifts.forEach((gift, index) => {
      console.log(`\nGift ${index + 1}:`);
      console.log(`- Name: ${gift.name}`);
      console.log(`- Platform: ${gift.platform}`);
      console.log(`- URL: ${gift.url}`);
      console.log(`- Image: ${gift.image}`);
    });
  } catch (error) {
    console.error("Error testing gift ideas:", error);
  }
}

testGiftIdeas();

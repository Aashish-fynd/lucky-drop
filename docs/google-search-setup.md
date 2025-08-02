# Google Custom Search API Setup

This application uses Google Custom Search API to find real product images for gift suggestions.

## Setup Instructions

### 1. Get Google Search API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Custom Search API**
4. Go to **Credentials** and create an **API Key**
5. Copy the API key

### 2. Create Custom Search Engine

1. Go to [Google Programmable Search Engine](https://programmablesearchengine.google.com/)
2. Click **Create a search engine**
3. Enter any website URL (e.g., `https://www.google.com`)
4. Give it a name (e.g., "Gift Images Search")
5. Click **Create**
6. Go to **Setup** and copy the **Search engine ID**

### 3. Configure Environment Variables

Add these to your `.env` file:

```bash
GOOGLE_SEARCH_API_KEY=your_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here
```

### 4. Test the Integration

The system will automatically:
- Generate gift ideas with the AI
- Check if image URLs are valid
- Search Google for real product images if needed
- Provide fallback placeholder images

## How It Works

1. **AI generates gift suggestions** with image URLs
2. **System validates** each image URL
3. **If invalid**, automatically searches Google for real product images
4. **Returns valid, accessible images** for all gifts

## API Limits

- Google Custom Search API allows 100 free queries per day
- Additional queries cost $5 per 1000 queries
- Monitor usage in Google Cloud Console

## Troubleshooting

- **"API key not set"**: Check your environment variables
- **"Search engine ID not set"**: Verify your search engine configuration
- **No results**: Ensure your search engine is configured for image search 
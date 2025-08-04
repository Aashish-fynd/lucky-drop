# Cloudinary Integration Setup

This project now uses Cloudinary as the primary storage provider for file uploads instead of Firebase Storage. This provides better image optimization, URL transformations, and CDN delivery.

## Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=ml_default
```

## Cloudinary Setup

1. **Create a Cloudinary Account**: Sign up at [cloudinary.com](https://cloudinary.com)

2. **Get Your Credentials**: 
   - Go to your Cloudinary Dashboard
   - Copy your Cloud Name, API Key, and API Secret

3. **Create an Upload Preset**:
   - Go to Settings > Upload
   - Scroll down to "Upload presets"
   - Click "Add upload preset"
   - Set signing mode to "Unsigned" for client-side uploads
   - Save the preset name (default: `ml_default`)

## Features

### Automatic Image Optimization
- Images are automatically optimized using Cloudinary's URL transformations
- Responsive images with different sizes for different screen sizes
- Automatic format conversion (WebP, AVIF) for better performance

### URL Transformations
The system automatically applies URL transformations for:
- **Thumbnails**: 48x48px with 70% quality
- **Preview Images**: 400x300px with 80% quality
- **Responsive Images**: Different sizes for different breakpoints

### File Management
- Files are organized in folders by user ID: `uploads/{userId}/`
- Automatic cleanup when files are deleted
- Support for images, audio, and video files

## Usage

The integration is transparent to the user. All existing functionality works the same way:

1. **Upload Files**: Drag and drop or click to upload
2. **Preview Files**: Click on thumbnails to view full-size previews
3. **Delete Files**: Click the trash icon to remove files
4. **Retry Uploads**: Failed uploads can be retried

## Migration from Firebase Storage

If you have existing files in Firebase Storage:
1. The system will continue to work with existing Firebase URLs
2. New uploads will use Cloudinary
3. You can gradually migrate existing files if needed

## Performance Benefits

- **Faster Loading**: CDN delivery and optimized images
- **Reduced Bandwidth**: Automatic compression and format optimization
- **Better UX**: Progressive loading and responsive images
- **Scalability**: Cloudinary's global CDN infrastructure
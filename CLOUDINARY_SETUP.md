# Cloudinary Integration Setup

This project now uses Cloudinary as the primary storage provider for file uploads instead of Firebase Storage. This provides better image optimization, URL transformations, and CDN delivery.

## Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Cloudinary Configuration (Server-side uploads)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Cloudinary Setup

1. **Create a Cloudinary Account**: Sign up at [cloudinary.com](https://cloudinary.com)

2. **Get Your Credentials**: 
   - Go to your Cloudinary Dashboard
   - Copy your Cloud Name, API Key, and API Secret

3. **No Upload Preset Needed**: 
   - Server-side uploads use your API credentials directly
   - No need to create upload presets
   - More secure and reliable than client-side uploads

4. **Test Your Setup**:
   - Visit `/test-cloudinary` in your app to test the upload functionality
   - This will verify your environment variables are working correctly

## Features

### Server-Side Uploads
- Secure server-side uploads using Cloudinary SDK
- No client-side API keys or upload presets needed
- Better security and reliability
- Simple and straightforward implementation

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

## Troubleshooting

### Upload Fails
1. **Check Environment Variables**: Ensure `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` are set
2. **Verify API Credentials**: Make sure your API key and secret are correct
3. **Test Configuration**: Use the `/test-cloudinary` page to verify your setup

### Common Errors
- **"Invalid API key"**: Check that your API key is correct
- **"Invalid signature"**: Check that your API secret is correct
- **"Cloud name not found"**: Verify your cloud name is correct

### Security Notes
- All API credentials are kept server-side only
- No client-side exposure of sensitive credentials
- Server actions provide secure upload endpoints
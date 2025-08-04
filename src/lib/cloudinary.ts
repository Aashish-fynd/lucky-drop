// Client-side Cloudinary utilities for URL transformations only

// Utility function to transform Cloudinary URLs for responsive images
export const getOptimizedImageUrl = (originalUrl: string, options: {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'auto' | 'webp' | 'jpg' | 'png';
  crop?: 'fill' | 'fit' | 'scale' | 'thumb';
} = {}) => {
  if (!originalUrl.includes('cloudinary.com')) {
    return originalUrl;
  }

  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    crop = 'fill'
  } = options;

  // Parse the Cloudinary URL to extract the transformation part
  const urlParts = originalUrl.split('/');
  const uploadIndex = urlParts.findIndex(part => part === 'upload');
  
  if (uploadIndex === -1) {
    return originalUrl;
  }

  // Build transformation string
  const transformations = [];
  
  if (width || height) {
    const size = [];
    if (width) size.push(`w_${width}`);
    if (height) size.push(`h_${height}`);
    if (size.length > 0) {
      size.push(`c_${crop}`);
      transformations.push(size.join(','));
    }
  }
  
  if (quality !== 'auto') {
    transformations.push(`q_${quality}`);
  }
  
  if (format !== 'auto') {
    transformations.push(`f_${format}`);
  }

  // Insert transformations into URL
  if (transformations.length > 0) {
    urlParts.splice(uploadIndex + 1, 0, transformations.join('/'));
  }

  return urlParts.join('/');
};

// Utility function to get responsive image URLs for different breakpoints
export const getResponsiveImageUrls = (originalUrl: string) => {
  return {
    sm: getOptimizedImageUrl(originalUrl, { width: 640 }),
    md: getOptimizedImageUrl(originalUrl, { width: 768 }),
    lg: getOptimizedImageUrl(originalUrl, { width: 1024 }),
    xl: getOptimizedImageUrl(originalUrl, { width: 1280 }),
    original: originalUrl,
  };
};
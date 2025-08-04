import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

// Utility function to upload file to Cloudinary
export const uploadToCloudinary = async (file: File, userId: string): Promise<{ url: string; publicId: string }> => {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default');
    formData.append('folder', `uploads/${userId}`);

    fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`, {
      method: 'POST',
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          reject(new Error(data.error.message));
        } else {
          resolve({
            url: data.secure_url,
            publicId: data.public_id,
          });
        }
      })
      .catch((error) => {
        reject(error);
      });
  });
};

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

// Utility function to delete file from Cloudinary
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    const response = await fetch('/api/cloudinary/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publicId }),
    });

    if (!response.ok) {
      throw new Error('Failed to delete file from Cloudinary');
    }
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
    throw error;
  }
};
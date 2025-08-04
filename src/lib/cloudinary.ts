// Cloudinary configuration and utilities using REST API only

// Validate required environment variables
const validateCloudinaryConfig = () => {
  if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
    throw new Error('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is required');
  }
  if (!process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET is required');
  }
};

// Utility function to upload file to Cloudinary with real progress tracking
export const uploadToCloudinary = (
  file: File, 
  userId: string,
  onProgress?: (progress: number) => void
): Promise<{ url: string; publicId: string }> => {
  return new Promise((resolve, reject) => {
    try {
      validateCloudinaryConfig();
    } catch (error) {
      reject(error);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);
    formData.append('folder', `uploads/${userId}`);

    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = (event.loaded / event.total) * 100;
        onProgress(progress);
      }
    });

    // Handle response
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.error) {
            reject(new Error(data.error.message));
          } else {
            resolve({
              url: data.secure_url,
              publicId: data.public_id,
            });
          }
        } catch (error) {
          reject(new Error('Failed to parse response'));
        }
      } else {
        reject(new Error(`Upload failed with status: ${xhr.status}`));
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      reject(new Error('Network error occurred'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload was aborted'));
    });

    // Start upload
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`);
    xhr.send(formData);
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

// Utility function to delete file from Cloudinary using REST API
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

// Test function to verify Cloudinary configuration
export const testCloudinaryConfig = async (): Promise<boolean> => {
  try {
    validateCloudinaryConfig();
    return true;
  } catch (error) {
    console.error('Cloudinary configuration error:', error);
    return false;
  }
};
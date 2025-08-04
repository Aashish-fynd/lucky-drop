// Client-side utility for uploading files with real progress tracking

export interface UploadProgress {
  progress: number;
  url?: string;
  publicId?: string;
  error?: string;
}

export const uploadFileWithProgress = (
  file: File,
  userId: string,
  onProgress: (data: UploadProgress) => void
): Promise<{ url: string; publicId: string }> => {
  return new Promise((resolve, reject) => {
    // Convert file to base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64File = reader.result as string;
      
      try {
        // Start the upload with streaming response
        const response = await fetch('/api/upload-progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ file: base64File, userId }),
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        // Read the streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('Failed to read response stream');
        }

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data: UploadProgress = JSON.parse(line.slice(6));
                onProgress(data);

                if (data.error) {
                  reject(new Error(data.error));
                  return;
                } else if (data.progress === 100 && data.url && data.publicId) {
                  resolve({ url: data.url, publicId: data.publicId });
                  return;
                }
              } catch (error) {
                // Ignore parsing errors for incomplete chunks
              }
            }
          }
        }
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
};
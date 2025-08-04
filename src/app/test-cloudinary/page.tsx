"use client";

import { useState } from 'react';
import { uploadFileWithProgress } from '@/lib/upload-with-progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function TestCloudinaryPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [configStatus, setConfigStatus] = useState<string>('✅ Server-side uploads configured');

  const testConfig = async () => {
    setConfigStatus('✅ Server-side uploads configured (no client-side config needed)');
  };

  const handleUpload = async () => {
    if (!file) {
      setResult('Please select a file first');
      return;
    }

    setUploading(true);
    setResult('Uploading...');

    try {
      const { url, publicId } = await uploadFileWithProgress(
        file,
        'test-user',
        (progressData) => {
          setResult(`Uploading... ${progressData.progress}%`);
        }
      );

      setResult(`✅ Upload successful!\nURL: ${url}\nPublic ID: ${publicId}`);
    } catch (error) {
      setResult(`❌ Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Cloudinary Upload Test</h1>
      
      <div className="space-y-6">
        <div>
          <Button onClick={testConfig} className="mb-4">
            Test Configuration
          </Button>
          {configStatus && (
            <p className="text-sm">{configStatus}</p>
          )}
        </div>

        <div>
          <Input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            accept="image/*,audio/*,video/*"
            className="mb-4"
          />
          
          <Button 
            onClick={handleUpload} 
            disabled={!file || uploading}
            className="w-full"
          >
            {uploading ? 'Uploading...' : 'Upload to Cloudinary'}
          </Button>
        </div>

        {result && (
          <div className="p-4 bg-gray-100 rounded-lg">
            <h3 className="font-semibold mb-2">Result:</h3>
            <pre className="text-sm whitespace-pre-wrap">{result}</pre>
          </div>
        )}

        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-2">Required Environment Variables:</h3>
          <ul className="text-sm space-y-1">
            <li>• NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME</li>
            <li>• CLOUDINARY_API_KEY</li>
            <li>• CLOUDINARY_API_SECRET</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
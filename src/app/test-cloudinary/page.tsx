"use client";

import { useState } from 'react';
import { uploadToCloudinary, testCloudinaryConfig } from '@/lib/cloudinary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function TestCloudinaryPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [configStatus, setConfigStatus] = useState<string>('');

  const testConfig = async () => {
    const isValid = await testCloudinaryConfig();
    setConfigStatus(isValid ? '✅ Configuration valid' : '❌ Configuration invalid');
  };

  const handleUpload = async () => {
    if (!file) {
      setResult('Please select a file first');
      return;
    }

    setUploading(true);
    setResult('Uploading...');

    try {
      const { url, publicId } = await uploadToCloudinary(
        file,
        'test-user',
        (progress) => {
          setResult(`Uploading... ${progress.toFixed(1)}%`);
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
            <li>• NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
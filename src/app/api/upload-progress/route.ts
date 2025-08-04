import { NextRequest } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  const { file, userId } = await request.json();

  if (!file || !userId) {
    return new Response('Missing file or userId', { status: 400 });
  }

  // Convert base64 to buffer
  const buffer = Buffer.from(file.split(',')[1], 'base64');

  // Create a readable stream for progress tracking
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send initial progress
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 0 })}\n\n`));

      // Upload to Cloudinary with progress tracking
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `uploads/${userId}`,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
          } else if (result) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              progress: 100, 
              url: result.secure_url, 
              publicId: result.public_id 
            })}\n\n`));
          }
          controller.close();
        }
      );

      // Simulate progress updates during upload
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 90) {
          clearInterval(progressInterval);
          progress = 90;
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: Math.round(progress) })}\n\n`));
      }, 200);

      // Pipe buffer to upload stream
      uploadStream.end(buffer);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
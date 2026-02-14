import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const R2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

interface OptimizeRobloxThumbnailOptions {
  gameId: string;
  scriptId: string;
}

export async function optimizeRobloxThumbnail({ gameId, scriptId }: OptimizeRobloxThumbnailOptions): Promise<string | null> {
  try {
    const requiredEnvVars = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_URL'];
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    if (missingEnvVars.length > 0) {
      console.error('Missing R2 environment variables for thumbnail optimization:', missingEnvVars);
      return null;
    }

    const robloxThumbnailUrl = `https://tr.rbxcdn.com/${gameId}/512/512/Image/Png/noFilter`;
    
    console.log(`Downloading Roblox thumbnail for game ${gameId}...`);
    
    const response = await fetch(robloxThumbnailUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      console.error(`Failed to download Roblox thumbnail: ${response.status} ${response.statusText}`);
      return null;
    }

    const imageBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(imageBuffer);

    const sizeInMB = buffer.length / 1024 / 1024;
    if (sizeInMB > 5) {
      console.error(`Roblox thumbnail too large: ${sizeInMB.toFixed(2)}MB`);
      return null;
    }

    if (buffer.length < 100) {
      console.error('Roblox thumbnail too small');
      return null;
    }

    const pngHeader = [0x89, 0x50, 0x4E, 0x47];
    if (!pngHeader.every((byte, index) => buffer[index] === byte)) {
      console.error('Invalid PNG format from Roblox');
      return null;
    }

    const fileName = `roblox-thumb-${gameId}-${scriptId}-${Date.now()}.png`;
    
    console.log(`Uploading optimized Roblox thumbnail to R2: ${fileName}`);

    await R2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: fileName,
      Body: buffer,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000',
    }));

    const optimizedUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;
    console.log(`Successfully optimized Roblox thumbnail: ${optimizedUrl}`);
    
    return optimizedUrl;

  } catch (error) {
    console.error('Error optimizing Roblox thumbnail:', error);
    return null;
  }
}

export async function optimizeCustomThumbnail(base64Data: string, scriptId: string): Promise<string | null> {
  try {
    const requiredEnvVars = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_URL'];
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    if (missingEnvVars.length > 0) {
      console.error('Missing R2 environment variables for custom thumbnail optimization:', missingEnvVars);
      return null;
    }

    const matches = base64Data.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
    if (!matches) {
      console.error('Invalid base64 image format');
      return null;
    }

    const ext = matches[1] || "png";
    const base64 = matches[2];
    
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
      console.error('Invalid base64 data');
      return null;
    }
    
    const buffer = Buffer.from(base64, "base64");
    
    const sizeInMB = buffer.length / 1024 / 1024;
    if (sizeInMB > 1.5) {
      console.error(`Custom thumbnail too large: ${sizeInMB.toFixed(2)}MB`);
      return null;
    }
    
    if (buffer.length < 100) {
      console.error('Custom thumbnail too small');
      return null;
    }
    
    const validHeaders = {
      'png': [0x89, 0x50, 0x4E, 0x47],
      'jpeg': [0xFF, 0xD8, 0xFF],
      'jpg': [0xFF, 0xD8, 0xFF],
      'webp': [0x52, 0x49, 0x46, 0x46]
    };
    
    const header = validHeaders[ext as keyof typeof validHeaders];
    if (header && !header.every((byte, index) => buffer[index] === byte)) {
      console.error('Invalid image file format');
      return null;
    }

    const fileName = `custom-thumb-${scriptId}-${Date.now()}.${ext}`;
    
    console.log(`Uploading optimized custom thumbnail to R2: ${fileName}`);

    await R2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: fileName,
      Body: buffer,
      ContentType: `image/${ext}`,
      CacheControl: 'public, max-age=31536000',
    }));

    const optimizedUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;
    console.log(`Successfully optimized custom thumbnail: ${optimizedUrl}`);
    
    return optimizedUrl;

  } catch (error) {
    console.error('Error optimizing custom thumbnail:', error);
    return null;
  }
}

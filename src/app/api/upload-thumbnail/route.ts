import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import jwt from "jsonwebtoken";
import { filterBase64Image } from "@/lib/content-filter";

const R2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest) {
  try {
    const requiredEnvVars = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_URL'];
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    if (missingEnvVars.length > 0) {
      console.error('Missing R2 environment variables:', missingEnvVars);
      return NextResponse.json({ error: "R2 configuration missing", missing: missingEnvVars }, { status: 500 });
    }
    
    const isInternalCall = req.headers.get('x-internal-call') === 'true';
    
    
    if (!isInternalCall) {
      const JWT_SECRET = process.env.NEXTAUTH_SECRET;
      const token = req.cookies.get('token');
      
      if (!token || !JWT_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      let payload: any = null;
      try { 
        payload = jwt.verify(token.value, JWT_SECRET); 
      } catch (error) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 }); 
      }
      
      if (!payload.userId) {
        return NextResponse.json({ error: 'User ID not found in token' }, { status: 401 });
      }
    } else {
      const JWT_SECRET = process.env.NEXTAUTH_SECRET;
      const token = req.cookies.get('token');
      if (token && JWT_SECRET) {
        try {
          const payload = jwt.verify(token.value, JWT_SECRET);
        } catch (error) {
        }
      }
    }

    const { imageBase64, fileName } = await req.json();
    if (!imageBase64) {
      return NextResponse.json({ error: "Missing imageBase64" }, { status: 400 });
    }
    
    const matches = imageBase64.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/);
    if (!matches) {
      return NextResponse.json({ error: "Invalid base64 image format" }, { status: 400 });
    }
    
    const ext = matches[2] || "png";
    const base64Data = matches[3];
    
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
      return NextResponse.json({ error: "Invalid base64 data" }, { status: 400 });
    }
    
    const buffer = Buffer.from(base64Data, "base64");
    
    const sizeInMB = buffer.length / 1024 / 1024;
    if (sizeInMB > 1.5) {
      return NextResponse.json({ error: 'Image too large (max 1.5MB)' }, { status: 400 });
    }
    
    if (buffer.length < 100) {
      return NextResponse.json({ error: 'Image too small' }, { status: 400 });
    }
    
    const validHeaders = {
      'png': [0x89, 0x50, 0x4E, 0x47],
      'jpeg': [0xFF, 0xD8, 0xFF],
      'jpg': [0xFF, 0xD8, 0xFF],
      'webp': [0x52, 0x49, 0x46, 0x46]
    };
    
    const header = validHeaders[ext as keyof typeof validHeaders];
    if (header && !header.every((byte, index) => buffer[index] === byte)) {
      return NextResponse.json({ error: 'Invalid image file format' }, { status: 400 });
    }

    const contentFilter = await filterBase64Image(imageBase64, 0.8);
    if (!contentFilter.isSafe) {
      console.log(`Content filter blocked upload: ${contentFilter.reason}`);
      return NextResponse.json({ 
        error: 'Content not allowed', 
        reason: 'Image contains inappropriate content' 
      }, { status: 400 });
    }
    const safeName = typeof fileName === 'string' && /^[a-zA-Z0-9._-]{1,64}$/.test(fileName) ? fileName : `script-${Date.now()}.${ext}`;
    await R2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: safeName,
      Body: buffer,
      ContentType: `image/${ext}`,
    }));
    const url = `${process.env.R2_PUBLIC_URL}/${safeName}`;
    return NextResponse.json({ url });
  } catch (err) {
    console.error('Upload thumbnail error:', err);
    return NextResponse.json({ error: "Upload failed", details: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}

import path from "node:path";
import crypto from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";

export interface UploadFileOptions {
  buffer: Buffer;
  filename: string;
  folder: string;
  mimeType: string;
}

export interface UploadResult {
  url: string;
  name: string;
  size: number;
  type: string;
  provider: "local" | "cloudinary" | "supabase";
}

/**
 * Uploads a file using external persistent storage (Cloudinary or Supabase Storage)
 * when configured, or local filesystem when running in local development.
 *
 * Prevents Vercel serverless filesystem write errors (ENOENT /var/task/public/uploads).
 */
export async function uploadFile(options: UploadFileOptions): Promise<UploadResult> {
  const { buffer, filename, folder, mimeType } = options;

  const isVercel = Boolean(process.env.VERCEL || process.env.NOW_REGION);
  const isProduction = process.env.NODE_ENV === "production" || isVercel;

  // 1. Try Cloudinary if credentials are present
  const cloudinaryCloudName =
    process.env.CLOUDINARY_CLOUD_NAME ||
    (process.env.CLOUDINARY_URL
      ? process.env.CLOUDINARY_URL.split("@")[1]?.replace(/^\/+/, "")
      : undefined);

  let cloudinaryApiKey = process.env.CLOUDINARY_API_KEY;
  let cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET;

  if (process.env.CLOUDINARY_URL && (!cloudinaryApiKey || !cloudinaryApiSecret)) {
    try {
      const parsed = new URL(process.env.CLOUDINARY_URL);
      cloudinaryApiKey = parsed.username;
      cloudinaryApiSecret = parsed.password;
    } catch {
      // ignore
    }
  }

  if (cloudinaryCloudName && cloudinaryApiKey && cloudinaryApiSecret) {
    return uploadToCloudinary({
      buffer,
      filename,
      folder,
      mimeType,
      cloudName: cloudinaryCloudName,
      apiKey: cloudinaryApiKey,
      apiSecret: cloudinaryApiSecret,
    });
  }

  // 2. Try Supabase Storage if credentials are present
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseBucket = process.env.SUPABASE_STORAGE_BUCKET || "uploads";

  if (supabaseUrl && supabaseKey) {
    return uploadToSupabase({
      buffer,
      filename,
      folder,
      mimeType,
      supabaseUrl,
      supabaseKey,
      bucket: supabaseBucket,
    });
  }

  // 3. In production or Vercel environment without external cloud storage credentials:
  // Refuse to write to serverless filesystem to prevent ENOENT crashes.
  if (isProduction || isVercel) {
    throw new Error(
      "Penyimpanan eksternal (Cloudinary atau Supabase) belum dikonfigurasi di lingkungan production. Harap atur kredensial CLOUDINARY_* atau SUPABASE_* pada environment variables Vercel."
    );
  }

  // 4. Local development fallback: Store in public/uploads/
  const originalName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  const safeFilename = `${timestamp}_${originalName}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads", folder);

  await mkdir(uploadsDir, { recursive: true });
  const filePath = path.join(uploadsDir, safeFilename);
  await writeFile(filePath, buffer);

  const relativeUrl = `/uploads/${folder}/${safeFilename}`;

  return {
    url: relativeUrl,
    name: filename,
    size: buffer.length,
    type: mimeType,
    provider: "local",
  };
}

/**
 * Upload to Cloudinary using standard REST API (no external npm dependencies required)
 */
async function uploadToCloudinary(params: {
  buffer: Buffer;
  filename: string;
  folder: string;
  mimeType: string;
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}): Promise<UploadResult> {
  const { buffer, filename, folder, mimeType, cloudName, apiKey, apiSecret } = params;

  const timestamp = Math.floor(Date.now() / 1000);
  const targetFolder = `learnix/${folder}`;
  const cleanBaseName = filename.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
  const publicId = `${cleanBaseName}_${Date.now()}`;

  // Signature: folder=learnix/submissions&public_id=xxx&timestamp=xxx<api_secret>
  const paramsToSign = `folder=${targetFolder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(paramsToSign).digest("hex");

  const formData = new FormData();
  const uint8 = new Uint8Array(buffer);
  const blob = new Blob([uint8], { type: mimeType });
  formData.append("file", blob, filename);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", targetFolder);
  formData.append("public_id", publicId);

  // Cloudinary auto resource_type handles images, raw documents (pdf, docx, etc.), and videos
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  const json = await response.json();

  if (!response.ok || !json.secure_url) {
    const errorMsg = json?.error?.message || response.statusText || "Gagal upload ke Cloudinary";
    throw new Error(`Cloudinary Error: ${errorMsg}`);
  }

  return {
    url: json.secure_url,
    name: filename,
    size: json.bytes || buffer.length,
    type: mimeType,
    provider: "cloudinary",
  };
}

/**
 * Upload to Supabase Storage using standard REST API (no external npm dependencies required)
 */
async function uploadToSupabase(params: {
  buffer: Buffer;
  filename: string;
  folder: string;
  mimeType: string;
  supabaseUrl: string;
  supabaseKey: string;
  bucket: string;
}): Promise<UploadResult> {
  const { buffer, filename, folder, mimeType, supabaseUrl, supabaseKey, bucket } = params;

  const originalName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const safePath = `${folder}/${Date.now()}_${originalName}`;
  const normalizedBase = supabaseUrl.replace(/\/+$/, "");
  const uploadEndpoint = `${normalizedBase}/storage/v1/object/${bucket}/${safePath}`;

  const response = await fetch(uploadEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${supabaseKey}`,
      apikey: supabaseKey,
      "Content-Type": mimeType,
      "x-upsert": "true",
    },
    body: new Uint8Array(buffer),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Supabase Storage Error: ${errText || response.statusText}`);
  }

  const publicUrl = `${normalizedBase}/storage/v1/object/public/${bucket}/${safePath}`;

  return {
    url: publicUrl,
    name: filename,
    size: buffer.length,
    type: mimeType,
    provider: "supabase",
  };
}

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import path from "node:path";
import { uploadFile } from "@/lib/storage";

function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export async function POST(req: Request) {
  const { session, error } = await requireRole(["guru", "admin", "siswa"]);
  if (error || !session) return error;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const entityType = (formData.get("entityType") as string) || "general";
    const entityId = (formData.get("entityId") as string) || undefined;

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { success: false, message: "File wajib diunggah" },
        { status: 400 }
      );
    }

    // Maximum 25MB
    const MAX_FILE_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: "Ukuran file melebihi batas maksimum 25MB" },
        { status: 400 }
      );
    }

    // Disallow executable and dangerous script extensions
    const dangerousExts = [".exe", ".bat", ".cmd", ".sh", ".php", ".phtml", ".vbs", ".msi", ".jar"];
    const ext = path.extname(file.name).toLowerCase();
    if (dangerousExts.includes(ext)) {
      return NextResponse.json(
        { success: false, message: "Tipe file yang diunggah tidak diizinkan demi keamanan" },
        { status: 400 }
      );
    }

    // Sanitize entity folder name
    const validFolders = ["assignments", "classes", "submissions", "materials", "avatars", "general"];
    const targetFolder = validFolders.includes(entityType) ? entityType : "general";

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";

    // Upload via persistent storage adapter (Cloudinary / Supabase or local fallback)
    const uploadResult = await uploadFile({
      buffer,
      filename: file.name,
      folder: targetFolder,
      mimeType,
    });

    const formattedSize = formatBytes(uploadResult.size || file.size);

    return NextResponse.json(
      {
        success: true,
        message: "File berhasil diunggah",
        data: {
          name: uploadResult.name || file.name,
          url: uploadResult.url,
          type: uploadResult.type || mimeType,
          size: formattedSize,
          entityType: targetFolder,
          entityId,
          provider: uploadResult.provider,
          uploadedAt: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengunggah file";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

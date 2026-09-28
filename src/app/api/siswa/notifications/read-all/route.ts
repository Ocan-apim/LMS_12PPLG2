import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { Notification } from "@/models";

export async function PATCH(req: NextRequest) {
  // Authorization: Role must be siswa
  const { session, error } = await requireRole(["siswa"]);
  if (error || !session) return error;

  try {
    await connectDB();

    // CRITICAL SECURITY ISOLATION:
    // Only update notifications belonging to the currently authenticated student (session.id)
    const result = await Notification.updateMany(
      { recipientId: session.id, read: false },
      { $set: { read: true } }
    );

    return NextResponse.json({
      success: true,
      message: "Semua notifikasi berhasil ditandai telah dibaca",
      modifiedCount: result.modifiedCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui notifikasi";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

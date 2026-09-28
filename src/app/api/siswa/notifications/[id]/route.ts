import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { Notification } from "@/models";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authorization: Role must be siswa
  const { session, error } = await requireRole(["siswa"]);
  if (error || !session) return error;

  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "ID notifikasi tidak valid" },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    const notif = await Notification.findById(id);

    if (!notif) {
      return NextResponse.json(
        { success: false, message: "Notifikasi tidak ditemukan" },
        { status: 404 }
      );
    }

    // CRITICAL SECURITY GUARD: Notification must belong to the authenticated student
    if (String(notif.recipientId) !== String(session.id)) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Notifikasi bukan milik Anda" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const newReadStatus =
      typeof body.read === "boolean" ? body.read : true;

    notif.read = newReadStatus;
    await notif.save();

    return NextResponse.json({
      success: true,
      data: notif,
      message: `Notifikasi ditandai sebagai ${newReadStatus ? "sudah dibaca" : "belum dibaca"}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui notifikasi";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

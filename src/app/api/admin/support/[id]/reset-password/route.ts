import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/session";
import { SupportTicket, SupportMessage, User, Notification } from "@/models";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  const { session, error } = await requireRole(["admin"]);
  if (error || !session) return error;

  try {
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "ID tiket tidak valid" },
        { status: 400 }
      );
    }

    await connectDB();

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Tiket bantuan tidak ditemukan" },
        { status: 404 }
      );
    }

    const student = await User.findById(ticket.userId);
    if (!student || student.role !== "siswa") {
      return NextResponse.json(
        { success: false, message: "Akun siswa tidak ditemukan" },
        { status: 404 }
      );
    }

    // Generate secure 8-character temporary password
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const tempPassword = `Learnix#${randomSuffix}`;

    // Hash securely using bcrypt
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    student.password = hashedPassword;
    await student.save();

    // Post automated resolution message in the ticket thread
    const resetMessage = `Kata sandi akun Anda telah berhasil direset oleh Admin ke kata sandi sementara:\n\n🔑 Kata Sandi Sementara: ${tempPassword}\n\nSilakan segera login menggunakan kata sandi tersebut. Demi keamanan, Anda dapat mengganti kata sandi setelah berhasil masuk.`;

    const newMsg = await SupportMessage.create({
      ticketId: ticket._id,
      senderId: session.id,
      message: resetMessage,
    });

    ticket.status = "RESOLVED";
    ticket.resolvedAt = new Date();
    ticket.lastMessageAt = new Date();
    await ticket.save();

    // Notify student
    try {
      await Notification.create({
        recipientId: student._id,
        type: "general",
        title: "Reset Password Berhasil",
        message: "Admin telah mereset kata sandi akun Anda. Buka tiket bantuan untuk melihat kata sandi sementara.",
        link: `/siswa/support/${ticket._id}`,
        relatedEntityId: ticket._id,
      });
    } catch (notifErr) {
      console.error("Gagal mengirim notifikasi reset password:", notifErr);
    }

    return NextResponse.json({
      success: true,
      message: "Kata sandi siswa berhasil direset",
      data: {
        tempPassword,
        message: {
          id: String(newMsg._id),
          message: newMsg.message,
          createdAt: newMsg.createdAt,
        },
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Gagal mereset kata sandi siswa";
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}
